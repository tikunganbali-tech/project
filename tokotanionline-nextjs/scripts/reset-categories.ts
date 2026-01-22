/**
 * RESET CATEGORIES - Controlled Reset
 * Run: npx tsx scripts/reset-categories.ts
 * 
 * SAFE MODE: Only deletes from category_context and categories tables
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetCategories() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CONTROLLED CATEGORY RESET');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Get counts before deletion
    const categoryCountBefore = await prisma.category.count();
    const contextCountBefore = await prisma.categoryContext.count();
    
    console.log('📊 Current counts:');
    console.log(`   - categories: ${categoryCountBefore}`);
    console.log(`   - category_context: ${contextCountBefore}\n`);

    if (categoryCountBefore === 0 && contextCountBefore === 0) {
      console.log('ℹ️  Categories already empty. No action needed.\n');
      return;
    }

    console.log('⚠️  WARNING: This will delete ALL categories and contexts!');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Delete in correct order (contexts first due to FK constraint)
    console.log('🗑️  Deleting category_context...');
    const deletedContexts = await prisma.categoryContext.deleteMany({});
    console.log(`   ✅ Deleted ${deletedContexts.count} context rows\n`);

    console.log('🗑️  Deleting categories...');
    const deletedCategories = await prisma.category.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCategories.count} categories\n`);

    // Verify
    const categoryCountAfter = await prisma.category.count();
    const contextCountAfter = await prisma.categoryContext.count();

    console.log('═══════════════════════════════════════════════════════');
    console.log('  VERIFICATION');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`✅ categories: ${categoryCountAfter} (target: 0)`);
    console.log(`✅ category_context: ${contextCountAfter} (target: 0)\n`);

    if (categoryCountAfter === 0 && contextCountAfter === 0) {
      console.log('🎉 Reset completed successfully!\n');
    } else {
      console.error('❌ ERROR: Reset incomplete!\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetCategories();
