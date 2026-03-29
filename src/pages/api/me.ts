import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";

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

async function loadProfileSettings(request: Request, baseUrl: URL): Promise<ProfileSettingsState | null> {
  try {
    const stateUrl = new URL("/api/state", baseUrl);
    stateUrl.searchParams.set("pageKey", "profile-settings");

    const response = await fetch(stateUrl.toString(), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!response.ok) return null;

    const payload = await response.json().catch(() => null);
    return (payload?.state || null) as ProfileSettingsState | null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ cookies, request, url }) => {
  try {
    const user = (await getCurrentUser(cookies)) as BasicUser | null;

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

    const profile = await loadProfileSettings(request, url);
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

    const avatarUrl =
      typeof profile?.avatarUrl === "string" ? profile.avatarUrl : "";
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
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch user." }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
};