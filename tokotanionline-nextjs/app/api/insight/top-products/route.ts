import { NextResponse } from 'next/server'
import { getTopInterestedProducts } from '@/lib/metrics'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const rawData = await getTopInterestedProducts(5)
    
    // Enrich with product names
    const enrichedData = await Promise.all(
      rawData.map(async (item) => {
        try {
          // Try CatalogProduct first (simpler model)
          let product = await prisma.catalogProduct.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true },
          }).catch(() => null)
          
          // If not found, try Product model
          if (!product) {
            const mainProduct = await prisma.product.findUnique({
              where: { id: item.productId },
              select: { id: true, name: true },
            }).catch(() => null)
            if (mainProduct) {
              product = { id: mainProduct.id, name: mainProduct.name }
            }
          }
          
          return {
            id: item.productId,
            name: product?.name || item.productId,
            score: item.score,
          }
        } catch (err) {
          // Fallback if individual product lookup fails
          return {
            id: item.productId,
            name: item.productId,
            score: item.score,
          }
        }
      })
    )
    
    return NextResponse.json({ success: true, data: enrichedData })
  } catch (error) {
    console.error('[INSIGHT_TOP_PRODUCTS]', error)
    return NextResponse.json(
      { success: true, data: [] },
      { status: 200 }
    )
  }
}

