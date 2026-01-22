/**
 * Recommendation Actions Mapper (STEP 15B)
 * Converts recommendations into actionable items for admins
 * Read-only, no side effects, safe for SAFE MODE
 */

import { Recommendation } from '@/lib/recommendation-engine'
import { randomUUID } from 'crypto'

export type RecommendedAction = {
  id: string
  category: 'PRODUCT' | 'CTA'
  action: 'PROMOTE' | 'OPTIMIZE' | 'REVIEW'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  label: string
  suggestion: string
  reason: string
  targetId?: string
}

export function mapRecommendationToActions(
  recommendations: Recommendation[]
): RecommendedAction[] {
  return recommendations.map((rec) => {
    switch (rec.type) {
      case 'PROMOTE':
        return {
          id: randomUUID(),
          category: 'PRODUCT',
          action: 'PROMOTE',
          priority: rec.level,
          label: 'Prioritaskan Produk Ini',
          suggestion:
            'Tampilkan produk ini di homepage, banner, atau kampanye iklan.',
          reason: rec.reason,
          targetId: rec.relatedProductId,
        }

      case 'OPTIMIZE_CTA':
        return {
          id: randomUUID(),
          category: 'CTA',
          action: 'OPTIMIZE',
          priority: rec.level,
          label: 'Optimalkan CTA',
          suggestion:
            'Gunakan CTA ini sebagai CTA utama di halaman produk.',
          reason: rec.reason,
          targetId: rec.relatedCTA,
        }

      case 'REVIEW_PRODUCT':
        return {
          id: randomUUID(),
          category: 'PRODUCT',
          action: 'REVIEW',
          priority: rec.level,
          label: 'Tinjau Produk',
          suggestion:
            'Periksa ulang harga, copywriting, gambar, atau penawaran.',
          reason: rec.reason,
          targetId: rec.relatedProductId,
        }
    }
  })
}

