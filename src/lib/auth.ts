import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { getSql } from "./db";

const SESSION_COOKIE_NAME =
  import.meta.env.SESSION_COOKIE_NAME || "session_id";

const SESSION_TTL_DAYS = Number(import.meta.env.SESSION_TTL_DAYS || "30");

export type SafeUser = {
  id: string;
  email: string;
  created_at: string;
};

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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

export function getSessionExpiryDate() {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires;
}

export async function createSession(userId: string) {
  const sql = getSql();
  try {
    const expiresAt = getSessionExpiryDate();

    const rows = await sql<
      { id: string; user_id: string; expires_at: string }[]
    >`
      insert into sessions (user_id, expires_at)
      values (${userId}, ${expiresAt.toISOString()})
      returning id, user_id, expires_at
    `;

    return rows[0];
  } finally {
    await sql.end();
  }
}

export async function deleteSession(sessionId: string) {
  const sql = getSql();
  try {
    await sql`
      delete from sessions
      where id = ${sessionId}
    `;
  } finally {
    await sql.end();
  }
}

export async function cleanupExpiredSessions() {
  const sql = getSql();
  try {
    await sql`
      delete from sessions
      where expires_at < now()
    `;
  } finally {
    await sql.end();
  }
}

export async function getUserByEmail(email: string) {
  const sql = getSql();
  try {
    const rows = await sql<
      {
        id: string;
        email: string;
        password_hash: string;
        created_at: string;
      }[]
    >`
      select id, email, password_hash, created_at
      from users
      where email = ${email.toLowerCase()}
      limit 1
    `;

    return rows[0] ?? null;
  } finally {
    await sql.end();
  }
}

export async function createUser(email: string, password: string) {
  const sql = getSql();
  try {
    const passwordHash = await hashPassword(password);

    const rows = await sql<
      { id: string; email: string; created_at: string }[]
    >`
      insert into users (email, password_hash)
      values (${email.toLowerCase()}, ${passwordHash})
      returning id, email, created_at
    `;

    return rows[0];
  } finally {
    await sql.end();
  }
}

export async function getUserFromSessionId(sessionId: string) {
  const sql = getSql();
  try {
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

    return rows[0] ?? null;
  } finally {
    await sql.end();
  }
}

export async function getCurrentUser(cookies: {
  get: (name: string) => { value: string } | undefined;
}) {
  const sessionId = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const user = await getUserFromSessionId(sessionId);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    session_id: user.session_id,
  };
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

export function generateRequestId() {
  return crypto.randomUUID();
}