/**
 * Track exit intent (user about to leave)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

// FASE 6.0: Optional analytics recalculation modules removed
// These modules (@/lib/analytics/truth-engine, @/lib/analytics/intent-segmentation) 
// do not exist in the codebase. Exit intent tracking will work without recalculation.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageUrl, pagePath, pageType, pageId, timeOnPage, scrollDepth } = body;

    // Get or create session ID
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('analytics_session_id')?.value;
    
    const response = NextResponse.json({ success: true });
    
    if (!sessionId) {
      sessionId = `analytics_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      response.cookies.set('analytics_session_id', sessionId, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // Find the most recent visit for this session and page
    const visit = await prisma.analyticsVisit.findFirst({
      where: {
        sessionId,
        pagePath,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (visit) {
      // Update visit with exit intent data
      await prisma.analyticsVisit.update({
        where: { id: visit.id },
        data: {
          exitPage: true,
          timeOnPage: timeOnPage || visit.timeOnPage,
          scrollDepth: scrollDepth || visit.scrollDepth,
        },
      });

      // FASE 6.0: Analytics recalculation removed (modules do not exist)
      // Exit intent tracking works without these optional recalculations
    }

    return response;
  } catch (error: any) {
    console.error('Error tracking exit intent:', error);
    // Return success to prevent breaking the page
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}



