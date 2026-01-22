import { NextResponse } from 'next/server'
import { getTopCTA } from '@/lib/metrics'

export async function GET() {
  try {
    const rawData = await getTopCTA(5)
    
    // Transform cta to cta_type for component compatibility
    const enrichedData = rawData.map((item) => ({
      cta_type: item.cta,
      count: item.count,
    }))
    
    return NextResponse.json({ success: true, data: enrichedData })
  } catch (error) {
    console.error('[INSIGHT_TOP_CTA]', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load CTA insight' },
      { status: 500 }
    )
  }
}

