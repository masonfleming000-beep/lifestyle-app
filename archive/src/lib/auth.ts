import bcrypt from "bcryptjs";
import { getSql } from "./db";
import { normalizeEmail } from "./security";
import { createRawToken, hashToken } from "./tokens";

const SESSION_COOKIE_NAME = import.meta.env.SESSION_COOKIE_NAME || "session_id";
const SESSION_TTL_DAYS = Number(import.meta.env.SESSION_TTL_DAYS || "14");
const SESSION_LOOKUP_TIMEOUT_MS = Number(import.meta.env.SESSION_LOOKUP_TIMEOUT_MS || "5000");
const SESSION_CACHE_TTL_MS = Number(import.meta.env.SESSION_CACHE_TTL_MS || "15000");
const SESSION_CACHE_STALE_TTL_MS = Number(import.meta.env.SESSION_CACHE_STALE_TTL_MS || "60000");

export type SafeUser = {
  id: string;
  email: string;
  created_at: string;
};

export type DbUser = {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  verified: boolean;
  created_at: string;
};

type SessionUser = {
  id: string;
  email: string;
  created_at: string;
  session_id: string;
  expires_at?: string;
};

type SessionCacheEntry = {
  user: SessionUser | null;
  fetchedAt: number;
  staleUntil: number;
};

const sessionUserCache = new Map<string, SessionCacheEntry>();

function readCachedSession(sessionId: string, options?: { allowStale?: boolean }) {
  const entry = sessionUserCache.get(sessionId);
  if (!entry) return null;

  const now = Date.now();
  const freshUntil = entry.fetchedAt + SESSION_CACHE_TTL_MS;
  const allowStale = options?.allowStale ?? false;

  if (now <= freshUntil) {
    return entry.user;
  }

  if (allowStale && now <= entry.staleUntil) {
    return entry.user;
  }

  if (now > entry.staleUntil) {
    sessionUserCache.delete(sessionId);
  }

  return null;
}

function writeCachedSession(sessionId: string, user: SessionUser | null) {
  sessionUserCache.set(sessionId, {
    user,
    fetchedAt: Date.now(),
    staleUntil: Date.now() + SESSION_CACHE_STALE_TTL_MS,
  });
}

function clearCachedSession(sessionId: string) {
  sessionUserCache.delete(sessionId);
}

