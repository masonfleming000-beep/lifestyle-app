import type { APIRoute } from "astro";
import crypto from "node:crypto";

export const prerender = false;

function getBaseUrl() {
  return (
    import.meta.env.APP_URL ||
    import.meta.env.PUBLIC_APP_URL ||
    "https://lifestyle-app-sbjx.onrender.com"
  );
}

export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  const clientId = import.meta.env.GOOGLE_CLIENT_ID || import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response("Google OAuth is not configured.", { status: 500 });
  }

  const state = crypto.randomBytes(24).toString("hex");

  const mobile = url.searchParams.get("mobile") === "1";

  cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });

  const callbackState = JSON.stringify({
    state,
    mobile,
  });

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("prompt", "select_account");
  googleUrl.searchParams.set("state", Buffer.from(callbackState).toString("base64url"));

  return redirect(googleUrl.toString(), 302);
};