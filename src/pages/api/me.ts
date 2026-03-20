import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const user = await getCurrentUser(cookies);

    return new Response(
      JSON.stringify({
        ok: true,
        user: user
          ? {
              id: user.id,
              email: user.email,
              created_at: user.created_at,
            }
          : null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch user." }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
};
