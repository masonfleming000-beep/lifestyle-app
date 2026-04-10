import crypto from "node:crypto";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const APP_URL = import.meta.env.PUBLIC_APP_URL || import.meta.env.APP_URL || "";
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

const DEFAULT_NATIVE_ORIGINS = ["capacitor://localhost", "ionic://localhost"];

type OriginDecision = {
  trusted: boolean;
  reason: string;
  matchedOrigin?: string;
  candidateOrigin?: string;
  allowedOrigins: string[];
};

function splitEnvList(...values: Array<string | undefined>) {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeOriginValue(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function safeParseUrl(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getConfiguredAllowedOrigins(requestUrl: URL) {
  const allowed = new Set<string>([requestUrl.origin]);

  for (const value of splitEnvList(
    import.meta.env.APP_URL,
    import.meta.env.PUBLIC_APP_URL,
    APP_URL,
    import.meta.env.ALLOWED_ORIGINS,
    import.meta.env.NATIVE_ALLOWED_ORIGINS,
    import.meta.env.PUBLIC_NATIVE_ALLOWED_ORIGINS
  )) {
    const normalized = normalizeOriginValue(value);
    if (normalized) allowed.add(normalized);
  }

  for (const value of DEFAULT_NATIVE_ORIGINS) {
    const normalized = normalizeOriginValue(value);
    if (normalized) allowed.add(normalized);
  }

  return allowed;
}

function deriveCandidateOrigin(request: Request, requestUrl: URL) {
  const originHeader = request.headers.get("origin")?.trim() || "";
  if (originHeader) {
    const parsed = normalizeOriginValue(originHeader);
    if (parsed) {
      return { candidateOrigin: parsed, source: "origin" as const };
    }
  }

  const referer = safeParseUrl(request.headers.get("referer"));
  if (referer) {
    return {
      candidateOrigin: referer.origin,
      source: originHeader ? ("referer-after-invalid-origin" as const) : ("referer" as const),
    };
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedProto && forwardedHost) {
    const forwarded = normalizeOriginValue(`${forwardedProto}://${forwardedHost}`);
    if (forwarded) {
      return {
        candidateOrigin: forwarded,
        source: originHeader ? ("forwarded-after-invalid-origin" as const) : ("forwarded" as const),
      };
    }
  }

  const host = request.headers.get("host")?.split(",")[0]?.trim();
  if (host) {
    const proto = requestUrl.protocol || "https:";
    const hostOrigin = normalizeOriginValue(`${proto}//${host}`);
    if (hostOrigin) {
      return {
        candidateOrigin: hostOrigin,
        source: originHeader ? ("host-after-invalid-origin" as const) : ("host" as const),
      };
    }
  }

  return {
    candidateOrigin: null,
    source: originHeader ? ("origin-invalid-no-fallback" as const) : ("missing" as const),
  };
}

export function explainTrustedOriginDecision(request: Request): OriginDecision {
  const method = request.method.toUpperCase();
  const requestUrl = new URL(request.url);
  const allowedOrigins = Array.from(getConfiguredAllowedOrigins(requestUrl)).sort();

  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return {
      trusted: true,
      reason: "safe-method",
      matchedOrigin: requestUrl.origin,
      candidateOrigin: requestUrl.origin,
      allowedOrigins,
    };
  }

  const secFetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
  const { candidateOrigin, source } = deriveCandidateOrigin(request, requestUrl);

  const originHeader = request.headers.get("origin")?.trim() || "";
  const refererHeader = request.headers.get("referer")?.trim() || "";

  if (!originHeader && !refererHeader) {
    if (secFetchSite === "same-origin" || secFetchSite === "none") {
      return {
        trusted: true,
        reason: `missing-origin-allowed:${secFetchSite || "no-fetch-site"}`,
        matchedOrigin: requestUrl.origin,
        candidateOrigin: requestUrl.origin,
        allowedOrigins,
      };
    }
  }

  if (originHeader.toLowerCase() === "null") {
    if (candidateOrigin && allowedOrigins.includes(candidateOrigin)) {
      return {
        trusted: true,
        reason: `matched-fallback-after-null-origin:${source}`,
        matchedOrigin: candidateOrigin,
        candidateOrigin,
        allowedOrigins,
      };
    }

    if (secFetchSite === "same-origin" || secFetchSite === "none") {
      return {
        trusted: true,
        reason: `null-origin-allowed:${secFetchSite || "no-fetch-site"}`,
        matchedOrigin: requestUrl.origin,
        candidateOrigin: candidateOrigin || requestUrl.origin,
        allowedOrigins,
      };
    }
  }

  if (!candidateOrigin) {
    return {
      trusted: false,
      reason: `no-parseable-origin:${source}`,
      allowedOrigins,
    };
  }

  if (allowedOrigins.includes(candidateOrigin)) {
    return {
      trusted: true,
      reason: `matched:${source}`,
      matchedOrigin: candidateOrigin,
      candidateOrigin,
      allowedOrigins,
    };
  }

  return {
    trusted: false,
    reason: `origin-not-allowed:${source}`,
    candidateOrigin,
    allowedOrigins,
  };
}

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
  return explainTrustedOriginDecision(request).trusted;
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

export function isReasonableJsonSize(value: unknown, maxBytes = 50_000) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= maxBytes;
  } catch {
    return false;
  }
}
