import type { APIRoute } from "astro";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser } from "../../lib/auth";

export const prerender = false;

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_BY_KIND = {
  image: {
    dir: "career-images",
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]),
    mimePrefixes: ["image/"],
    exactMimeTypes: new Set(["image/svg+xml"]),
  },
  video: {
    dir: "career-videos",
    extensions: new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv"]),
    mimePrefixes: ["video/"],
    exactMimeTypes: new Set(["application/octet-stream", "video/quicktime"]),
  },
  file: {
    dir: "career-files",
    extensions: new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".rtf", ".zip", ".csv", ".svg", ".vsdx", ".drawio", ".md"]),
    mimePrefixes: [],
    exactMimeTypes: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/rtf",
      "application/zip",
      "application/x-zip-compressed",
      "text/csv",
      "image/svg+xml",
      "application/octet-stream",
      "text/markdown",
    ]),
  },
} as const;

type UploadKind = keyof typeof ALLOWED_BY_KIND;

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

function normalizeKind(value: FormDataEntryValue | null): UploadKind {
  const next = String(value || "file").toLowerCase();
  return next === "image" || next === "video" || next === "file" ? next : "file";
}

function isAllowed(kind: UploadKind, ext: string, mimeType: string) {
  const config = ALLOWED_BY_KIND[kind];
  if (!config.extensions.has(ext)) return false;
  if (!mimeType) return true;
  if (config.exactMimeTypes.has(mimeType)) return true;
  return config.mimePrefixes.some((prefix) => mimeType.startsWith(prefix));
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
    const kind = normalizeKind(formData.get("kind"));

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

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File too large. Max 50 MB." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalName = file.name || `${kind}-asset`;
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = String(file.type || "").toLowerCase();

    if (!isAllowed(kind, ext, mimeType)) {
      return new Response(JSON.stringify({ error: `Unsupported ${kind} type.` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseName = sanitizeBaseName(path.basename(originalName, ext));
    const unique = crypto.randomBytes(8).toString("hex");
    const storedFileName = `${baseName}-${user.id}-${unique}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", ALLOWED_BY_KIND[kind].dir);
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storedFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${ALLOWED_BY_KIND[kind].dir}/${storedFileName}`;

    return new Response(JSON.stringify({
      ok: true,
      kind,
      fileName: originalName,
      storedFileName,
      fileType: mimeType || "application/octet-stream",
      fileSize: file.size,
      fileUrl,
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
