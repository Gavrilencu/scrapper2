import { NextRequest, NextResponse } from 'next/server';
import { analyzePage } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL lipsă' }, { status: 400 });
    const tables = await analyzePage(url);
    return NextResponse.json({ tables });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
