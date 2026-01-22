import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// DISABLED: Visitor cache module not available
// import { getSessionId, trackProductView } from '@/lib/visitor-cache';
import { cookies } from 'next/headers';

// POST /api/tracking/pageview
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, productId } = body;

    const cookieStore = await cookies();
    let sessionId = cookieStore.get('session_id')?.value;
    
    const response = NextResponse.json({ success: true });
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      response.cookies.set('session_id', sessionId, {
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: 'lax',
      });
    }

    // Track page view (non-blocking - don't fail if DB is unavailable)
    try {
      await prisma.trackingEvent.create({
        data: {
          eventType: 'PageView',
          metadata: JSON.stringify({ path, sessionId }),
        },
      });

      // Track product view if applicable
      if (productId) {
        await prisma.trackingEvent.create({
          data: {
            eventType: 'ViewContent',
            productId,
            metadata: JSON.stringify({ sessionId }),
          },
        });
      }
    } catch (dbError: any) {
      // Log but don't fail the request - tracking is non-critical
      console.error('Tracking error (non-critical):', dbError.message);
    }

    return response;
  } catch (error: any) {
    console.error('Pageview tracking error:', error);
    // Return success even on error to prevent breaking the page
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}

