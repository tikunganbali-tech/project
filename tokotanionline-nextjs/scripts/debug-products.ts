/**
 * STEP D4: Debug script untuk cek data produk langsung dari DB
 * Run: npx tsx scripts/debug-products.ts
 */

import { prisma } from '../lib/db';

async function debugProducts() {
  try {
    // Query minimal - semua produk
    const allProducts = await prisma.product.findMany({
      take: 5,
    });

    console.log('\n=== D4: VALIDASI 1 RECORD DB ===');
    console.log(`Total products in DB (sample 5): ${allProducts.length}`);

    if (allProducts.length > 0) {
      const sample = allProducts[0];
      console.log('\nSample Product:');
      console.log({
        id: sample.id,
        name: sample.name,
        status: sample.status,
        isActive: sample.isActive,
        isFeatured: sample.isFeatured,
        price: sample.price,
        categoryId: sample.categoryId,
        promotedAt: sample.promotedAt,
      });
    }

    // Query dengan status PUBLISHED
    const publishedProducts = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
      },
      take: 5,
    });

    console.log(`\nProducts with status='PUBLISHED': ${publishedProducts.length}`);

    // Query dengan status PUBLISHED + isActive
    const publishedActiveProducts = await prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        isActive: true,
      },
      take: 5,
    });

    console.log(`Products with status='PUBLISHED' AND isActive=true: ${publishedActiveProducts.length}`);

    // Count semua
    const totalCount = await prisma.product.count();
    const publishedCount = await prisma.product.count({
      where: { status: 'PUBLISHED' },
    });
    const publishedActiveCount = await prisma.product.count({
      where: { status: 'PUBLISHED', isActive: true },
    });

    console.log('\n=== COUNTS ===');
    console.log(`Total products: ${totalCount}`);
    console.log(`Status='PUBLISHED': ${publishedCount}`);
    console.log(`Status='PUBLISHED' AND isActive=true: ${publishedActiveCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugProducts();
