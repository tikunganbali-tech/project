import { NextResponse } from 'next/server'
import { getStagnantProducts } from '@/lib/metrics'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const productIds = await getStagnantProducts(5)
    
    // Enrich with product names
    const enrichedData = await Promise.all(
      productIds.map(async (productId) => {
        try {
          // Try CatalogProduct first (simpler model)
          let product = await prisma.catalogProduct.findUnique({
            where: { id: productId },
            select: { id: true, name: true },
          }).catch(() => null)
          
          // If not found, try Product model
          if (!product) {
            const mainProduct = await prisma.product.findUnique({
              where: { id: productId },
              select: { id: true, name: true },
            }).catch(() => null)
            if (mainProduct) {
              product = { id: mainProduct.id, name: mainProduct.name }
            }
          }
          
          return {
            id: productId,
            name: product?.name || productId,
          }
        } catch (err) {
          // Fallback if individual product lookup fails
          return {
            id: productId,
            name: productId,
          }
        }
      })
    )
    
    return NextResponse.json({ success: true, data: enrichedData })
  } catch (error) {
    console.error('[INSIGHT_STAGNANT_PRODUCTS]', error)
    return NextResponse.json(
      { success: true, data: [] },
      { status: 200 }
    )
  }
}

