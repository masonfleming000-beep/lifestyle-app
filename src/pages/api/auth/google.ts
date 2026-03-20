import type { APIRoute } from "astro";
import { OAuth2Client } from "google-auth-library";
import { getSql } from "../../../lib/db";
import {
  buildSessionCookieOptions,
  createSession,
  getSessionCookieName,
  getSessionExpiryDate,
} from "../../../lib/auth";
import { consumeRateLimit, isAllowedSignupEmail, normalizeEmail } from "../../../lib/security";

const client = new OAuth2Client(import.meta.env.PUBLIC_GOOGLE_CLIENT_ID);

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const rateLimit = consumeRateLimit({
    bucket: "auth-google",
    request,
    max: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return json({ error: "Too many sign-in attempts. Try again later." }, 429);
  }

  const sql = getSql();

  try {
    const { credential } = await request.json().catch(() => ({}));

    if (!credential || typeof credential !== "string") {
      return json({ error: "Missing credential." }, 400);
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return json({ error: "Google account verification failed." }, 401);
    }

    const sub = payload.sub;
    const email = normalizeEmail(payload.email);

    if (!isAllowedSignupEmail(email)) {
      return json({ error: "This account is not approved for private access yet." }, 403);
    }

    let users = await sql`
      SELECT * FROM users
      WHERE google_sub = ${sub}
    `;

    if (users.length === 0) {
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

    cookies.set(getSessionCookieName(), session.id, buildSessionCookieOptions(expires));

    return json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("google auth error:", err instanceof Error ? err.message : err);
    return json({ error: "Auth failed" }, 500);
  } finally {
    await sql.end();
  }
};
