import type { APIRoute } from "astro";
import {
  buildSessionCookieOptions,
  createSession,
  createUser,
  getSessionCookieName,
  getSessionExpiryDate,
  getUserByEmail,
  validateEmail,
  validatePassword,
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
    bucket: "auth-signup",
    request,
    max: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return json({ error: "Too many signup attempts. Try again later." }, 429);
  }

  try {
    const body = await request.json().catch(() => null);
    const email = normalizeEmail(String(body?.email || ""));
    const password = String(body?.password || "");

    if (!email || !password) {
      return json({ error: "Email and password are required." }, 400);
    }

    if (!validateEmail(email)) {
      return json({ error: "Invalid email address." }, 400);
    }

    if (!isAllowedSignupEmail(email)) {
      return json({ error: "This account is not approved for private access yet." }, 403);
    }

    if (!validatePassword(password, email)) {
      return json(
        { error: "Password must be 12-128 characters, contain no spaces, and must not include your email." },
        400
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return json({ error: "User already exists." }, 409);
    }

    const user = await createUser(email, password);
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
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign up.";
    const status = message.includes("not approved") ? 403 : 500;
    if (status === 500) {
      console.error("signup error:", message);
    }
    return json({ error: message }, status);
  }
};
