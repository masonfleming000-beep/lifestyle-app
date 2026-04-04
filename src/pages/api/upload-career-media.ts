import type { APIRoute } from "astro";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser } from "../../lib/auth";

export const prerender = false;

type UploadKind = "image" | "video" | "file";

const uploadRules: Record<UploadKind, { dir: string; maxSize: number; extensions: Set<string>; mimeTypes: Set<string> }> = {
  image: {
    dir: "images",
    maxSize: 10 * 1024 * 1024,
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]),
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]),
  },
  video: {
    dir: "videos",
    maxSize: 50 * 1024 * 1024,
    extensions: new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]),
    mimeTypes: new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-m4v"]),
  },
  file: {
    dir: "files",
    maxSize: 25 * 1024 * 1024,
    extensions: new Set([".pdf", ".doc", ".docx", ".rtf", ".txt", ".odt", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".zip", ".fig", ".sketch", ".psd", ".ai"]),
    mimeTypes: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
      "application/postscript",
    ]),
  },
};

function sanitizeBaseName(value: string, fallback = "upload") {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

function resolveKind(value: FormDataEntryValue | null): UploadKind {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "image" || normalized === "video" || normalized === "file" ? normalized : "file";
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
    const kind = resolveKind(formData.get("kind"));
    const rules = uploadRules[kind];

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

    if (file.size > rules.maxSize) {
      const limitMb = Math.round(rules.maxSize / (1024 * 1024));
      return new Response(JSON.stringify({ error: `File too large. Max ${limitMb} MB.` }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalName = file.name || `${kind}-upload`;
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = String(file.type || "application/octet-stream").toLowerCase();

    if (!rules.extensions.has(ext) || !rules.mimeTypes.has(mimeType)) {
      return new Response(JSON.stringify({ error: `Unsupported ${kind} type.` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseName = sanitizeBaseName(path.basename(originalName, ext), kind);
    const unique = crypto.randomBytes(8).toString("hex");
    const storedFileName = `${baseName}-${user.id}-${unique}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "career-media", rules.dir);
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storedFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/career-media/${rules.dir}/${storedFileName}`;

    return new Response(
      JSON.stringify({
        ok: true,
        kind,
        fileName: originalName,
        storedFileName,
        fileType: mimeType,
        fileSize: file.size,
        fileUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("upload-career-media error:", error);

    return new Response(JSON.stringify({ error: "Failed to upload media." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
