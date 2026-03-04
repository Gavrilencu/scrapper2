import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  const db = getDb();
  const list = jobId
    ? db.prepare('SELECT * FROM job_runs WHERE job_id = ? ORDER BY started_at DESC LIMIT 100').all(jobId)
    : db.prepare('SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 200').all();
  return NextResponse.json(list);
}
