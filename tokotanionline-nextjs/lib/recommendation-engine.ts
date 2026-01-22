/**
 * Recommendation Engine (STEP 15A)
 * Read-only engine that translates raw insights into human-readable recommendations
 * No Prisma, no writes, safe for SAFE MODE
 */

import {
  getTopInterestedProducts,
  getTopCTA,
  getStagnantProducts,
} from '@/lib/metrics'

export type Recommendation = {
  type: 'PROMOTE' | 'OPTIMIZE_CTA' | 'REVIEW_PRODUCT'
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  title: string
  description: string
  reason: string
  relatedProductId?: string
  relatedCTA?: string
}

export async function generateRecommendations(): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = []

  const topProducts = await getTopInterestedProducts(3)
  const topCta = await getTopCTA(1)
  const stagnantProducts = await getStagnantProducts(3)

  // 🔥 High Interest Products → Promote
  for (const product of topProducts) {
    recommendations.push({
      type: 'PROMOTE',
      level: 'HIGH',
      title: 'Produk dengan Minat Tinggi',
      description: `Produk ini menunjukkan minat tinggi dari pengunjung.`,
      reason: `Skor interaksi tinggi dalam 7 hari terakhir.`,
      relatedProductId: product.productId,
    })
  }

  // 🎯 Best CTA → Optimize
  if (topCta[0]) {
    recommendations.push({
      type: 'OPTIMIZE_CTA',
      level: 'MEDIUM',
      title: 'CTA Paling Efektif',
      description: `CTA "${topCta[0].cta}" menghasilkan klik terbanyak.`,
      reason: `Performa CTA tertinggi dibanding CTA lain.`,
      relatedCTA: topCta[0].cta,
    })
  }

  // 💤 Stagnant Products → Review
  for (const productId of stagnantProducts) {
    recommendations.push({
      type: 'REVIEW_PRODUCT',
      level: 'LOW',
      title: 'Produk Kurang Diminati',
      description: `Produk ini dilihat namun jarang diklik.`,
      reason: `Tidak ada interaksi CTA meski ada view.`,
      relatedProductId: productId,
    })
  }

  return recommendations
}

