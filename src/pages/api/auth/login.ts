import type { APIRoute } from "astro";
import {
  buildSessionCookieOptions,
  createSession,
  getSessionCookieName,
  getSessionExpiryDate,
  getUserByEmail,
  verifyPassword,
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
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid credentials." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!user.password_hash) {
      return new Response(
        JSON.stringify({
          error: "This account uses Google sign-in. Please continue with Google.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid credentials." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("login error:", error);
    return new Response(JSON.stringify({ error: "Failed to log in." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};