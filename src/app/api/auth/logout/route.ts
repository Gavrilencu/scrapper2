import { NextResponse } from 'next/server';
import { getSessionCookie } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSessionCookie(), '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
