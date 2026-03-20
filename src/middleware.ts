import { defineMiddleware } from "astro:middleware";
import { getCurrentUser } from "./lib/auth";
import { buildSecurityHeaders, createRequestId, isTrustedOrigin } from "./lib/security";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/favicon.ico",
  "/favicon.svg",
]);

const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/images/",
  "/_astro/",
];

function isProtectedPage(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return false;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (pathname.includes(".")) return false;
  if (pathname.startsWith("/api/")) return false;
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const requestId = createRequestId();
  context.locals.requestId = requestId;

  if (!isTrustedOrigin(context.request)) {
    return new Response(JSON.stringify({ error: "Invalid request origin." }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...buildSecurityHeaders(context.request),
        "X-Request-Id": requestId,
      },
    });
  }

  const pathname = context.url.pathname;
  const user = await getCurrentUser(context.cookies);
  context.locals.currentUser = user;

  if (isProtectedPage(pathname) && !user) {
    return context.redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const response = await next();
  const headers = buildSecurityHeaders(context.request);

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  response.headers.set("X-Request-Id", requestId);
  return response;
});