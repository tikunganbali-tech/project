/**
 * FASE R — API CONTRACT LOCK
 * GET /api/auth/session
 * 
 * Purpose: Provide session data for client-side components
 * - Returns current session user data
 * - 204 No Content if no session
 * - JSON response if session exists
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({
      user: session.user,
      expires: session.expires,
    });
  } catch (error: any) {
    // Silent fail: return 204 if error (no session)
    console.error('[auth/session] Error:', error?.message || error);
    return new NextResponse(null, { status: 204 });
  }
}
