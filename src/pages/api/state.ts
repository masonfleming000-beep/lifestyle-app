import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";
import { getSql } from "../../lib/db";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeState(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

// --------------------
// GET: load saved state
// --------------------
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const pageKey = url.searchParams.get("pageKey");

    if (!pageKey || typeof pageKey !== "string") {
      return json({ ok: false, error: "pageKey is required" }, 400);
    }

    const sql = getSql();

    try {
      const rows = await sql<
        { state: unknown; updated_at: string }[]
      >`
        select state, updated_at
        from page_state
        where user_id = ${user.id}
          and page_key = ${pageKey}
        limit 1
      `;

      const saved = rows[0] ?? null;

      return json({
        ok: true,
        pageKey,
        state: saved ? normalizeState(saved.state) : null,
        updated_at: saved ? saved.updated_at : null,
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("/api/state GET error:", error);
    return json({ ok: false, error: "Failed to fetch state." }, 500);
  }
};

// --------------------
// POST: save state
// --------------------
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const body = await request.json().catch(() => null);

    const pageKey = body?.pageKey;
    const state = body?.state;

    if (!pageKey || typeof pageKey !== "string") {
      return json({ ok: false, error: "pageKey is required" }, 400);
    }

    if (state === undefined) {
      return json({ ok: false, error: "state is required" }, 400);
    }

    const sql = getSql();

    try {
      const rows = await sql<
        { state: unknown; updated_at: string }[]
      >`
        insert into page_state (user_id, page_key, state, updated_at)
        values (${user.id}, ${pageKey}, ${sql.json(state)}, now())
        on conflict (user_id, page_key)
        do update set
          state = excluded.state,
          updated_at = now()
        returning state, updated_at
      `;

      const saved = rows[0];

      return json({
        ok: true,
        pageKey,
        state: normalizeState(saved?.state ?? null),
        updated_at: saved?.updated_at ?? null,
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("/api/state POST error:", error);
    return json({ ok: false, error: "Failed to save state." }, 500);
  }
};