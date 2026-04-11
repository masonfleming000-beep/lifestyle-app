import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const rel = String(params.path || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel || rel.includes("..")) return new Response("Not found", { status: 404 });

  const candidates = [
    path.join(process.cwd(), "uploads", rel),
    path.join(process.cwd(), "public", "uploads", rel),
  ];

  for (const filePath of candidates) {
    try {
      const data = await readFile(filePath);
      return new Response(data, { status: 200 });
    } catch {}
  }

  return new Response("Not found", { status: 404 });
};
