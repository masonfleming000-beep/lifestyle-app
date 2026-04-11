import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const prerender = false;

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".ogg": "video/ogg",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".zip": "application/zip",
};

function safeRelativePath(value: string) {
  const normalized = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

  if (!normalized || normalized.includes("..")) {
    return "";
  }

  return normalized;
}

async function tryRead(absPath: string) {
  try {
    return await readFile(absPath);
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ params }) => {
  const relPath = safeRelativePath(params.path || "");
  if (!relPath) {
    return new Response("Not found", { status: 404 });
  }

  const candidates = [
    path.join(process.cwd(), "uploads", relPath),
    path.join(process.cwd(), "public", "uploads", relPath),
  ];

  for (const candidate of candidates) {
    const file = await tryRead(candidate);
    if (!file) continue;

    const ext = path.extname(candidate).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return new Response("Not found", { status: 404 });
};
