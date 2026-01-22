/**
 * UI-B4: Engine Pause/Resume API
 * 
 * Soft control - only changes flag in DB
 * - POST with { paused: true/false }
 * - Workers check this flag before processing new jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Auth guard
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paused } = body;

    if (typeof paused !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request. paused must be boolean' },
        { status: 400 }
      );
    }

    // Get or create engine control
    let engineControl = await prisma.engineControl.findFirst();
    
    if (!engineControl) {
      engineControl = await prisma.engineControl.create({
        data: {
          paused,
          pausedAt: paused ? new Date() : null,
          resumedAt: paused ? null : new Date(),
        },
      });
    } else {
      engineControl = await prisma.engineControl.update({
        where: { id: engineControl.id },
        data: {
          paused,
          pausedAt: paused ? new Date() : null,
          resumedAt: paused ? null : new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      paused: engineControl.paused,
      message: paused ? 'Engine paused' : 'Engine resumed',
    });
  } catch (error: any) {
    console.error('Error updating engine pause status:', error);
    return NextResponse.json(
      {
        error: 'Failed to update engine pause status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
