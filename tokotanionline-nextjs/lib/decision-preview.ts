/**
 * Decision Preview Mapper (STEP 15D)
 * Maps recommended actions to engine capabilities in preview mode
 * Read-only, no side effects, safe for SAFE MODE
 */

import { RecommendedAction } from './recommendation-actions'

export type DecisionPreview = {
  engine: string
  effects: string[]
}

export function previewDecision(
  action: RecommendedAction
): DecisionPreview | null {
  switch (action.action) {
    case 'PROMOTE':
      return {
        engine: 'Product Intelligence Engine',
        effects: [
          'Menampilkan produk di area prioritas homepage',
          'Menandai produk untuk promosi',
          'Mengumpulkan data performa selama 7 hari',
        ],
      }

    case 'OPTIMIZE':
      return {
        engine: 'Behavior & CTA Engine',
        effects: [
          'Menganalisis performa CTA',
          'Merekomendasikan perubahan posisi CTA',
          'Membandingkan efektivitas sebelum & sesudah',
        ],
      }

    case 'REVIEW':
      return {
        engine: 'Content & Catalog Engine',
        effects: [
          'Menandai produk sebagai low-engagement',
          'Menyarankan perbaikan konten',
          'Memonitor perubahan performa',
        ],
      }

    default:
      return null
  }
}

