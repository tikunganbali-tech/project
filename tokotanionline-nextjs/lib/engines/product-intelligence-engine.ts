import { prisma } from '@/lib/db'

interface ExecuteProductPromotionParams {
  productId: string
  executedBy: string
}

export async function executeProductPromotion(
  params: ExecuteProductPromotionParams
) {
  const { productId, executedBy } = params

  const product = await prisma.product.findUnique({
    where: { id: productId }
  })

  if (!product) {
    throw new Error('Product not found')
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      isFeatured: true,
      priority: Math.min((product.priority ?? 0) + 1, 10),
      promotedAt: new Date()
    }
  })

  return {
    success: true,
    productId,
    promotedBy: executedBy,
    effect: 'PRODUCT_PROMOTED'
  }
}

