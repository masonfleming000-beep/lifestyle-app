import crypto from "node:crypto";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const APP_URL = import.meta.env.PUBLIC_APP_URL || import.meta.env.APP_URL || "";
//const HOST = import.meta.env.HOST || "";
const PUBLIC_FRAME_ANCESTORS = String(import.meta.env.PUBLIC_FRAME_ANCESTORS || "");
const INVITE_ONLY = String(import.meta.env.INVITE_ONLY || "true").toLowerCase() === "true";
const ALLOWED_SIGNUP_EMAILS = new Set(
  String(import.meta.env.ALLOWED_SIGNUP_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

const RESERVED_PAGE_KEYS = new Set([
  "fitness-history",
  "profile-stats",
  "profile-settings",
  "hobbies",
  "cardio",
  "weightlifting",
  "workouts",
]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isInviteOnlyMode() {
  return INVITE_ONLY;
}

export function isAllowedSignupEmail(email: string) {
  if (!INVITE_ONLY) return true;
  return ALLOWED_SIGNUP_EMAILS.has(normalizeEmail(email));
}

export function assertAllowedSignupEmail(email: string) {
  if (isAllowedSignupEmail(email)) return;
  throw new Error("This account is not approved for private access yet.");
}

export function createRequestId() {
  return crypto.randomUUID();
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return forwardedFor.split(",")[0]?.trim() || realIp || "unknown";
}

export function isTrustedOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set<string>();

  allowedOrigins.add(requestUrl.origin);

  if (APP_URL) {
    try {
      allowedOrigins.add(new URL(APP_URL).origin);
    } catch {}
  }

  /*if (HOST) {
    const hostValue =
      HOST.startsWith("http://") || HOST.startsWith("https://") ? HOST : `https://${HOST}`;
    try {
      allowedOrigins.add(new URL(hostValue).origin);
    } catch {}
  }*/

  const extraOrigins = String(import.meta.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  for (const value of extraOrigins) {
    try {
      allowedOrigins.add(new URL(value).origin);
    } catch {}
  }

  try {
    const origin = new URL(originHeader).origin;
    return allowedOrigins.has(origin);
  } catch {
    return false;
  }
}

export function consumeRateLimit(options: {
  bucket: string;
  request: Request;
  max: number;
  windowMs: number;
}) {
  const ip = getClientIp(options.request);
  const key = `${options.bucket}:${ip}`;
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + options.windowMs };
    rateLimitStore.set(key, next);
    return {
      allowed: true,
      remaining: Math.max(options.max - next.count, 0),
      resetAt: next.resetAt,
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    allowed: existing.count <= options.max,
    remaining: Math.max(options.max - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export function buildSecurityHeaders(request: Request) {
  const url = new URL(request.url);
  const frameAncestors = PUBLIC_FRAME_ANCESTORS
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const connectSrc = new Set<string>(["'self'"]);
  connectSrc.add(url.origin);
  connectSrc.add("https://accounts.google.com");
  connectSrc.add("https://*.googleapis.com");
  connectSrc.add("https://*.gstatic.com");
  connectSrc.add("https://cdn.inchcalculator.com");
  connectSrc.add("https://www.inchcalculator.com");

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https:",
    "https://cdn.inchcalculator.com",
    "https://www.inchcalculator.com",
  ];

  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://cdn.inchcalculator.com",
    "https://www.inchcalculator.com",
  ];

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://accounts.google.com",
    "https://*.gstatic.com",
    "https://cdn.inchcalculator.com",
    "https://www.inchcalculator.com",
  ];

  const fontSrc = ["'self'", "https://fonts.gstatic.com", "data:"];

  const frameSrc = [
    "'self'",
    "blob:",
    "data:",
    "https://accounts.google.com",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://calendar.google.com",
    "https://www.google.com",
    "https://www.strava.com",
    "https://www.inchcalculator.com",
    "https://cdn.inchcalculator.com",
  ];

  const csp = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'self' blob: data:`,
    `frame-ancestors ${frameAncestors.length ? frameAncestors.join(' ') : "'none'"}`,
    `form-action 'self' https://accounts.google.com`,
    `img-src ${imgSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `script-src ${scriptSrc.join(" ")}`,
    `font-src ${fontSrc.join(" ")}`,
    `connect-src ${Array.from(connectSrc).join(" ")}`,
    `frame-src ${frameSrc.join(" ")}`,
    `worker-src 'self' blob:`,
    `media-src 'self' blob: data: https:`,
    `upgrade-insecure-requests`,
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  } as const;
}

export function isSafePageKey(value: unknown) {
  if (typeof value !== "string") return false;
  if (!/^[a-z0-9:_-]{1,64}$/i.test(value)) return false;
  return true;
}

export function isKnownAppPageKey(value: unknown) {
  return typeof value === "string" && RESERVED_PAGE_KEYS.has(value);
}

export function isReasonableJsonSize(value: unknown, maxBytes = 500_000) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= maxBytes;
  } catch {
    return false;
  }
}