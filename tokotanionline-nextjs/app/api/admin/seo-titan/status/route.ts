/**
 * SEO TITAN MODE - Engine Status API
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
// SEO Titan logger removed - non-core feature

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const engineName = request.nextUrl.searchParams.get('engine');

    // SEO Titan logger removed - non-core feature
    return NextResponse.json({ 
      status: null,
      message: 'SEO Titan logger has been removed as part of core system refactoring',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { engineName, isEnabled } = body;

    if (!engineName) {
      return NextResponse.json({ error: 'engineName required' }, { status: 400 });
    }

    await prisma.seoEngineStatus.update({
      where: { engineName },
      data: { isEnabled: isEnabled ?? true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






