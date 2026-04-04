import type { APIRoute } from "astro";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".rtf",
  ".txt",
  ".odt",
]);

function sanitizeBaseName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "resume"
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
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
      return new Response(JSON.stringify({ error: "File too large. Max 10 MB." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const originalName = file.name || "resume";
    const ext = path.extname(originalName).toLowerCase();

    if (!allowedExtensions.has(ext)) {
      return new Response(JSON.stringify({ error: "Unsupported file type." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseName = sanitizeBaseName(path.basename(originalName, ext));
    const unique = crypto.randomBytes(8).toString("hex");
    const storedFileName = `${baseName}-${unique}${ext}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "resumes");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, storedFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/resumes/${storedFileName}`;

    return new Response(
      JSON.stringify({
        ok: true,
        fileName: originalName,
        storedFileName,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("upload-resume error:", error);

    return new Response(JSON.stringify({ error: "Failed to upload resume." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};