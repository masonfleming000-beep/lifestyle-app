import type { APIRoute } from "astro";
import {
  buildSessionCookieOptions,
  createGoogleUser,
  createSession,
  getSessionCookieName,
  getSessionExpiryDate,
  getUserByEmail,
  linkGoogleToExistingUser,
} from "../../../../lib/auth";

export const prerender = false;

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

type DecodedState = {
  state: string;
  mobile?: boolean;
};

function decodeState(value: string | null): DecodedState | null {
  if (!value) return null;

  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(json) as DecodedState;
  } catch {
    return null;
  }
}

function getGoogleRedirectUri(url: URL): string {
  const explicitRedirect = import.meta.env.GOOGLE_REDIRECT_URI;

  if (explicitRedirect) {
    return String(explicitRedirect).trim();
  }

  return `${url.origin}/api/auth/google/callback`;
}

function getCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return undefined;
  }

  if (hostname === "www.hublifeapp.com" || hostname === "hublifeapp.com") {
    return ".hublifeapp.com";
  }

  return undefined;
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const encodedState = url.searchParams.get("state");
  const returned = decodeState(encodedState);
  const storedState = cookies.get("google_oauth_state")?.value;

  console.log("google callback debug", {
    hostname: url.hostname,
    codeExists: Boolean(code),
    encodedState: encodedState || null,
    returnedState: returned?.state || null,
    storedState: storedState || null,
  });

  const clientId =
    import.meta.env.GOOGLE_CLIENT_ID ||
    import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getGoogleRedirectUri(url);

  if (!clientId || !clientSecret || !redirectUri) {
    return new Response(
      "Google OAuth is not configured. Missing client ID, client secret, or redirect URI.",
      { status: 500 }
    );
  }

  if (!code) {
    return new Response("Missing Google authorization code.", { status: 400 });
  }

  if (!returned?.state) {
    return new Response("Missing or invalid OAuth state payload.", { status: 400 });
  }

  if (!storedState) {
    return new Response("Missing OAuth state cookie.", { status: 400 });
  }

  if (returned.state !== storedState) {
    return new Response("OAuth state mismatch.", { status: 400 });
  }

  const cookieDomain = getCookieDomain(url.hostname);

  cookies.delete("google_oauth_state", {
    path: "/",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    let details = "";

    try {
      const errorData = (await tokenRes.json()) as GoogleTokenResponse;
      if (errorData.error || errorData.error_description) {
        details = `${errorData.error || ""} ${errorData.error_description || ""}`.trim();
      }
    } catch {
      // ignore parse failure
    }

    return new Response(
      `Failed to exchange Google authorization code.${details ? ` ${details}` : ""}`,
      { status: 500 }
    );
  }

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return new Response("Missing access token.", { status: 500 });
  }

  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userRes.ok) {
    return new Response("Failed to fetch Google profile.", { status: 500 });
  }

  const payload = (await userRes.json()) as GoogleUserInfo;

  const googleSub = String(payload.sub || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const emailVerified = Boolean(payload.email_verified);

  if (!googleSub || !email) {
    return new Response("Missing account identity.", { status: 401 });
  }

  if (!emailVerified) {
    return new Response("Google email is not verified.", { status: 403 });
  }

  let user = await getUserByEmail(email);

  if (!user) {
    user = await createGoogleUser(email, googleSub);
  } else if (!user.google_sub) {
    user = await linkGoogleToExistingUser(user.id, googleSub);
  } else if (user.google_sub !== googleSub) {
    return new Response("Email already linked to another Google account.", {
      status: 409,
    });
  }

  if (!user) {
    return new Response("Unable to complete Google sign-in.", { status: 500 });
  }

  const session = await createSession(user.id);
  const expires = getSessionExpiryDate();

  cookies.set(
    getSessionCookieName(),
    session.id,
    buildSessionCookieOptions(expires)
  );

  if (returned.mobile) {
    return redirect("com.lifestyle.app://auth/success", 302);
  }

  return redirect("/home", 302);
};