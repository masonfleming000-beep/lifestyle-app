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

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid email address." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!validatePassword(password)) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: "User already exists." }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await createUser(email, password);
    const session = await createSession(user.id);
    const expires = getSessionExpiryDate();

    cookies.set(
      getSessionCookieName(),
      session.id,
      buildSessionCookieOptions(expires)
    );

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("signup error full:", error);
    return new Response(JSON.stringify({ error: "Failed to sign up." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};