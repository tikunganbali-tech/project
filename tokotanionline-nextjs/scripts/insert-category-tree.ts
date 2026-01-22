/**
 * PHASE 1: INSERT CATEGORY TREE
 * 
 * This script inserts a category tree into the unified Category system.
 * 
 * Features:
 * - Preserves hierarchy (parents before children)
 * - Auto-creates context rows (product, blog, ai) for each category
 * - Idempotent (skip if exists by slug)
 * - Auto-calculates level
 * - Validates slug uniqueness, parent validity, no orphans
 * 
 * Usage:
 * 1. Edit the CATEGORY_TREE constant below with your category structure
 * 2. Run: npx tsx scripts/insert-category-tree.ts
 * 
 * IMPORTANT: Backup database before running!
 */

import { PrismaClient } from '@prisma/client';
import { insertCategoryTree, CategoryInput } from '../lib/unified-category-utils';

const prisma = new PrismaClient();

/**
 * CATEGORY TREE STRUCTURE
 * 
 * Edit this array to match your category hierarchy.
 * 
 * Structure:
 * - name: Category name (required)
 * - slug: Optional (auto-generated if not provided)
 * - type: Category type string (required, e.g., "agricultural", "farming", etc.)
 * - isActive: Optional (default: true)
 * - brandId: Optional (null = global category)
 * - children: Nested categories (optional)
 * 
 * Levels:
 * - Root categories (no parent) → level 1
 * - Children of level 1 → level 2
 * - Children of level 2 → level 3
 * - Maximum depth: 3 levels
 */
