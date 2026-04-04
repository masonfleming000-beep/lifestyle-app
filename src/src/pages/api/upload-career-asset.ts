import type { APIRoute } from "astro";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser } from "../../lib/auth";

export const prerender = false;

const CONFIG = {
  image: {
    dir: "career-images",
    maxSize: 10 * 1024 * 1024,
    error: "Unsupported image type.",
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp", ".avif"]),
    mimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/bmp",
      "image/avif",
    ]),
  },
  video: {
    dir: "career-videos",
    maxSize: 50 * 1024 * 1024,
    error: "Unsupported video type.",
    extensions: new Set([".mp4", ".webm", ".ogg", ".ogv", ".mov", ".m4v"]),
    mimeTypes: new Set([
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-m4v",
    ]),
  },
  file: {
    dir: "career-files",
    maxSize: 25 * 1024 * 1024,
    error: "Unsupported file type.",
    extensions: new Set([
      ".pdf",
      ".doc",
      ".docx",
      ".rtf",
      ".txt",
      ".odt",
      ".csv",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".zip",
      ".json",
      ".md",
    ]),
    mimeTypes: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
      "application/vnd.oasis.opendocument.text",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
      "application/x-zip-compressed",
      "application/json",
      "text/markdown",
      "text/x-markdown",
    ]),
  },
} as const;

type AssetKind = keyof typeof CONFIG;

function sanitizeBaseName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "asset"
  );
}

function resolveKind(value: FormDataEntryValue | null): AssetKind {
  const next = String(value || "file").trim().toLowerCase();
  if (next === "image" || next === "video") return next;
  return "file";
}

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
    const kind = resolveKind(formData.get("kind"));
    const file = formData.get("file");
    const config = CONFIG[kind];

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file received." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (file.size <= 0) {
      return new Response(JSON.stringify({ error: "Empty file." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (file.size > config.maxSize) {
      return new Response(JSON.stringify({ error: `File too large. Max ${Math.round(config.maxSize / (1024 * 1024))} MB.` }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalName = file.name || `${kind}-asset`;
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = String(file.type || "").toLowerCase();

    if (!config.extensions.has(ext) || (mimeType && !config.mimeTypes.has(mimeType))) {
      return new Response(JSON.stringify({ error: config.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseName = sanitizeBaseName(path.basename(originalName, ext));
    const unique = crypto.randomBytes(8).toString("hex");
    const storedFileName = `${baseName}-${user.id}-${unique}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", config.dir);
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storedFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${config.dir}/${storedFileName}`;

    return new Response(
      JSON.stringify({
        ok: true,
        kind,
        fileName: originalName,
        storedFileName,
        fileType: mimeType || "application/octet-stream",
        fileSize: file.size,
        fileUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("upload-career-asset error:", error);
    return new Response(JSON.stringify({ error: "Failed to upload asset." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
