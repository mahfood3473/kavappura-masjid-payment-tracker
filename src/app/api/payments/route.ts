import { NextRequest, NextResponse } from 'next/server';
import { getAllPayments, addPayment, deletePayment, PaymentRow } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payments = await getAllPayments();
    return NextResponse.json(payments);
  } catch (error: any) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support bulk payments
    if (Array.isArray(body)) {
      for (const payment of body as PaymentRow[]) {
        await addPayment(payment);
      }
      return NextResponse.json({ success: true, count: body.length });
    }

    await addPayment(body as PaymentRow);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deletePayment(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
