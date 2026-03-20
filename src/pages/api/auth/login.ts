import type { APIRoute } from "astro";
import {
  buildSessionCookieOptions,
  createSession,
  getSessionCookieName,
  getSessionExpiryDate,
  getUserByEmail,
  verifyPassword,
} from "../../../lib/auth";
import { consumeRateLimit, isAllowedSignupEmail, normalizeEmail } from "../../../lib/security";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const rateLimit = consumeRateLimit({
    bucket: "auth-login",
    request,
    max: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return json({ error: "Too many login attempts. Try again later." }, 429);
  }

  try {
    const body = await request.json().catch(() => null);
    const email = normalizeEmail(String(body?.email || ""));
    const password = String(body?.password || "");

    if (!email || !password) {
      return json({ error: "Email and password are required." }, 400);
    }

    if (!isAllowedSignupEmail(email)) {
      return json({ error: "This account is not approved for private access yet." }, 403);
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return json({ error: "Invalid credentials." }, 401);
    }

    if (!user.password_hash) {
      return json({ error: "This account uses Google sign-in. Please continue with Google." }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return json({ error: "Invalid credentials." }, 401);
    }

    const session = await createSession(user.id);
    const expires = getSessionExpiryDate();

    cookies.set(getSessionCookieName(), session.id, buildSessionCookieOptions(expires));

    return json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("login error:", error instanceof Error ? error.message : error);
    return json({ error: "Failed to log in." }, 500);
  }
};
