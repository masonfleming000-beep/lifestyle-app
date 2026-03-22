import type { APIRoute } from "astro";
import crypto from "node:crypto";

export const prerender = false;

type OAuthState = {
  state: string;
  mobile?: boolean;
};

function encodeState(payload: OAuthState): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
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
  const clientId =
    import.meta.env.GOOGLE_CLIENT_ID ||
    import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

  const redirectUri = getGoogleRedirectUri(url);

  if (!clientId || !redirectUri) {
    return new Response("Google OAuth is not configured.", { status: 500 });
  }

  const mobile = url.searchParams.get("mobile") === "true";
  const state = crypto.randomUUID();
  const cookieDomain = getCookieDomain(url.hostname);

  console.log("google start debug", {
    redirectUri,
    clientIdExists: Boolean(clientId),
    mobile,
    state,
    hostname: url.hostname,
    cookieDomain: cookieDomain || null,
  });

  cookies.set("google_oauth_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 10,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });

  const encodedState = encodeState({ state, mobile });

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", encodedState);
  googleUrl.searchParams.set("prompt", "select_account");
  googleUrl.searchParams.set("access_type", "online");

  return redirect(googleUrl.toString(), 302);
};