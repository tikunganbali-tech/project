import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, decision } = body // decision: APPROVED | REJECTED

  if (!id || !['APPROVED', 'REJECTED'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const updated = await prisma.actionApproval.update({
    where: { id },
    data: {
      status: decision,
      approvedBy: (session.user as any).email!,
      approvedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

