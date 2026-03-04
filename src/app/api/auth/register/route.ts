import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req.headers.get('cookie'));
  if (!session) return NextResponse.json({ error: 'Neautentificat.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { username, password } = body;
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Utilizator și parolă obligatorii.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Parola trebuie să aibă minim 6 caractere.' }, { status: 400 });
  }
  const db = getDb();
  const password_hash = hashPassword(password);
  try {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username.trim(), password_hash);
  } catch {
    return NextResponse.json({ error: 'Utilizatorul există deja.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
