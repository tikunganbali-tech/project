/**
 * Migration Script: Update Product Status
 * 
 * Tujuan: Menyelaraskan data existing dengan kontrak sistem
 * - Update semua produk dengan status = null menjadi status = 'PUBLISHED'
 * - Hanya update yang status null
 * - Tidak mengubah produk yang sudah ada statusnya
 * 
 * Run: npx tsx scripts/migrate-product-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting product status migration...\n');

  // Count products with null status
  const nullStatusCount = await prisma.product.count({
    where: {
      status: null,
    },
  });

  console.log(`📊 Products with null status: ${nullStatusCount}`);

  if (nullStatusCount === 0) {
    console.log('✅ No products need migration. All products already have status.');
    return;
  }

  // Update products with null status to PUBLISHED
  const result = await prisma.product.updateMany({
    where: {
      status: null,
    },
    data: {
      status: 'PUBLISHED',
    },
  });

  console.log(`\n✅ Migration completed!`);
  console.log(`📝 Updated products: ${result.count}`);

  // Verify migration
  const remainingNull = await prisma.product.count({
    where: {
      status: null,
    },
  });

  const publishedCount = await prisma.product.count({
    where: {
      status: 'PUBLISHED',
    },
  });

  console.log('\n📊 Verification:');
  console.log(`   Products with null status: ${remainingNull}`);
  console.log(`   Products with PUBLISHED status: ${publishedCount}`);

  if (remainingNull === 0) {
    console.log('\n✅ All products have been migrated successfully!');
  } else {
    console.log(`\n⚠️  Warning: ${remainingNull} products still have null status.`);
  }
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
