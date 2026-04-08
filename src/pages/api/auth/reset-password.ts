import type { APIRoute } from "astro";
import { getUserByEmail, resetPasswordWithToken, validatePassword } from "../../../lib/auth";
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
    bucket: "auth-reset-password",
    request,
    max: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return json({ error: "Too many reset attempts. Try again later." }, 429);
  }

  try {
    const body = await request.json().catch(() => null);
    const token = String(body?.token || "");
    const password = String(body?.password || "");
    const email = normalizeEmail(String(body?.email || ""));

    if (!token || !password) {
      return json({ error: "Token and password are required." }, 400);
    }

    if (!validatePassword(password, email)) {
      return json(
        { error: "Password must be 12-128 characters, contain no spaces, and must not include your email." },
        400
      );
    }

    const ok = await resetPasswordWithToken(token, password);

    if (!ok) {
      return json({ error: "Invalid or expired reset link." }, 400);
    }

    return json({ ok: true, message: "Password reset successful." });
  } catch (error) {
    console.error("reset password error:", error instanceof Error ? error.message : error);
    return json({ error: "Failed to reset password." }, 500);
  }
};