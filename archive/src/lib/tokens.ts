import crypto from "node:crypto";

export function createRawToken(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}

export function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}