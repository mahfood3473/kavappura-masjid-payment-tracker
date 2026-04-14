import { NextResponse } from 'next/server';
import { initializeSheetHeaders } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await initializeSheetHeaders();
    return NextResponse.json({ success: true, message: 'Sheet headers initialized' });
  } catch (error: any) {
    console.error('POST /api/init error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