const CATEGORY_TREE: Array<CategoryInput & { children?: Array<CategoryInput & { children?: CategoryInput[] }> }> = [
  {
    name: "Tanaman",
    type: 'agricultural',
    children: [
      {
        name: "Tanaman Hias",
        type: 'agricultural',
        children: [
          { name: "Tanaman Bunga", type: 'agricultural' },
          { name: "Tanaman Daun Hias", type: 'agricultural' },
          { name: "Kaktus & Sukulen", type: 'agricultural' },
          { name: "Anggrek", type: 'agricultural' },
          { name: "Bonsai", type: 'agricultural' },
          { name: "Tanaman Air", type: 'agricultural' },
        ],
      },
      {
        name: "Tanaman Pertanian",
        type: 'agricultural',
        children: [
          {
            name: "Tanaman Pangan",
            type: 'agricultural',
            children: [
              { name: "Padi", type: 'agricultural' },
              { name: "Jagung", type: 'agricultural' },
              { name: "Kentang", type: 'agricultural' },
            ],
          },
          {
            name: "Tanaman Hortikultura",
            type: 'agricultural',
            children: [
              { name: "Cabai", type: 'agricultural' },
              { name: "Tomat", type: 'agricultural' },
              { name: "Kubis", type: 'agricultural' },
              { name: "Wortel", type: 'agricultural' },
            ],
          },
          {
            name: "Tanaman Perkebunan",
            type: 'agricultural',
            children: [
              { name: "Kopi", type: 'agricultural' },
              { name: "Kakao", type: 'agricultural' },
              { name: "Tebu", type: 'agricultural' },
            ],
          },
        ],
      },
    ],
  },

  {
    name: "Bibit & Benih",
    type: 'agricultural',
    children: [
      {
        name: "Benih",
        type: 'agricultural',
        children: [
          { name: "Benih Sayur", type: 'agricultural' },
          { name: "Benih Padi & Palawija", type: 'agricultural' },
          { name: "Benih Bunga", type: 'agricultural' },
        ],
      },
      {
        name: "Bibit Tanaman",
        type: 'agricultural',
        children: [
          { name: "Bibit Sayur", type: 'agricultural' },
          { name: "Bibit Tanaman Buah", type: 'agricultural' },
          { name: "Bibit Tanaman Perkebunan", type: 'agricultural' },
        ],
      },
      {
        name: "Pohon",
        type: 'agricultural',
        children: [
          { name: "Pohon Buah", type: 'agricultural' },
          { name: "Pohon Pelindung", type: 'agricultural' },
          { name: "Pohon Kayu", type: 'agricultural' },
        ],
      },
    ],
  },

  {
    name: "Sarana Produksi Pertanian",
    type: 'agricultural',
    children: [
      {
        name: "Pupuk",
        type: 'agricultural',
        children: [
          { name: "Pupuk Organik", type: 'agricultural' },
          { name: "Pupuk Anorganik", type: 'agricultural' },
          { name: "Pupuk Cair", type: 'agricultural' },
          { name: "ZPT", type: 'agricultural' },
        ],
      },
      {
        name: "Obat & Perlindungan Tanaman",
        type: 'agricultural',
        children: [
          { name: "Fungisida", type: 'agricultural' },
          { name: "Insektisida", type: 'agricultural' },
          { name: "Herbisida", type: 'agricultural' },
          { name: "Bakterisida", type: 'agricultural' },
          { name: "Pestisida Nabati", type: 'agricultural' },
        ],
      },
    ],
  },

  {
    name: "Alat & Mesin Pertanian",
    type: 'agricultural',
    children: [
      { name: "Alat Pertanian Manual", type: 'agricultural' },
      { name: "Alat Pertanian Modern", type: 'agricultural' },
      { name: "Mesin Pertanian Berat", type: 'agricultural' },
    ],
  },

  {
    name: "Hasil Pertanian",
    type: 'agricultural',
    children: [
      { name: "Hasil Panen Segar", type: 'agricultural' },
      { name: "Hasil Panen Kering", type: 'agricultural' },
      { name: "Produk Olahan Pertanian", type: 'agricultural' },
    ],
  },

  {
    name: "Peternakan & Perikanan",
    type: 'agricultural',
    children: [
      {
        name: "Peternakan",
        type: 'agricultural',
        children: [
          { name: "Pakan Ternak", type: 'agricultural' },
          { name: "Obat & Vitamin Ternak", type: 'agricultural' },
          { name: "Perlengkapan Kandang", type: 'agricultural' },
        ],
      },
      {
        name: "Perikanan",
        type: 'agricultural',
        children: [
          { name: "Pakan Ikan", type: 'agricultural' },
          { name: "Obat Ikan", type: 'agricultural' },
          { name: "Peralatan Kolam", type: 'agricultural' },
        ],
      },
    ],
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PHASE 1: INSERT CATEGORY TREE');
  console.log('═══════════════════════════════════════════════════════\n');

  // Validate tree structure
  if (!CATEGORY_TREE || CATEGORY_TREE.length === 0) {
    console.error('❌ ERROR: CATEGORY_TREE is empty!');
    console.error('   Please edit scripts/insert-category-tree.ts and add your category tree.\n');
    process.exit(1);
  }

  // Count total categories (including nested)
  function countCategories(tree: Array<CategoryInput & { children?: CategoryInput[] }>): number {
    let count = tree.length;
    for (const cat of tree) {
      if (cat.children) {
        count += countCategories(cat.children);
      }
    }
    return count;
  }

  const totalCategories = countCategories(CATEGORY_TREE);
  console.log(`📊 Category tree structure:`);
  console.log(`   - Root categories: ${CATEGORY_TREE.length}`);
  console.log(`   - Total categories: ${totalCategories}`);
  console.log('');

  console.log('⚠️  IMPORTANT: Make sure you have backed up your database!');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    // Get brandId (optional - can be null for global categories)
    // You can modify this to get brandId from environment or args
    const brandId = process.env.BRAND_ID || null;

    // Insert category tree
    const result = await insertCategoryTree(CATEGORY_TREE, brandId);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  INSERTION SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`✅ Categories inserted: ${result.inserted}`);
    console.log(`⏭️  Categories skipped (already exist): ${result.skipped}`);
    console.log(`📝 Total context rows created: ${result.inserted * 3}`); // 3 contexts per category

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
      result.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
    }

    if (result.inserted > 0) {
      console.log('\n🎉 Category tree inserted successfully!');
      console.log('\nNext steps:');
      console.log('1. Verify categories in admin UI');
      console.log('2. Verify context rows (product, blog, ai)');
      console.log('3. Test category filtering in frontend\n');
    } else {
      console.log('\nℹ️  All categories already exist (idempotent insert).\n');
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
