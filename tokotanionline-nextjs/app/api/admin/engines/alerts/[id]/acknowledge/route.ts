/**
 * API: Acknowledge alert
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { acknowledgeAlert } from '@/lib/engine-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await acknowledgeAlert(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






