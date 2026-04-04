import type { APIRoute } from "astro";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser } from "../../lib/auth";

export const prerender = false;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const uploadRules = {
  image: {
    folder: "career-images",
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]),
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  },
  video: {
    folder: "career-videos",
    extensions: new Set([".mp4", ".webm", ".ogg", ".mov"]),
    mimeTypes: new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]),
  },
  file: {
    folder: "career-files",
    extensions: new Set([
      ".pdf",
      ".doc",
      ".docx",
      ".ppt",
      ".pptx",
      ".xls",
      ".xlsx",
      ".csv",
      ".txt",
      ".rtf",
      ".odt",
      ".zip",
      ".rar",
      ".7z",
      ".json",
      ".md",
    ]),
    mimeTypes: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "text/plain",
      "application/rtf",
      "application/vnd.oasis.opendocument.text",
      "application/zip",
      "application/x-zip-compressed",
      "application/vnd.rar",
      "application/x-7z-compressed",
      "application/json",
      "text/markdown",
    ]),
  },
} as const;

type UploadKind = keyof typeof uploadRules;

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

function resolveKind(rawValue: FormDataEntryValue | null): UploadKind {
  const kind = String(rawValue || "file").toLowerCase();
  return kind === "image" || kind === "video" || kind === "file" ? kind : "file";
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

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return new Response(JSON.stringify({ error: "File too large. Max 50 MB." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalName = file.name || "asset";
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = String(file.type || "").toLowerCase();

    if (!rules.extensions.has(ext)) {
      return new Response(JSON.stringify({ error: `Unsupported ${kind} file type.` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (mimeType && rules.mimeTypes.size && !rules.mimeTypes.has(mimeType)) {
      return new Response(JSON.stringify({ error: `Unsupported ${kind} MIME type.` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseName = sanitizeBaseName(path.basename(originalName, ext));
    const unique = crypto.randomBytes(8).toString("hex");
    const storedFileName = `${baseName}-${user.id}-${unique}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", rules.folder);
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storedFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${rules.folder}/${storedFileName}`;

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
