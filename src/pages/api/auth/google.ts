import type { APIRoute } from "astro";
import { OAuth2Client } from "google-auth-library";
import { getSql } from "../../../lib/db";
import {
  buildSessionCookieOptions,
  createSession,
  getSessionCookieName,
  getSessionExpiryDate,
} from "../../../lib/auth";

const client = new OAuth2Client(import.meta.env.PUBLIC_GOOGLE_CLIENT_ID);

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sql = getSql();
    const { credential } = await request.json();

    if (!credential) {
      return new Response(JSON.stringify({ error: "Missing credential." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token payload" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sub = payload.sub;
    const email = payload.email ?? null;

    let users = await sql`
      SELECT * FROM users
      WHERE google_sub = ${sub}
    `;

    if (users.length === 0 && email) {
      users = await sql`
        SELECT * FROM users
        WHERE email = ${email}
      `;
    }

    if (users.length === 0) {
      users = await sql`
        INSERT INTO users (email, google_sub)
        VALUES (${email}, ${sub})
        RETURNING *
      `;
    } else if (!users[0].google_sub) {
      users = await sql`
        UPDATE users
        SET google_sub = ${sub}
        WHERE id = ${users[0].id}
        RETURNING *
      `;
    }

    const user = users[0];

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
  } catch (err) {
    console.error("google auth error:", err);
    return new Response(JSON.stringify({ error: "Auth failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};