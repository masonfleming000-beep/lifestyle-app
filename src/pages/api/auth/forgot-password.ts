import type { APIRoute } from "astro";
import { getUserByEmail, setPasswordResetToken } from "../../../lib/auth";
import { sendPasswordResetEmail } from "../../../lib/email";
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
    bucket: "auth-forgot-password",
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

    if (user && user.password_hash) {
      const reset = await setPasswordResetToken(user.email);
      if (reset) {
        await sendPasswordResetEmail(user.email, reset.token);
      }
    }

    return json({
      ok: true,
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("forgot password error:", error instanceof Error ? error.message : error);
    return json({ error: "Failed to process request." }, 500);
  }
};