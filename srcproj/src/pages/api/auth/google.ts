import type { APIRoute } from "astro";
import { OAuth2Client } from "google-auth-library";
import {
  buildSessionCookieOptions,
  createGoogleUser,
  createSession,
  getSessionCookieName,
  getSessionExpiryDate,
  getUserByEmail,
  linkGoogleToExistingUser,
} from "../../../lib/auth";
import { consumeRateLimit } from "../../../lib/security";

export const prerender = false;

const googleClientId =
  import.meta.env.PUBLIC_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;

const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

type GoogleJwtPayload = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function verifyGoogleCredential(
  credential: string
): Promise<GoogleJwtPayload | null> {
  if (!googleClient || !googleClientId) {
    throw new Error(
      "Google sign-in is not configured. Missing GOOGLE_CLIENT_ID / PUBLIC_GOOGLE_CLIENT_ID."
    );
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: googleClientId,
  });

  return ticket.getPayload() ?? null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const rateLimit = consumeRateLimit({
    bucket: "auth-google",
    request,
    max: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return json({ error: "Too many login attempts. Try again later." }, 429);
  }

  try {
    const body = await request.json().catch(() => null);
    const credential = String(body?.credential || "").trim();

    if (!credential) {
      return json({ error: "Google credential is required." }, 400);
    }

    const payload = await verifyGoogleCredential(credential);
    const googleSub = String(payload?.sub || "").trim();
    const email = String(payload?.email || "").trim().toLowerCase();
    const emailVerified = Boolean(payload?.email_verified);

    if (!googleSub || !email) {
      return json(
        { error: "Google sign-in failed. Missing account identity." },
        401
      );
    }

    if (!emailVerified) {
      return json(
        {
          error:
            "Your Google email address must be verified before signing in.",
        },
        403
      );
    }

    let user = await getUserByEmail(email);

    if (!user) {
      user = await createGoogleUser(email, googleSub);
    } else if (!user.google_sub) {
      user = await linkGoogleToExistingUser(user.id, googleSub);
    } else if (user.google_sub !== googleSub) {
      return json(
        {
          error: "This email is already linked to a different Google account.",
        },
        409
      );
    }

    if (!user) {
      return json({ error: "Unable to complete Google sign-in." }, 500);
    }

    const session = await createSession(user.id);
    const expires = getSessionExpiryDate();

    cookies.set(
      getSessionCookieName(),
      session.id,
      buildSessionCookieOptions(expires)
    );

    return json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google sign-in failed.";
    console.error("google auth error:", message);
    return json({ error: "Failed to sign in with Google." }, 500);
  }
};