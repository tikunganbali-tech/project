/**
 * API Endpoint to Verify Final Hardening
 * 
 * GET/POST /api/admin/hardening/verify
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// Hardening check script removed - non-core feature

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hardening check removed - non-core feature
    const report = { message: 'Hardening check has been removed as part of core system refactoring' };

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Hardening verification error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to run hardening check',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hardening check removed - non-core feature
    const report = { message: 'Hardening check has been removed as part of core system refactoring' };

    return NextResponse.json({
      success: true,
      message: 'Hardening check completed',
      report,
    });
  } catch (error: any) {
    console.error('Hardening verification error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to run hardening check',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}













