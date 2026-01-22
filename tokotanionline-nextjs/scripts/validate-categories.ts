/**
 * VALIDATE CATEGORIES - Post-Insert Validation
 * Run: npx tsx scripts/validate-categories.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateCategories() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  POST-INSERT VALIDATION');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Count categories
    const totalCategories = await prisma.category.count();
    const totalContexts = await prisma.categoryContext.count();

    // Count by level
    const level1 = await prisma.category.count({ where: { level: 1 } });
    const level2 = await prisma.category.count({ where: { level: 2 } });
    const level3 = await prisma.category.count({ where: { level: 3 } });

    // Get all categories with contexts
    const categories = await prisma.category.findMany({
      include: {
        contexts: true,
        parent: true,
        children: true,
      },
      orderBy: [
        { level: 'asc' },
        { name: 'asc' },
      ],
    });

    // Validate context rows (each category should have 3 contexts)
    const categoriesWithoutFullContext = categories.filter(
      (cat) => cat.contexts.length !== 3
    );

    // Validate slugs (lowercase, unique)
    const slugs = categories.map((cat) => cat.slug);
    const duplicateSlugs = slugs.filter(
      (slug, index) => slugs.indexOf(slug) !== index
    );
    const nonLowercaseSlugs = slugs.filter((slug) => slug !== slug.toLowerCase());

    // Validate parent-child relationships
    const orphanCategories = categories.filter(
      (cat) => cat.parentId && !categories.find((c) => c.id === cat.parentId)
    );

    console.log('📊 DATABASE COUNTS:');
    console.log(`   - Total categories: ${totalCategories}`);
    console.log(`   - Total context rows: ${totalContexts}`);
    console.log(`   - Expected context rows: ${totalCategories * 3}`);
    console.log('');

    console.log('📊 LEVEL DISTRIBUTION:');
    console.log(`   - Level 1 (root): ${level1}`);
    console.log(`   - Level 2 (sub): ${level2}`);
    console.log(`   - Level 3 (leaf): ${level3}`);
    console.log('');

    console.log('✅ VALIDATION RESULTS:');
    
    // Context validation
    if (totalContexts === totalCategories * 3) {
      console.log('   ✅ Context rows: CORRECT (each category has 3 contexts)');
    } else {
      console.log(`   ❌ Context rows: INCORRECT (expected ${totalCategories * 3}, got ${totalContexts})`);
    }

    if (categoriesWithoutFullContext.length === 0) {
      console.log('   ✅ All categories have 3 context rows (product, blog, ai)');
    } else {
      console.log(`   ❌ ${categoriesWithoutFullContext.length} categories missing context rows:`);
      categoriesWithoutFullContext.forEach((cat) => {
        console.log(`      - ${cat.name} (${cat.contexts.length} contexts)`);
      });
    }

    // Slug validation
    if (duplicateSlugs.length === 0) {
      console.log('   ✅ Slug uniqueness: PASS (all slugs are unique)');
    } else {
      console.log(`   ❌ Slug uniqueness: FAIL (duplicates: ${duplicateSlugs.join(', ')})`);
    }

    if (nonLowercaseSlugs.length === 0) {
      console.log('   ✅ Slug format: PASS (all slugs are lowercase)');
    } else {
      console.log(`   ❌ Slug format: FAIL (non-lowercase: ${nonLowercaseSlugs.join(', ')})`);
    }

    // Parent-child validation
    if (orphanCategories.length === 0) {
      console.log('   ✅ Parent-child relationships: PASS (no orphan categories)');
    } else {
      console.log(`   ❌ Parent-child relationships: FAIL (${orphanCategories.length} orphan categories)`);
    }

    // Max depth validation
    const maxLevel = Math.max(...categories.map((cat) => cat.level));
    if (maxLevel <= 3) {
      console.log(`   ✅ Max depth: PASS (max level: ${maxLevel})`);
    } else {
      console.log(`   ❌ Max depth: FAIL (max level: ${maxLevel}, exceeds limit of 3)`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  CATEGORY TREE STRUCTURE');
    console.log('═══════════════════════════════════════════════════════\n');

    // Build tree structure
    const rootCategories = categories.filter((cat) => cat.level === 1);
    
    function printCategory(cat: any, indent: string = '') {
      const contextTypes = cat.contexts.map((ctx: any) => ctx.context).join(', ');
      console.log(`${indent}${cat.name} (level ${cat.level}, slug: ${cat.slug}) [${contextTypes}]`);
      const children = categories.filter((c) => c.parentId === cat.id);
      children.forEach((child) => {
        printCategory(child, indent + '  ');
      });
    }

    rootCategories.forEach((root) => {
      printCategory(root);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validateCategories();
