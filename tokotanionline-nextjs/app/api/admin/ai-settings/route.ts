import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/ai-settings
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.aIContentSettings.findFirst();
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/ai-settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const settings = await prisma.aIContentSettings.upsert({
      where: { id: '1' },
      update: {
        keywords: JSON.stringify(body.keywords || []),
        articlesPerDay: body.articlesPerDay || 3,
        wordCount: body.wordCount || 1500,
        tone: body.tone || 'expert_farmer',
        cronSchedule: body.cronSchedule || '0 8,14,20 * * *',
        publishTimes: body.publishTimes ? JSON.stringify(body.publishTimes) : JSON.stringify(['08:00', '14:00', '20:00']),
        seoSyncDelay: body.seoSyncDelay || 300,
        // FASE DARURAT: Only allow enable if explicitly set to true (manual control)
        isActive: body.isActive === true ? true : false,
      },
      create: {
        id: '1',
        keywords: JSON.stringify(body.keywords || []),
        articlesPerDay: body.articlesPerDay || 3,
        wordCount: body.wordCount || 1500,
        tone: body.tone || 'expert_farmer',
        cronSchedule: body.cronSchedule || '0 8,14,20 * * *',
        publishTimes: body.publishTimes ? JSON.stringify(body.publishTimes) : JSON.stringify(['08:00', '14:00', '20:00']),
        seoSyncDelay: body.seoSyncDelay || 300,
        isActive: false, // FASE DARURAT: Default disabled (manual trigger only)
      },
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
