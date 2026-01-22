/**
 * STEP 19B - ACTION SIMULATION ENGINE
 * 
 * KONSEP INTI:
 * - Simulation ≠ Execution
 * - Dry-run only
 * - Read-only DB
 * - No side effects
 * - Human decision aid
 */

import { prisma } from '@/lib/db'

export interface ActionSimulationResult {
  affectedEntities: number
  estimatedImpact: {
    metric: string
    before: number
    after: number
    delta: number
  }[]
  risks: string[]
  notes: string
}

/**
 * Simulate PROMOTE_PRODUCT action (READ-ONLY)
 * 
 * ❌ Tidak boleh:
 * - update
 * - create
 * - delete
 * - trigger engine
 */
export async function simulatePromoteProduct(
  productId: string
): Promise<ActionSimulationResult> {
  // READ-ONLY query - hanya baca data
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
    },
  })

  if (!product) {
    return {
      affectedEntities: 0,
      estimatedImpact: [],
      risks: ['Product not found'],
      notes: 'Cannot simulate: product does not exist',
    }
  }

  // READ-ONLY: Hitung metrics sebelum simulasi
  const currentPriority = product.priority ?? 0
  const currentIsFeatured = product.isFeatured
  const newPriority = Math.min(currentPriority + 1, 10)
  const newIsFeatured = true

  // READ-ONLY: Cek statistik produk (jika ada)
  const productStats = await prisma.productStats.findUnique({
    where: { productId },
  })

  const currentViews = productStats?.views ?? 0
  const currentClicks = (productStats?.clicksWa ?? 0) + 
                       (productStats?.clicksShopee ?? 0) + 
                       (productStats?.clicksTokopedia ?? 0)

  // Estimasi impact (simulasi, bukan real)
  // Asumsi: featured + priority boost = 20-30% increase in visibility
  const estimatedViewsIncrease = Math.floor(currentViews * 0.25)
  const estimatedClicksIncrease = Math.floor(currentClicks * 0.25)

  const estimatedImpact = [
    {
      metric: 'Priority Level',
      before: currentPriority,
      after: newPriority,
      delta: newPriority - currentPriority,
    },
    {
      metric: 'Featured Status',
      before: currentIsFeatured ? 1 : 0,
      after: 1,
      delta: currentIsFeatured ? 0 : 1,
    },
    {
      metric: 'Estimated Views (projected)',
      before: currentViews,
      after: currentViews + estimatedViewsIncrease,
      delta: estimatedViewsIncrease,
    },
    {
      metric: 'Estimated Clicks (projected)',
      before: currentClicks,
      after: currentClicks + estimatedClicksIncrease,
      delta: estimatedClicksIncrease,
    },
  ]

  const risks: string[] = []
  const notes: string[] = []

  // Risk analysis (read-only checks)
  if (currentIsFeatured) {
    risks.push('Product is already featured - promotion may have minimal impact')
  }

  if (currentPriority >= 10) {
    risks.push('Priority is already at maximum (10) - no priority boost will occur')
  }

  if (!product.isActive) {
    risks.push('Product is inactive - promotion may not be effective')
  }

  if (product.stock === 0) {
    risks.push('Product is out of stock - promotion may lead to customer frustration')
  }

  // Notes
  notes.push(`Product: ${product.name}`)
  notes.push(`Category: ${product.category?.name ?? 'Unknown'}`)
  notes.push(`Current stock: ${product.stock}`)
  notes.push(`Current status: ${product.isActive ? 'Active' : 'Inactive'}`)
  notes.push('This is a simulation - no changes will be made to the database')

  return {
    affectedEntities: 1, // Only this product
    estimatedImpact,
    risks,
    notes: notes.join('\n'),
  }
}

/**
 * Simulate OPTIMIZE action (READ-ONLY)
 * Placeholder for future implementation
 */
export async function simulateOptimize(
  targetId: string
): Promise<ActionSimulationResult> {
  // TODO: Implement when OPTIMIZE action is defined
  return {
    affectedEntities: 0,
    estimatedImpact: [],
    risks: ['OPTIMIZE simulation not yet implemented'],
    notes: 'Simulation for OPTIMIZE action is not available yet',
  }
}

/**
 * Simulate REVIEW action (READ-ONLY)
 * Placeholder for future implementation
 */
export async function simulateReview(
  targetId: string
): Promise<ActionSimulationResult> {
  // TODO: Implement when REVIEW action is defined
  return {
    affectedEntities: 0,
    estimatedImpact: [],
    risks: ['REVIEW simulation not yet implemented'],
    notes: 'Simulation for REVIEW action is not available yet',
  }
}

/**
 * Main simulation router
 * Routes to appropriate simulator based on action type
 */
export async function simulateAction(
  actionType: string,
  action: string,
  targetId: string | null
): Promise<ActionSimulationResult> {
  if (!targetId) {
    return {
      affectedEntities: 0,
      estimatedImpact: [],
      risks: ['Target ID is required for simulation'],
      notes: 'Cannot simulate: target ID is missing',
    }
  }

  // Route to appropriate simulator
  if (action === 'PROMOTE' && actionType === 'PRODUCT') {
    return simulatePromoteProduct(targetId)
  } else if (action === 'OPTIMIZE') {
    return simulateOptimize(targetId)
  } else if (action === 'REVIEW') {
    return simulateReview(targetId)
  }

  return {
    affectedEntities: 0,
    estimatedImpact: [],
    risks: [`Unknown action type: ${action} for category: ${actionType}`],
    notes: 'Simulation not available for this action type',
  }
}

