import type { APIRoute } from "astro";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser } from "../../lib/auth";

export const prerender = false;

const CONFIG = {
  image: {
    folder: "images",
    maxSize: 10 * 1024 * 1024,
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]),
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]),
  },
  video: {
    folder: "videos",
    maxSize: 80 * 1024 * 1024,
    extensions: new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v", ".avi"]),
    mimeTypes: new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/x-m4v"]),
  },
  file: {
    folder: "files",
    maxSize: 25 * 1024 * 1024,
    extensions: new Set([
      ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".txt", ".rtf", ".odt", ".ods", ".odp", ".zip", ".fig", ".sketch", ".drawio", ".vsdx", ".json", ".md", ".ai", ".psd", ".xd", ".epub", ".pages", ".key",
    ]),
    mimeTypes: new Set([
      "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "text/plain", "application/rtf", "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet", "application/vnd.oasis.opendocument.presentation", "application/zip", "application/json", "text/markdown", "application/illustrator", "image/vnd.adobe.photoshop", "application/octet-stream",
    ]),
  },
} as const;

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
    const kindValue = String(formData.get("kind") || "file").toLowerCase();
    const kind = kindValue === "image" || kindValue === "video" ? kindValue : "file";
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
      return new Response(JSON.stringify({ error: `File too large. Max ${Math.round(config.maxSize / 1024 / 1024)} MB.` }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalName = file.name || `${kind}-asset`;
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = String(file.type || "application/octet-stream").toLowerCase();

    if (!config.extensions.has(ext) && !(kind === "file" && mimeType === "application/octet-stream")) {
      return new Response(JSON.stringify({ error: "Unsupported file type." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (kind !== "file" && !config.mimeTypes.has(mimeType)) {
      return new Response(JSON.stringify({ error: `Unsupported ${kind} type.` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseName = sanitizeBaseName(path.basename(originalName, ext));
    const unique = crypto.randomBytes(8).toString("hex");
    const storedFileName = `${baseName}-${user.id}-${unique}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "career-assets", config.folder);
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, storedFileName);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return new Response(JSON.stringify({
      ok: true,
      kind,
      fileName: originalName,
      storedFileName,
      fileType: mimeType,
      fileSize: file.size,
      fileUrl: `/uploads/career-assets/${config.folder}/${storedFileName}`,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("upload-career-asset error:", error);
    return new Response(JSON.stringify({ error: "Failed to upload asset." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
