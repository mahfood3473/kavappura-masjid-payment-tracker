import { NextRequest, NextResponse } from 'next/server';
import { getAllMembers, addMember, updateMember, deleteMember, MemberRow } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const members = await getAllMembers();
    return NextResponse.json(members);
  } catch (error: any) {
    console.error('GET /api/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: MemberRow = await req.json();
    await addMember(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: MemberRow = await req.json();
    await updateMember(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
