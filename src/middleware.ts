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
  "/api/career/portfolio-public",
  "/portfolio/",
  "/images/",
  "/_astro/",
];

const PREVIEW_DOMAIN_ALLOWED_PATHS = new Set([
  "/favicon.ico",
  "/favicon.svg",
  "/robots.txt",
]);

const PREVIEW_DOMAIN_ALLOWED_PREFIXES = [
  "/portfolio/",
  "/api/career/portfolio-public",
  "/api/upload-avatar",
  "/api/upload-resume",
  "/api/upload-career-asset",
  "/images/",
  "/uploads/",
  "/_astro/",
];

function isProtectedPage(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return false;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (pathname.includes(".")) return false;
  if (pathname.startsWith("/api/")) return false;
  return true;
}

function tempPublicPortfolioOnlyEnabled() {
  return import.meta.env.TEMP_PUBLIC_PORTFOLIO_ONLY === "true";
}

function tempPublicPortfolioHostname() {
  const rawUrl = String(import.meta.env.TEMP_PUBLIC_PORTFOLIO_URL || "").trim();
  if (!rawUrl) return "";

  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isTempPublicPortfolioHost(request: Request) {
  if (!tempPublicPortfolioOnlyEnabled()) return false;

  const configuredHostname = tempPublicPortfolioHostname();
  if (!configuredHostname) return false;

  const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  return requestHost.split(":")[0]?.toLowerCase() === configuredHostname;
}

function isAllowedPreviewDomainPath(pathname: string) {
  if (PREVIEW_DOMAIN_ALLOWED_PATHS.has(pathname)) return true;
  if (PREVIEW_DOMAIN_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

function previewDomainMessagePage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HubLife Preview</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f8fb;
        --card: #ffffff;
        --text: #102033;
        --muted: #5d6b7c;
        --border: #d9e2ec;
        --accent: #2563eb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
      }
      main {
        width: min(680px, 100%);
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
      }
      .eyebrow {
        display: inline-block;
        margin-bottom: 12px;
        color: var(--accent);
        font-size: 0.9rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 4vw, 2.8rem);
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: var(--muted);
        font-size: 1.05rem;
        line-height: 1.7;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Preview only</div>
      <h1>Application is still in development.</h1>
      <p>
        The app used to build this portfolio is currently in development by Mason Fleming.
        This preview domain is only available for public portfolio share links right now.
        Come back later when the full app is deployed to try it out.
      </p>
    </main>
  </body>
</html>`;
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

  if (isTempPublicPortfolioHost(context.request) && !isAllowedPreviewDomainPath(pathname)) {
    return new Response(previewDomainMessagePage(), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...buildSecurityHeaders(context.request),
        "X-Request-Id": requestId,
      },
    });
  }

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
