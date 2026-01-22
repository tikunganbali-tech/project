/**
 * Recommendation Actions API (STEP 15B)
 * Read-only endpoint that returns actionable recommendations for admins
 * No writes, no Prisma, safe for SAFE MODE
 */

import { NextResponse } from 'next/server'
import { generateRecommendations } from '@/lib/recommendation-engine'
import { mapRecommendationToActions } from '@/lib/recommendation-actions'

export async function GET() {
  try {
    const recommendations = await generateRecommendations()
    const actions = mapRecommendationToActions(recommendations)

    return NextResponse.json({
      success: true,
      data: actions,
    })
  } catch (error) {
    console.error('[RECOMMENDATION_ACTION_API]', error)
    return NextResponse.json(
      { success: false, message: 'Failed to generate actions' },
      { status: 500 }
    )
  }
}

