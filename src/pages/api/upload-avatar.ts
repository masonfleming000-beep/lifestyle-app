import type { APIRoute } from "astro";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser } from "../../lib/auth";

export const prerender = false;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeBaseName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "avatar"
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
      return new Response(JSON.stringify({ error: "File too large. Max 5 MB." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalName = file.name || "avatar";
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = String(file.type || "").toLowerCase();

    if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(mimeType)) {
      return new Response(JSON.stringify({ error: "Unsupported image type." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseName = sanitizeBaseName(path.basename(originalName, ext));
    const unique = crypto.randomBytes(8).toString("hex");
    const storedFileName = `${baseName}-${user.id}-${unique}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storedFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/avatars/${storedFileName}`;

    return new Response(
      JSON.stringify({
        ok: true,
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
    console.error("upload-avatar error:", error);

    return new Response(JSON.stringify({ error: "Failed to upload avatar." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};