/**
 * FASE 5 — Admin Internal Link Rules API
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: List all rules
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await prisma.internalLinkRule.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('[ADMIN-INTERNAL-LINKS-API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update rules
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any)?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rules } = body;

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: 'rules must be an array' }, { status: 400 });
    }

    // Update each rule
    for (const rule of rules) {
      await prisma.internalLinkRule.update({
        where: { id: rule.id },
        data: {
          maxLinks: rule.maxLinks,
          enabled: rule.enabled,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN-INTERNAL-LINKS-API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
