import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env, IS_PRODUCTION } from '@/lib/env';
import { prisma } from '@/server/db/prisma';
import { UnauthorizedError } from './errors';
import type { Actor } from './authz';

const COOKIE_NAME = 'ipm_session';
const MAX_AGE_SECONDS = 8 * 60 * 60;
const secret = new TextEncoder().encode(env.APP_SECRET);

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

type SessionPayload = { userId: string; role: string };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { userId: payload.sub, role: String(payload.role ?? 'USER') };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * 每个 Route Handler / Server Action 必须调用。
 * middleware 只做粗粒度跳转，不是安全边界。
 */
export async function requireActor(): Promise<Actor> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();

  const user = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true, deletedAt: null },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      departmentId: true,
    },
  });

  if (!user) throw new UnauthorizedError();

  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    departmentId: user.departmentId,
  };
}

export async function getActorOrNull(): Promise<Actor | null> {
  try {
    return await requireActor();
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
