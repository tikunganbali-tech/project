/**
 * M-01: Run Database Migration Script
 * 
 * This script:
 * 1. Checks for paths with /public prefix
 * 2. Runs SQL migration to fix paths
 * 3. Verifies the fix
 * 
 * IMPORTANT: Backup database before running!
 * 
 * Usage: npx tsx scripts/m-01-run-migration.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBeforeMigration() {
  console.log('🔍 Checking database for paths with /public prefix...\n');

  const productCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count FROM "Product" WHERE "imageUrl" LIKE '/public/%'
  `;
  const blogCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count FROM "Blog" WHERE "imageUrl" LIKE '/public/%'
  `;
  const blogPostCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count FROM "BlogPost" WHERE "featuredImageUrl" LIKE '/public/%'
  `;
  const productImagesCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count FROM "Product" WHERE "images" LIKE '%/public/%'
  `;

  const productWithPublic = Number(productCount[0]?.count || 0);
  const blogWithPublic = Number(blogCount[0]?.count || 0);
  const blogPostWithPublic = Number(blogPostCount[0]?.count || 0);
  const productImagesWithPublic = Number(productImagesCount[0]?.count || 0);

  console.log('📊 Current state:');
  console.log(`   Product.imageUrl with /public/: ${productWithPublic}`);
  console.log(`   Product.images (JSON) with /public/: ${productImagesWithPublic}`);
  console.log(`   Blog.imageUrl with /public/: ${blogWithPublic}`);
  console.log(`   BlogPost.featuredImageUrl with /public/: ${blogPostWithPublic}\n`);

  const total = productWithPublic + blogWithPublic + blogPostWithPublic + productImagesWithPublic;

  if (total === 0) {
    console.log('✅ No paths with /public/ prefix found. Database is already clean!');
    return false;
  }

  console.log(`⚠️  Found ${total} records with /public/ prefix that need fixing.\n`);
  return true;
}

async function runMigration() {
  console.log('🚀 Running migration to remove /public prefix...\n');

  try {
    // Update Product.imageUrl
    const productResult = await prisma.$executeRaw`
      UPDATE "Product"
      SET "imageUrl" = REPLACE("imageUrl", '/public', '')
      WHERE "imageUrl" LIKE '/public/%'
    `;
    console.log(`✅ Updated ${productResult} Product.imageUrl records`);

    // Update Product.images (JSON array)
    const productImagesResult = await prisma.$executeRaw`
      UPDATE "Product"
      SET "images" = REPLACE("images", '/public', '')
      WHERE "images" LIKE '%/public/%'
    `;
    console.log(`✅ Updated ${productImagesResult} Product.images records`);

    // Update Blog.imageUrl
    const blogResult = await prisma.$executeRaw`
      UPDATE "Blog"
      SET "imageUrl" = REPLACE("imageUrl", '/public', '')
      WHERE "imageUrl" LIKE '/public/%'
    `;
    console.log(`✅ Updated ${blogResult} Blog.imageUrl records`);

    // Update BlogPost.featuredImageUrl
    const blogPostResult = await prisma.$executeRaw`
      UPDATE "BlogPost"
      SET "featuredImageUrl" = REPLACE("featuredImageUrl", '/public', '')
      WHERE "featuredImageUrl" LIKE '/public/%'
    `;
    console.log(`✅ Updated ${blogPostResult} BlogPost.featuredImageUrl records`);

    // Try ProductCategory if it exists
    try {
      const categoryResult = await prisma.$executeRaw`
        UPDATE "ProductCategory"
        SET "imageUrl" = REPLACE("imageUrl", '/public', '')
        WHERE "imageUrl" LIKE '/public/%'
      `;
      console.log(`✅ Updated ${categoryResult} ProductCategory.imageUrl records`);
    } catch (err: any) {
      if (err.message?.includes('column') || err.message?.includes('does not exist')) {
        console.log('ℹ️  ProductCategory.imageUrl column not found (skipping)');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    return true;
  } catch (error: any) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    return false;
  }
}

async function verifyAfterMigration() {
  console.log('🔍 Verifying migration results...\n');

  const productCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count FROM "Product" WHERE "imageUrl" LIKE '/public/%'
  `;
  const blogCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count FROM "Blog" WHERE "imageUrl" LIKE '/public/%'
  `;
  const blogPostCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count FROM "BlogPost" WHERE "featuredImageUrl" LIKE '/public/%'
  `;
  const productImagesCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::int as count FROM "Product" WHERE "images" LIKE '%/public/%'
  `;

  const productWithPublic = Number(productCount[0]?.count || 0);
  const blogWithPublic = Number(blogCount[0]?.count || 0);
  const blogPostWithPublic = Number(blogPostCount[0]?.count || 0);
  const productImagesWithPublic = Number(productImagesCount[0]?.count || 0);

  const total = productWithPublic + blogWithPublic + blogPostWithPublic + productImagesWithPublic;

  if (total === 0) {
    console.log('✅ Verification passed! No paths with /public/ prefix found.');
    return true;
  } else {
    console.log('⚠️  Verification warning:');
    console.log(`   Product.imageUrl with /public/: ${productWithPublic}`);
    console.log(`   Product.images with /public/: ${productImagesWithPublic}`);
    console.log(`   Blog.imageUrl with /public/: ${blogWithPublic}`);
    console.log(`   BlogPost.featuredImageUrl with /public/: ${blogPostWithPublic}`);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  M-01: Database Migration - Fix Image Paths');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Check before migration
    const needsMigration = await checkBeforeMigration();

    if (!needsMigration) {
      await prisma.$disconnect();
      process.exit(0);
    }

    // Ask for confirmation
    console.log('⚠️  IMPORTANT: Make sure you have backed up your database!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Run migration
    const success = await runMigration();

    if (!success) {
      await prisma.$disconnect();
      process.exit(1);
    }

    // Verify
    const verified = await verifyAfterMigration();

    if (verified) {
      console.log('\n🎉 Migration completed and verified successfully!');
      console.log('   Next steps:');
      console.log('   1. Run: npm run dev');
      console.log('   2. Check browser console for any 404 image errors');
      console.log('   3. Verify images load correctly in blog and product pages\n');
    } else {
      console.log('\n⚠️  Migration completed but verification found remaining issues.');
      console.log('   Please review the database manually.\n');
    }

    await prisma.$disconnect();
    process.exit(verified ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
