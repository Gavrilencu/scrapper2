import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'scrapper-dev-secret';
const SESSION_COOKIE = 'scrapper_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verify = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

export function signSession(payload: { userId: number; username: string }): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const data = JSON.stringify({ ...payload, exp });
  const sig = createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url');
}

export function verifySession(token: string): { userId: number; username: string } | null {
  try {
    const { data, sig } = JSON.parse(Buffer.from(token, 'base64url').toString());
    const expected = createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
    const parsed = JSON.parse(data);
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: parsed.userId, username: parsed.username };
  } catch {
    return null;
  }
}

export function getSessionCookie(): string {
  return SESSION_COOKIE;
}

export function getSessionFromRequest(cookieHeader: string | null): { userId: number; username: string } | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  return verifySession(token);
}
