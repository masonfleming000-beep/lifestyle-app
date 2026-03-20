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
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

function decodeState(value: string | null) {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(json) as { state: string; mobile?: boolean };
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const encodedState = url.searchParams.get("state");
  const returned = decodeState(encodedState);
  const storedState = cookies.get("google_oauth_state")?.value;

  const clientId = import.meta.env.GOOGLE_CLIENT_ID || import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = import.meta.env.GOOGLE_REDIRECT_URI;

  if (!code || !returned?.state || !storedState || returned.state !== storedState) {
    return new Response("Invalid OAuth state.", { status: 400 });
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return new Response("Google OAuth is not configured.", { status: 500 });
  }

  cookies.delete("google_oauth_state", { path: "/" });

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
    return new Response("Failed to exchange code.", { status: 500 });
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
    return new Response("Email already linked to another Google account.", { status: 409 });
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

  return redirect("/dashboard", 302);
};