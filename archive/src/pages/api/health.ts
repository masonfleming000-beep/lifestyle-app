// src/pages/api/health.ts
export function GET() {
  return new Response("ok", { status: 200 });
}