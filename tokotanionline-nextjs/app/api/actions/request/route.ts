import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { actionId, actionType, action, targetId, priority, traces } = body

  if (!actionId || !actionType || !action || !priority) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const approval = await prisma.actionApproval.create({
    data: {
      actionId,
      actionType,
      action, // PROMOTE | OPTIMIZE | REVIEW
      targetId: targetId || null,
      priority,
      status: 'PENDING',
      requestedBy: (session.user as any).email!,
      traces: traces && Array.isArray(traces) && traces.length > 0 ? {
        create: traces.map((trace: any) => ({
          insightKey: trace.insightKey || 'UNKNOWN',
          metricKey: trace.metricKey || 'UNKNOWN',
          metricValue: trace.metricValue || 0,
          explanation: trace.explanation || 'No explanation provided',
        })),
      } : undefined,
    },
    include: {
      traces: true,
    },
  })

  return NextResponse.json({ success: true, data: approval })
}

