import type { APIRoute } from "astro";
import { verifyEmailToken } from "../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get("token") || "";

  if (!token) {
    return redirect("/login?verified=missing", 302);
  }

  try {
    const ok = await verifyEmailToken(token);

    if (!ok) {
      return redirect("/login?verified=invalid", 302);
    }

    return redirect("/login?verified=success", 302);
  } catch (error) {
    console.error("verify email error:", error instanceof Error ? error.message : error);
    return redirect("/login?verified=error", 302);
  }
};