function clearSessionsForUserFromCache(userId: string) {
  for (const [sessionId, entry] of sessionUserCache.entries()) {
    if (entry.user?.id === userId) {
      sessionUserCache.delete(sessionId);
    }
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validatePassword(password: string, email = "") {
  if (typeof password !== "string") return false;
  if (password.length < 12 || password.length > 128) return false;
  if (/\s/.test(password)) return false;
  if (email && password.toLowerCase().includes(normalizeEmail(email))) return false;
  return true;
}

export function getSessionExpiryDate() {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires;
}

export async function createSession(userId: string) {
  const sql = getSql();
  const expiresAt = getSessionExpiryDate();

  const rows = await sql<
    { id: string; user_id: string; expires_at: string }[]
  >`
    insert into sessions (user_id, expires_at)
    values (${userId}, ${expiresAt.toISOString()})
    returning id, user_id, expires_at
  `;

  clearSessionsForUserFromCache(userId);
  return rows[0];
}

export async function deleteSession(sessionId: string) {
  const sql = getSql();
  await sql`
    delete from sessions
    where id = ${sessionId}
  `;
  clearCachedSession(sessionId);
}

export async function deleteSessionsForUser(userId: string) {
  const sql = getSql();
  await sql`
    delete from sessions
    where user_id = ${userId}
  `;
  clearSessionsForUserFromCache(userId);
}

export async function cleanupExpiredSessions() {
  const sql = getSql();
  await sql`
    delete from sessions
    where expires_at < now()
  `;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const sql = getSql();
  const rows = await sql<DbUser[]>`
    select id, email, password_hash, google_sub, verified, created_at
    from users
    where email = ${normalizeEmail(email)}
    limit 1
  `;

  return rows[0] ?? null;
}

export async function createUser(
  email: string,
  password: string,
  options?: { verified?: boolean }
) {
  const sql = getSql();
  const passwordHash = await hashPassword(password);
  const verified = options?.verified ?? false;

  const rows = await sql<
    { id: string; email: string; created_at: string; verified: boolean }[]
  >`
    insert into users (email, password_hash, verified)
    values (${normalizeEmail(email)}, ${passwordHash}, ${verified})
    returning id, email, created_at, verified
  `;

  return rows[0];
}

export async function createGoogleUser(
  email: string,
  googleSub: string
): Promise<DbUser> {
  const sql = getSql();
  const rows = await sql<DbUser[]>`
    insert into users (email, password_hash, google_sub, verified)
    values (${normalizeEmail(email)}, null, ${googleSub}, true)
    returning id, email, password_hash, google_sub, verified, created_at
  `;

  return rows[0];
}

export async function linkGoogleToExistingUser(
  userId: string,
  googleSub: string
): Promise<DbUser | null> {
  const sql = getSql();
  const rows = await sql<DbUser[]>`
    update users
    set google_sub = ${googleSub},
        verified = true,
        verified_at = coalesce(verified_at, now())
    where id = ${userId}
    returning id, email, password_hash, google_sub, verified, created_at
  `;

  return rows[0] ?? null;
}

export async function setEmailVerificationToken(userId: string, rawToken?: string) {
  const sql = getSql();
  const token = rawToken || createRawToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await sql`
    update users
    set verification_token_hash = ${tokenHash},
        verification_expires_at = ${expiresAt.toISOString()}
    where id = ${userId}
  `;

  return { token, expiresAt };
}

export async function verifyEmailToken(rawToken: string) {
  const sql = getSql();
  const tokenHash = hashToken(rawToken);

  const rows = await sql<{ id: string }[]>`
    update users
    set verified = true,
        verified_at = now(),
        verification_token_hash = null,
        verification_expires_at = null
    where verification_token_hash = ${tokenHash}
      and verification_expires_at > now()
    returning id
  `;

  return rows.length > 0;
}

export async function setPasswordResetToken(email: string, rawToken?: string) {
  const sql = getSql();
  const token = rawToken || createRawToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const rows = await sql<{ id: string; email: string }[]>`
    update users
    set password_reset_token_hash = ${tokenHash},
        password_reset_expires_at = ${expiresAt.toISOString()}
    where email = ${normalizeEmail(email)}
    returning id, email
  `;

  if (!rows[0]) return null;

  return { token, expiresAt, user: rows[0] };
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  const sql = getSql();
  const tokenHash = hashToken(rawToken);
  const passwordHash = await hashPassword(newPassword);

  const rows = await sql<{ id: string }[]>`
    update users
    set password_hash = ${passwordHash},
        password_reset_token_hash = null,
        password_reset_expires_at = null,
        password_changed_at = now()
    where password_reset_token_hash = ${tokenHash}
      and password_reset_expires_at > now()
    returning id
  `;

  if (!rows[0]) return false;

  await sql`
    delete from sessions
    where user_id = ${rows[0].id}
  `;

  clearSessionsForUserFromCache(rows[0].id);
  return true;
}

export async function getUserFromSessionId(sessionId: string) {
  const cached = readCachedSession(sessionId);
  if (cached !== null) {
    return cached;
  }

  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      email: string;
      created_at: string;
      session_id: string;
      expires_at: string;
    }[]
  >`
    select
      u.id,
      u.email,
      u.created_at,
      s.id as session_id,
      s.expires_at
    from sessions s
    join users u on u.id = s.user_id
    where s.id = ${sessionId}
      and s.expires_at > now()
    limit 1
  `;

  const user = rows[0] ?? null;
  writeCachedSession(sessionId, user);
  return user;
}

export async function getCurrentUser(cookies: {
  get: (name: string) => { value: string } | undefined;
}) {
  const sessionId = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  try {
    const user = await Promise.race([
      getUserFromSessionId(sessionId),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`getCurrentUser timed out after ${SESSION_LOOKUP_TIMEOUT_MS}ms`)), SESSION_LOOKUP_TIMEOUT_MS)
      ),
    ]);

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      session_id: user.session_id,
    };
  } catch (error) {
    const cachedUser = readCachedSession(sessionId, { allowStale: true });
    if (cachedUser) {
      console.warn("getCurrentUser recovered from cache after session lookup failure:", error);
      return {
        id: cachedUser.id,
        email: cachedUser.email,
        created_at: cachedUser.created_at,
        session_id: cachedUser.session_id,
      };
    }

    console.error("getCurrentUser failed:", error);
    return null;
  }
}

export function buildSessionCookieOptions(expires: Date) {
  const isProd = import.meta.env.PROD;

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export function buildExpiredCookieOptions() {
  const isProd = import.meta.env.PROD;

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  };
}
