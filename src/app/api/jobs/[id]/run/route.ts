import { NextRequest, NextResponse } from 'next/server';
import { runJob } from '@/lib/job-runner';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await runJob(Number((await params).id));
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
