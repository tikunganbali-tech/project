/**
 * STEP 18B-2: Engine Job Run API Proxy
 * POST /api/admin/engine/jobs/[id]/run - Manual run only
 * 
 * Guards:
 * - Auth required
 * - Role = super_admin
 * - SAFE_MODE must be false
 * - Idempotent (job RUNNING cannot be called again)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { SAFE_MODE } from '@/lib/admin-config';

const GO_ENGINE_API_URL = process.env.GO_ENGINE_API_URL || process.env.ENGINE_HUB_URL || 'http://localhost:8090';

// POST - Run job manually
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Guard 1: Auth required
    const session = await getServerSession();
    if (!session || (session.user as any).role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Guard 2: SAFE_MODE must be false
    if (SAFE_MODE) {
      return NextResponse.json(
        { error: 'SAFE_MODE is active. Cannot run jobs.' },
        { status: 403 }
      );
    }

    const jobId = params.id;
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Call Go Engine API
    const response = await fetch(`${GO_ENGINE_API_URL}/api/jobs/${jobId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to run job';
      
      // Handle specific error cases
      if (response.status === 404) {
        errorMessage = 'Job not found';
      } else if (response.status === 409) {
        errorMessage = 'Job is already running';
      } else if (response.status === 400) {
        errorMessage = errorText || 'Job is not ready to run';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error running engine job:', error);
    return NextResponse.json(
      { error: 'Failed to run job', details: error.message },
      { status: 500 }
    );
  }
}

