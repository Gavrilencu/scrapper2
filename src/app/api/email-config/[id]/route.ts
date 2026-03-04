import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM email_config WHERE id = ?').get(Number((await params).id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, host, port, secure, user_name, password, from_address } = body;
  const db = getDb();
  if (password) {
    db.prepare(
      'UPDATE email_config SET name=?, host=?, port=?, secure=?, user_name=?, password=?, from_address=? WHERE id=?'
    ).run(name, host, port, secure ? 1 : 0, user_name, password, from_address, id);
  } else {
    db.prepare(
      'UPDATE email_config SET name=?, host=?, port=?, secure=?, user_name=?, from_address=? WHERE id=?'
    ).run(name, host, port, secure ? 1 : 0, user_name, from_address, id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  db.prepare('DELETE FROM email_config WHERE id = ?').run((await params).id);
  return NextResponse.json({ ok: true });
}
