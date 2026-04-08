import type { APIRoute } from "astro";
import { getUserByEmail, setEmailVerificationToken } from "../../../lib/auth";
import { sendVerificationEmail } from "../../../lib/email";
import { consumeRateLimit, normalizeEmail } from "../../../lib/security";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const rateLimit = consumeRateLimit({
    bucket: "auth-resend-verification",
    request,
    max: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return json({ error: "Too many requests. Try again later." }, 429);
  }

  try {
    const body = await request.json().catch(() => null);
    const email = normalizeEmail(String(body?.email || ""));

    if (!email) {
      return json({ error: "Email is required." }, 400);
    }

    const user = await getUserByEmail(email);

    if (!user || user.verified) {
      return json({ ok: true, message: "If the account exists and is unverified, a new email has been sent." });
    }

    const verification = await setEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, verification.token);

    return json({ ok: true, message: "Verification email sent." });
  } catch (error) {
    console.error("resend verification error:", error instanceof Error ? error.message : error);
    return json({ error: "Failed to resend verification email." }, 500);
  }
};