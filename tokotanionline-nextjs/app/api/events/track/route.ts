/**
 * STEP 14B — EVENT TRACKING API
 * POST /api/events/track
 * 
 * Endpoint resmi untuk EventLog dengan kontrak data yang konsisten
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { event, url, meta } = body

    if (!event) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    // Validasi event type
    if (event !== 'view_product' && event !== 'click_cta') {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Extract userAgent dan IP dari headers
    const userAgent = req.headers.get('user-agent') || ''
    const ip = 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    // Store userAgent dan IP di meta untuk konsistensi dengan schema
    const enrichedMeta = {
      ...(meta || {}),
      userAgent,
      ip,
    }

    await prisma.eventLog.create({
      data: {
        event,
        url: url || '',
        meta: enrichedMeta,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    // Silent fail untuk tidak mengganggu UX
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
