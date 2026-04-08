import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/auth";
import { storeUploadedFile } from "../../lib/uploadAssets";

export const prerender = false;

const assetRules = {
  image: {
    maxFileSize: 10 * 1024 * 1024,
    allowedExtensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]),
    allowedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]),
    defaultBaseName: "career-image",
    targetDir: "uploads/career-assets/images",
    userScoped: true,
    errorLabel: "image",
  },
  video: {
    maxFileSize: 50 * 1024 * 1024,
    allowedExtensions: new Set([".mp4", ".mov", ".webm", ".m4v", ".ogg"]),
    allowedMimeTypes: new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/ogg"]),
    defaultBaseName: "career-video",
    targetDir: "uploads/career-assets/videos",
    userScoped: true,
    errorLabel: "video",
  },
  file: {
    maxFileSize: 25 * 1024 * 1024,
    allowedExtensions: new Set([
      ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".txt", ".rtf", ".zip", ".fig", ".vsdx", ".drawio", ".odt", ".ods", ".odp", ".json", ".md", ".sketch", ".ai", ".psd", ".xd", ".epub", ".pages", ".key", ".7z", ".rar",
    ]),
    defaultBaseName: "career-file",
    targetDir: "uploads/career-assets/files",
    userScoped: true,
    errorLabel: "file",
  },
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
    const kind = String(formData.get("kind") || "file").trim().toLowerCase();
    const rule = assetRules[kind as keyof typeof assetRules] || assetRules.file;
    const payload = await storeUploadedFile(file as File, rule, String(user.id || "user"));

    return new Response(JSON.stringify({ ...payload, kind }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("upload-career-asset error:", error);

    const message = error instanceof Error ? error.message : "Failed to upload career asset.";
    const status = message === "Unauthorized." ? 401 : message.startsWith("Unsupported") || message.startsWith("No file") || message.startsWith("Empty") ? 400 : message.startsWith("File too large") ? 413 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
