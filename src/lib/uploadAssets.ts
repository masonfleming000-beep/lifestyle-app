import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface UploadRule {
  maxFileSize: number;
  allowedExtensions: Set<string>;
  allowedMimeTypes?: Set<string>;
  defaultBaseName: string;
  targetDir: string;
  userScoped?: boolean;
  errorLabel: string;
}

export function sanitizeUploadBaseName(value: string, fallback = "file") {
  return (
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

export function buildPublicFileUrl(targetDir: string, storedFileName: string) {
  return `/${targetDir.replace(/^\/+/g, "").replace(/\/+$/g, "")}/${storedFileName}`;
}

export async function storeUploadedFile(file: File, rule: UploadRule, userId?: string) {
  if (!(file instanceof File)) throw new Error("No file received.");
  if (file.size <= 0) throw new Error("Empty file.");

  if (file.size > rule.maxFileSize) {
    const maxMb = Math.round((rule.maxFileSize / (1024 * 1024)) * 10) / 10;
    throw new Error(`File too large. Max ${maxMb} MB.`);
  }

  const originalName = file.name || rule.defaultBaseName;
  const ext = path.extname(originalName).toLowerCase();
  const mimeType = String(file.type || "").toLowerCase();

  if (!rule.allowedExtensions.has(ext)) throw new Error(`Unsupported ${rule.errorLabel} type.`);
  if (rule.allowedMimeTypes && mimeType && !rule.allowedMimeTypes.has(mimeType)) {
    throw new Error(`Unsupported ${rule.errorLabel} type.`);
  }

  const baseName = sanitizeUploadBaseName(path.basename(originalName, ext), rule.defaultBaseName);
  const unique = crypto.randomBytes(8).toString("hex");
  const userPart = rule.userScoped && userId ? `-${sanitizeUploadBaseName(userId, "user")}` : "";
  const storedFileName = `${baseName}${userPart}-${unique}${ext}`;

  const normalizedTargetDir = rule.targetDir.replace(/^\/+/g, "").replace(/\\/g, "/");

  const runtimeDir = path.join(process.cwd(), normalizedTargetDir);
  const publicDir = path.join(process.cwd(), "public", normalizedTargetDir);

  await mkdir(runtimeDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(runtimeDir, storedFileName), buffer);
  await writeFile(path.join(publicDir, storedFileName), buffer);

  return {
    ok: true,
    fileName: originalName,
    storedFileName,
    fileType: mimeType || "application/octet-stream",
    fileSize: file.size,
    fileUrl: buildPublicFileUrl(rule.targetDir, storedFileName),
  };
}
