import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";
import { getSql } from "../../lib/db";
import { isReasonableJsonSize, isSafePageKey } from "../../lib/security";

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

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const pageKey = url.searchParams.get("pageKey");

    if (!isSafePageKey(pageKey)) {
      return json({ ok: false, error: "Valid pageKey is required" }, 400);
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
        order by updated_at desc
        limit 1
      `;

      const saved = rows[0] ?? null;
      const normalized = saved ? normalizeState(saved.state) : null;

      return json({
        ok: true,
        pageKey,
        state: normalized,
        updated_at: saved ? saved.updated_at : null,
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("GET /api/state failed:", error);
    return json({ ok: false, error: "Failed to fetch state." }, 500);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const body = await request.json().catch(() => null);
    const pageKey = body?.pageKey;
    const state = body?.state;

    if (!isSafePageKey(pageKey)) {
      return json({ ok: false, error: "Valid pageKey is required" }, 400);
    }

    if (state === undefined) {
      return json({ ok: false, error: "state is required" }, 400);
    }

    if (!isReasonableJsonSize(state)) {
      return json({ ok: false, error: "state payload is too large" }, 413);
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

      const saved = rows[0] ?? null;
      const normalized = saved ? normalizeState(saved.state) : null;

      return json({
        ok: true,
        pageKey,
        state: normalized,
        updated_at: saved?.updated_at ?? null,
      });
    } finally {
      await sql.end();
    }
  } catch (error) {
    console.error("POST /api/state failed:", error);
    return json({ ok: false, error: "Failed to save state." }, 500);
  }
};