import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const list = db.prepare('SELECT id, name, type, host, port, service_name, user_name, created_at FROM connections ORDER BY name').all();
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type = 'oracle', host, port = 1521, service_name, user_name, password } = body;
    if (!name || !host || !user_name || !password || !service_name) {
      return NextResponse.json({ error: 'Lipsesc câmpuri: name, host, service_name, user_name, password' }, { status: 400 });
    }
    const db = getDb();
    const r = db.prepare(
      'INSERT INTO connections (name, type, host, port, service_name, user_name, password) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, type, host, port || 1521, service_name, user_name, password);
    return NextResponse.json({ id: r.lastInsertRowid });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
