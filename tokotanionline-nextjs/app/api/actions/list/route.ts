import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const approvals = await prisma.actionApproval.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: approvals })
}

