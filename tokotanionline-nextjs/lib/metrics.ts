// lib/metrics.ts
import { prisma } from '@/lib/db'

const DAYS = 7

function dateNDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

/**
 * METRIC 1: Produk paling diminati
 */
export async function getTopInterestedProducts(limit = 5) {
  const from = dateNDaysAgo(DAYS)

  const events = await prisma.eventLog.findMany({
    where: {
      createdAt: { gte: from },
      event: { in: ['view_product', 'click_cta'] },
      // meta filter removed - Prisma JsonNull type issue
    },
  })

  const scoreMap: Record<string, number> = {}

  for (const e of events) {
    const meta = e.meta as any;
    const productId = meta?.productId
    if (!productId) continue

    if (!scoreMap[productId]) scoreMap[productId] = 0

    if (e.event === 'view_product') scoreMap[productId] += 1
    if (e.event === 'click_cta') scoreMap[productId] += 3
  }

  return Object.entries(scoreMap)
    .map(([productId, score]) => ({ productId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * METRIC 2: CTA paling efektif
 */
export async function getTopCTA(limit = 5) {
  const from = dateNDaysAgo(DAYS)

  const events = await prisma.eventLog.findMany({
    where: {
      createdAt: { gte: from },
      event: 'click_cta',
    },
  })

  const ctaMap: Record<string, number> = {}

  for (const e of events) {
    const meta = e.meta as any;
    const type = meta?.cta_type
    if (!type) continue
    ctaMap[type] = (ctaMap[type] || 0) + 1
  }

  return Object.entries(ctaMap)
    .map(([cta, count]) => ({ cta, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * METRIC 3: Produk stagnan
 */
export async function getStagnantProducts(limit = 5) {
  const from = dateNDaysAgo(DAYS)

  const views = await prisma.eventLog.findMany({
    where: {
      createdAt: { gte: from },
      event: 'view_product',
    },
  })

  const clicks = await prisma.eventLog.findMany({
    where: {
      createdAt: { gte: from },
      event: 'click_cta',
    },
  })

  const viewed = new Set(views.map(v => (v.meta as any)?.productId).filter(Boolean))
  const clicked = new Set(clicks.map(c => (c.meta as any)?.productId).filter(Boolean))

  const stagnant = Array.from(viewed).filter(id => !clicked.has(id))

  return stagnant.slice(0, limit)
}

