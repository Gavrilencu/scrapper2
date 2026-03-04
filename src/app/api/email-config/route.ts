import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const list = db.prepare('SELECT id, name, host, port, secure, user_name, from_address, created_at FROM email_config ORDER BY name').all();
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, host, port = 587, secure = false, user_name, password, from_address } = body;
  if (!name || !host || !user_name || !password || !from_address) {
    return NextResponse.json({ error: 'Lipsesc câmpuri obligatorii' }, { status: 400 });
  }
  const db = getDb();
  const r = db.prepare(
    'INSERT INTO email_config (name, host, port, secure, user_name, password, from_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, host, port, secure ? 1 : 0, user_name, password, from_address);
  return NextResponse.json({ id: r.lastInsertRowid });
}
