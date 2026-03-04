import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(Number((await params).id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const existing = db.prepare('SELECT use_before_insert FROM jobs WHERE id = ?').get(id) as { use_before_insert: number } | undefined;
  const extraction_config = body.extraction_config != null ? JSON.stringify(body.extraction_config) : undefined;
  const use_before_insert = body.use_before_insert !== undefined ? (body.use_before_insert ? 1 : 0) : (existing?.use_before_insert ?? 1);
  const set = [
    body.name, body.connection_id, body.email_config_id ?? null, body.url, body.cron_expression,
    extraction_config ?? body.extraction_config, body.insert_script ?? null, body.before_insert_script ?? null,
    use_before_insert,
    body.email_on_success !== undefined ? (body.email_on_success ? 1 : 0) : undefined,
    body.email_on_error !== undefined ? (body.email_on_error ? 1 : 0) : undefined,
    body.success_recipients ?? null, body.error_recipients ?? null,
    body.active !== undefined ? (body.active ? 1 : 0) : undefined,
  ];
  db.prepare(`
    UPDATE jobs SET
      name=?, connection_id=?, email_config_id=?, url=?, cron_expression=?,
      extraction_config=?, insert_script=?, before_insert_script=?, use_before_insert=?,
      email_on_success=?, email_on_error=?, success_recipients=?, error_recipients=?, active=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(...set, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  db.prepare('DELETE FROM job_runs WHERE job_id = ?').run((await params).id);
  db.prepare('DELETE FROM jobs WHERE id = ?').run((await params).id);
  return NextResponse.json({ ok: true });
}
