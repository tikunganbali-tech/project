import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/whatsapp/admins
export async function GET() {
  try {
    const admins = await prisma.whatsAppAdmin.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ admins });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/whatsapp/admins
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, isActive } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const admin = await prisma.whatsAppAdmin.create({
      data: {
        name,
        phone,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ admin });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
