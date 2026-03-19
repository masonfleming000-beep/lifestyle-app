import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";
import { getSql } from "../../lib/db";

export const prerender = false;

// --------------------
// GET: load saved state
// --------------------
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const pageKey = url.searchParams.get("pageKey") ?? "today";

    const sql = getSql();

    try {
      const rows = await sql<
        { state: unknown; updated_at: string }[]
      >`
        select state, updated_at
        from page_state
        where user_id = ${user.id} and page_key = ${pageKey}
        limit 1
      `;

      const saved = rows[0];

      return new Response(
        JSON.stringify({
          ok: true,
          pageKey,
          state: saved?.state ?? {},
          updated_at: saved?.updated_at ?? null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("/api/state GET error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "Failed to fetch state." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// --------------------
// POST: save state (autosave)
// --------------------
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json().catch(() => null);

    const pageKey = body?.pageKey;
    const state = body?.state ?? {};

    if (!pageKey || typeof pageKey !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "pageKey is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sql = getSql();

    try {
      const rows = await sql<
        { state: unknown; updated_at: string }[]
      >`
        insert into page_state (user_id, page_key, state, updated_at)
        values (${user.id}, ${pageKey}, ${JSON.stringify(state)}::jsonb, now())
        on conflict (user_id, page_key)
        do update set
          state = excluded.state,
          updated_at = now()
        returning state, updated_at
      `;

      const saved = rows[0];

      return new Response(
        JSON.stringify({
          ok: true,
          pageKey,
          state: saved.state,
          updated_at: saved.updated_at,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("/api/state POST error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "Failed to save state." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};