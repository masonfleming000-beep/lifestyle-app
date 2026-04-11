import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";
import { getSql } from "../../lib/db";

export const prerender = false;

type BasicUser = {
  id: string;
  email: string;
  created_at: string;
  session_id?: string;
};

type ProfileSettingsState = {
  username?: string;
  displayName?: string;
  handle?: string;
  avatarUrl?: string;
  avatarFileDataUrl?: string;
};

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

async function loadProfileSettings(userId: string): Promise<ProfileSettingsState | null> {
  try {
    const sql = getSql();
    const rows = await sql<{ state: unknown }[]>`
      select state
      from page_state
      where user_id = ${userId}
        and page_key = 'profile-settings'
      order by updated_at desc
      limit 1
    `;

    return (normalizeState(rows[0]?.state) || null) as ProfileSettingsState | null;
  } catch (error) {
    console.error("Failed to load profile settings for /api/me:", error);
    return null;
  }
}

export const GET: APIRoute = async ({ cookies, locals }) => {
  try {
    const localUser = (locals.currentUser || null) as BasicUser | null;
    const user = localUser ?? ((await getCurrentUser(cookies)) as BasicUser | null);

    if (!user) {
      return new Response(
        JSON.stringify({
          ok: true,
          user: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        }
      );
    }

    const profile = await loadProfileSettings(user.id);
    const fallbackUsername = user.email.split("@")[0];

    const username =
      typeof profile?.username === "string" && profile.username.trim()
        ? profile.username.trim()
        : fallbackUsername;

    const displayName =
      typeof profile?.displayName === "string" && profile.displayName.trim()
        ? profile.displayName.trim()
        : username;

    const handle =
      typeof profile?.handle === "string" && profile.handle.trim()
        ? profile.handle.trim()
        : `@${username}`;

    const avatarUrl = typeof profile?.avatarUrl === "string" ? profile.avatarUrl : "";
    const avatarFileDataUrl =
      typeof profile?.avatarFileDataUrl === "string" ? profile.avatarFileDataUrl : "";

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          username,
          displayName,
          handle,
          avatarUrl,
          avatarFileDataUrl,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("GET /api/me failed:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch user." }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
};
