/**
 * STEP 16B - ENGINE EXECUTION API
 * 
 * POST /api/actions/execute
 * 
 * 🔒 SECURITY:
 * - POST only
 * - super_admin only
 * - SAFE MODE respected
 * - Tidak bisa dipanggil sembarangan
 */

import { NextResponse } from 'next/server'
import { executeApprovedAction } from '@/lib/engine-executor'
import { getServerSession } from '@/lib/auth'

export async function POST(req: Request) {
  // 🔒 GUARD 1: AUTHENTICATION CHECK
  const session = await getServerSession()

  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized: Not authenticated' },
      { status: 401 }
    )
  }

  // 🔒 GUARD 2: ROLE CHECK (super_admin only)
  if ((session.user as any).role !== 'super_admin') {
    return NextResponse.json(
      { success: false, message: 'Forbidden: Only super_admin can execute actions' },
      { status: 403 }
    )
  }

  // 📥 PARSE REQUEST
  const { actionId } = await req.json()

  if (!actionId) {
    return NextResponse.json(
      { success: false, message: 'actionId required' },
      { status: 400 }
    )
  }

  // 🚀 EXECUTE ACTION (with all guards inside)
  try {
    const executorId =
      (session.user as any).id ??
      (session.user as any).email ??
      'unknown_executor'

    const result = await executeApprovedAction(actionId, executorId)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('❌ [EXECUTE API] Error:', err.message)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 400 }
    )
  }
}

