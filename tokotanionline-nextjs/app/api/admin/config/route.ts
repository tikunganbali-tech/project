/**
 * GET /api/admin/config
 * Returns admin configuration (SAFE_MODE, etc.)
 * For client-side checks
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { SAFE_MODE } from '@/lib/admin-config';

export async function GET() {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    safeMode: SAFE_MODE,
    userRole: (session.user as any).role,
    isSuperAdmin: (session.user as any).role === 'super_admin',
  });
}

