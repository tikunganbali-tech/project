import { NextRequest, NextResponse } from 'next/server';
// DISABLED: Engine module not available
// import { trackBehavior } from '@/lib/engines/user-behavior-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, pageType, pageId, eventType, value, metadata } = body;

    if (!sessionId || !pageType || !pageId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // DISABLED: Behavior tracking engine not available
    // await trackBehavior({
    //   sessionId,
    //   pageType,
    //   pageId,
    //   eventType,
    //   value,
    //   metadata,
    // });

    return NextResponse.json({ success: true, message: 'Behavior tracking disabled - engine module not available' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}












