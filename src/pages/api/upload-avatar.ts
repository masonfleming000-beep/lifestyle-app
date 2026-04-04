import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";
import { storeUploadedFile } from "../../lib/uploadAssets";

export const prerender = false;

const avatarRule = {
  maxFileSize: 5 * 1024 * 1024,
  allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]),
  allowedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  defaultBaseName: "avatar",
  targetDir: "uploads/avatars",
  userScoped: true,
  errorLabel: "image",
} as const;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const payload = await storeUploadedFile(file as File, avatarRule, String(user.id || "user"));

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("upload-avatar error:", error);

    const message = error instanceof Error ? error.message : "Failed to upload avatar.";
    const status = message === "Unauthorized." ? 401 : message.startsWith("Unsupported") || message.startsWith("No file") || message.startsWith("Empty") ? 400 : message.startsWith("File too large") ? 413 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
