import { NextResponse } from 'next/server';
import { reloadScheduler } from '@/lib/scheduler';

export async function POST() {
  reloadScheduler();
  return NextResponse.json({ ok: true });
}
