import { NextRequest, NextResponse } from 'next/server';
import { extractWithConfig } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  try {
    const { url, extraction_config } = await req.json();
    if (!url || !extraction_config) return NextResponse.json({ error: 'URL sau extraction_config lipsă' }, { status: 400 });
    const rows = await extractWithConfig(url, extraction_config);
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
