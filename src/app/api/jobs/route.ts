import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const list = db.prepare(`
    SELECT j.*, c.name as connection_name
    FROM jobs j
    LEFT JOIN connections c ON j.connection_id = c.id
    ORDER BY j.name
  `).all();
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    connection_id,
    email_config_id,
    url,
    cron_expression,
    extraction_config,
    insert_script,
    before_insert_script,
    use_before_insert = true,
    email_on_success = true,
    email_on_error = true,
    success_recipients,
    error_recipients,
    active = true,
  } = body;
  if (!name || !connection_id || !url || !cron_expression) {
    return NextResponse.json({ error: 'Lipsesc: name, connection_id, url, cron_expression' }, { status: 400 });
  }
  const db = getDb();
  const r = db.prepare(`
    INSERT INTO jobs (name, connection_id, email_config_id, url, cron_expression, extraction_config, insert_script, before_insert_script, use_before_insert, email_on_success, email_on_error, success_recipients, error_recipients, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    connection_id,
    email_config_id ?? null,
    url,
    cron_expression,
    extraction_config ? JSON.stringify(extraction_config) : null,
    insert_script ?? null,
    before_insert_script ?? null,
    use_before_insert ? 1 : 0,
    email_on_success ? 1 : 0,
    email_on_error ? 1 : 0,
    success_recipients ?? null,
    error_recipients ?? null,
    active ? 1 : 0
  );
  return NextResponse.json({ id: r.lastInsertRowid });
}
