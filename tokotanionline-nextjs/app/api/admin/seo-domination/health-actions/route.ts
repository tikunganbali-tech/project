/**
 * SEO Domination - Health Actions API
 * Get health issues and execute actions
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
// SEO engine health actions removed - non-core feature

// GET - Get health issues for engine or all engines
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const engineName = searchParams.get('engineName');

    // SEO engine health actions removed - non-core feature
    return NextResponse.json({ 
      issues: [],
      message: 'SEO engine health actions have been removed as part of core system refactoring',
    });
  } catch (error: any) {
    console.error('Error getting health issues:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Execute health action
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { engineName, actionType, actionParams } = body;

    if (!engineName || !actionType) {
      return NextResponse.json(
        { error: 'engineName and actionType are required' },
        { status: 400 }
      );
    }

    // SEO engine health actions removed - non-core feature
    return NextResponse.json({ 
      error: 'SEO engine health actions have been removed as part of core system refactoring',
    }, { status: 410 });
  } catch (error: any) {
    console.error('Error executing health action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




















