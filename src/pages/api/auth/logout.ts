import type { APIRoute } from "astro";
import {
  buildExpiredCookieOptions,
  deleteSession,
  getSessionCookieName,
} from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const sessionId = cookies.get(getSessionCookieName())?.value;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    cookies.set(getSessionCookieName(), "", buildExpiredCookieOptions());

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("logout error", error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: "Failed to log out." }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
};
