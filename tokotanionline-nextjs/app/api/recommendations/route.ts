import { NextResponse } from 'next/server'
import { generateRecommendations } from '@/lib/recommendation-engine'

export async function GET() {
  try {
    const data = await generateRecommendations()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[RECOMMENDATION_API_ERROR]', error)
    return NextResponse.json(
      { success: false, message: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

