import type { APIRoute } from "astro";
import { OAuth2Client } from "google-auth-library";
import { getSql } from "../../../lib/db";

const client = new OAuth2Client(import.meta.env.PUBLIC_GOOGLE_CLIENT_ID);

export const POST: APIRoute = async ({ request }) => {
  try {
    const sql = getSql();
    const { credential } = await request.json();

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token payload" }), {
        status: 401,
      });
    }

    const sub = payload.sub;
    const email = payload.email ?? null;
    const name = payload.name ?? null;

    let user = await sql`
      SELECT * FROM users
      WHERE google_sub = ${sub}
    `;

    if (user.length === 0) {
      user = await sql`
        INSERT INTO users (email, name, google_sub)
        VALUES (${email}, ${name}, ${sub})
        RETURNING *
      `;
    }

    return new Response(JSON.stringify({ user: user[0] }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Auth failed" }), { status: 500 });
  }
};