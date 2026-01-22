/**
 * POST /api/admin/auth/logout
 * 
 * Admin logout endpoint
 * 
 * Note: Actual logout is handled by NextAuth via /api/auth/signout
 * This endpoint is provided for API consistency.
 * Clients should use signOut() from 'next-auth/react' for proper session clearing.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Logout is handled by NextAuth's signOut endpoint
    // This endpoint returns success for API consistency
    // Actual session clearing happens via NextAuth's /api/auth/signout
    
    return NextResponse.json({
      success: true,
      message: 'Logout berhasil. Gunakan signOut() dari next-auth/react untuk clear session.',
    });
  } catch (error: any) {
    console.error('[admin/auth/logout] Error:', error?.message || error);
    
    // Even on error, return success
    return NextResponse.json({
      success: true,
      message: 'Logout berhasil',
    });
  }
}
