/**
 * Debug endpoint to check authentication status
 * Helps diagnose why middleware/guard might not be working
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  // Get all cookies
  const cookies: Record<string, string> = {};
  request.cookies.getAll().forEach(cookie => {
    cookies[cookie.name] = cookie.value;
  });

  return NextResponse.json({
    hasSession: !!(session && session.user),
    session: session ? {
      user: session.user ? {
        email: (session.user as any).email,
        name: (session.user as any).name,
        role: (session.user as any).role,
      } : null,
    } : null,
    cookies: {
      'authjs.session-token': cookies['authjs.session-token'] ? 'EXISTS' : 'MISSING',
      '__Secure-authjs.session-token': cookies['__Secure-authjs.session-token'] ? 'EXISTS' : 'MISSING',
      allCookies: Object.keys(cookies),
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      ADMIN_DEV_MODE: process.env.ADMIN_DEV_MODE,
    },
  });
}
