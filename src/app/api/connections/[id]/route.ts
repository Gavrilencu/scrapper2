import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { testOracleConnection } from '@/lib/oracle';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, type, host, port, service_name, user_name, password } = body;
  const db = getDb();
  if (password) {
    db.prepare(
      'UPDATE connections SET name=?, type=?, host=?, port=?, service_name=?, user_name=?, password=? WHERE id=?'
    ).run(name, type, host, port, service_name, user_name, password, id);
  } else {
    db.prepare(
      'UPDATE connections SET name=?, type=?, host=?, port=?, service_name=?, user_name=? WHERE id=?'
    ).run(name, type, host, port, service_name, user_name, id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM connections WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json().catch(() => ({}));
  if (action !== 'test') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  const db = getDb();
  const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(Number(id)) as { host: string; port: number; service_name: string; user_name: string; password: string };
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const result = await testOracleConnection(row.host, row.port, row.service_name, row.user_name, row.password);
  return NextResponse.json({ success: result.ok, error: result.error });
}
