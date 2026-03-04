import { NextRequest, NextResponse } from 'next/server';
import { testOracleConnection } from '@/lib/oracle';

/** Testează o conexiune Oracle fără a o salva (pentru formular nou/editare). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port = 1521, service_name, user_name, password } = body;
    if (!host || !service_name || !user_name || !password) {
      return NextResponse.json(
        { success: false, error: 'Lipsesc: host, service_name, user_name, password' },
        { status: 400 }
      );
    }
    const result = await testOracleConnection(
      host,
      Number(port) || 1521,
      service_name,
      user_name,
      password
    );
    if (result.ok) return NextResponse.json({ success: true });
    return NextResponse.json({ success: false, error: result.error });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
