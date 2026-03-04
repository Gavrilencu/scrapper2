import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, signSession, getSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Utilizator și parolă obligatorii.' }, { status: 400 });
  }
  const db = getDb();
  const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username.trim()) as { id: number; username: string; password_hash: string } | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    return NextResponse.json({ error: 'Utilizator sau parolă incorectă.' }, { status: 401 });
  }
  const token = signSession({ userId: row.id, username: row.username });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSessionCookie(), token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/' });
  return res;
}
