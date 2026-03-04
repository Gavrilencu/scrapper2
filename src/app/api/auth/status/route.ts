import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const needsSetup = count === 0;
  const session = getSessionFromRequest(req.headers.get('cookie'));
  return NextResponse.json({ needsSetup, user: session });
}
