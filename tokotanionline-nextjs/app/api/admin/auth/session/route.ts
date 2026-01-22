/**
 * GET /api/admin/auth/session
 * 
 * Admin session endpoint
 * Returns current session data
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { 
          success: false,
          authenticated: false 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role,
      },
      expires: session.expires,
    });
  } catch (error: any) {
    console.error('[admin/auth/session] Error:', error?.message || error);
    
    // Return unauthenticated on error
    return NextResponse.json(
      { 
        success: false,
        authenticated: false 
      },
      { status: 401 }
    );
  }
}
