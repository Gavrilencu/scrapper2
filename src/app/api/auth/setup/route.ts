import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, signSession, getSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (count > 0) {
    return NextResponse.json({ error: 'Aplicația este deja configurată.' }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Utilizator și parolă sunt obligatorii.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Parola trebuie să aibă minim 6 caractere.' }, { status: 400 });
  }
  const password_hash = hashPassword(password);
  try {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username.trim(), password_hash);
  } catch (e) {
    return NextResponse.json({ error: 'Utilizatorul există deja.' }, { status: 400 });
  }
  const row = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username.trim()) as { id: number; username: string };
  const token = signSession({ userId: row.id, username: row.username });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSessionCookie(), token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/' });
  return res;
}
