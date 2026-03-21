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
import { consumeRateLimit, normalizeEmail } from "../../../lib/security";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function normalizeUsername(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidUsername(username: string) {
  return /^[a-z0-9._-]{3,24}$/.test(username);
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
    const username = normalizeUsername(body?.username);
    const password = String(body?.password || "");

    if (!email || !username || !password) {
      return json({ error: "Email, username, and password are required." }, 400);
    }

    if (!validateEmail(email)) {
      return json({ error: "Invalid email address." }, 400);
    }

    if (!isValidUsername(username)) {
      return json(
        { error: "Username must be 3-24 characters and use only letters, numbers, periods, underscores, or hyphens." },
        400
      );
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

    const user = await createUser(email, password, { verified: true });
    const session = await createSession(user.id);
    const expires = getSessionExpiryDate();

    cookies.set(getSessionCookieName(), session.id, buildSessionCookieOptions(expires));

    return json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          username,
          displayName: username,
          handle: `@${username}`,
          created_at: user.created_at,
        },
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign up.";
    console.error("signup error:", message);
    return json({ error: message }, 500);
  }
};