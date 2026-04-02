import type { APIRoute } from "astro";
import { getSql } from "../../../lib/db";

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

function normalizeUsername(value: string) {
  return String(value || "").trim().toLowerCase();
}

export const GET: APIRoute = async ({ url }) => {
  const username = normalizeUsername(url.searchParams.get("username") || "");

  if (!username) {
    return json({ ok: false, error: "username is required" }, 400);
  }

  const sql = getSql();

  try {
    const profileRows = await sql<{ id: string; email: string; state: unknown }[]>`
      select u.id, u.email, ps.state
      from users u
      left join page_state ps
        on ps.user_id = u.id
       and ps.page_key = 'profile-settings'
    `;

    const match = profileRows.find((row) => {
      const state = normalizeState(row.state) as Record<string, any> | null;
      const stateUsername = normalizeUsername(state?.username || "");
      const fallbackUsername = normalizeUsername(String(row.email || "").split("@")[0]);
      return username === stateUsername || username === fallbackUsername;
    });

    if (!match) {
      return json({ ok: false, error: "Portfolio not found" }, 404);
    }

    const careerRows = await sql<{ state: unknown }[]>`
      select state
      from page_state
      where user_id = ${match.id}
        and page_key = 'career-information'
      limit 1
    `;

    const profileState = normalizeState(match.state) as Record<string, any> | null;

    return json({
      ok: true,
      user: {
        username: profileState?.username || String(match.email || "").split("@")[0],
        displayName: profileState?.displayName || profileState?.username || String(match.email || "").split("@")[0],
        handle: profileState?.handle || "",
        avatarUrl: profileState?.avatarUrl || "",
        avatarFileDataUrl: profileState?.avatarFileDataUrl || "",
      },
      state: normalizeState(careerRows[0]?.state) || null,
    });
  } catch (error) {
    console.error("GET /api/career/portfolio-public failed:", error);
    return json({ ok: false, error: "Failed to load public portfolio." }, 500);
  } finally {
    await sql.end();
  }
};
