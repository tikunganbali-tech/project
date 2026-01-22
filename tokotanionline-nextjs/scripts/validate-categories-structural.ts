/**
 * VALIDATE CATEGORIES - Structural Nodes Validation
 * Run: npx tsx scripts/validate-categories-structural.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateCategories() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  POST-INSERT VALIDATION (STRUCTURAL NODES)');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Get all categories
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

    // Counts
    const totalCategories = categories.length;
    const structuralNodes = categories.filter((cat) => cat.isStructural);
    const leafNodes = categories.filter((cat) => !cat.isStructural);
    
    // Count by level
    const level1 = categories.filter((cat) => cat.level === 1).length;
    const level2 = categories.filter((cat) => cat.level === 2).length;
    const level3 = categories.filter((cat) => cat.level === 3).length;
    const level4 = categories.filter((cat) => cat.level === 4).length;

    // Context validation
    const structuralWithWrongContext = structuralNodes.filter(
      (cat) => {
        const contexts = cat.contexts.map((ctx) => ctx.context);
        return contexts.includes('product') || contexts.includes('blog') || contexts.length !== 1 || !contexts.includes('ai');
      }
    );

    const leafWithoutFullContext = leafNodes.filter(
      (cat) => {
        const contexts = cat.contexts.map((ctx) => ctx.context);
        return contexts.length !== 3 || 
               !contexts.includes('product') || 
               !contexts.includes('blog') || 
               !contexts.includes('ai');
      }
    );

    // Check for "Tanaman Pertanian" as structural
    const tanamanPertanian = categories.find((cat) => cat.name === 'Tanaman Pertanian');
    const hasTanamanPertanian = !!tanamanPertanian;
    const isTanamanPertanianStructural = tanamanPertanian?.isStructural ?? false;

    console.log('📊 DATABASE COUNTS:');
    console.log(`   - Total categories: ${totalCategories}`);
    console.log(`   - Structural nodes: ${structuralNodes.length}`);
    console.log(`   - Leaf nodes: ${leafNodes.length}`);
    console.log('');

    console.log('📊 LEVEL DISTRIBUTION:');
    console.log(`   - Level 1 (root): ${level1}`);
    console.log(`   - Level 2: ${level2}`);
    console.log(`   - Level 3: ${level3}`);
    console.log(`   - Level 4: ${level4}`);
    console.log('');

    console.log('✅ VALIDATION RESULTS:');
    
    // Structural node validation
    if (structuralWithWrongContext.length === 0) {
      console.log('   ✅ Structural nodes: CORRECT (all have AI context only)');
    } else {
      console.log(`   ❌ Structural nodes: INCORRECT (${structuralWithWrongContext.length} nodes have wrong context)`);
      structuralWithWrongContext.forEach((cat) => {
        const contexts = cat.contexts.map((ctx) => ctx.context).join(', ');
        console.log(`      - ${cat.name} (contexts: ${contexts})`);
      });
    }

    // Leaf node validation
    if (leafWithoutFullContext.length === 0) {
      console.log('   ✅ Leaf nodes: CORRECT (all have product, blog, ai contexts)');
    } else {
      console.log(`   ❌ Leaf nodes: INCORRECT (${leafWithoutFullContext.length} nodes missing contexts)`);
      leafWithoutFullContext.forEach((cat) => {
        const contexts = cat.contexts.map((ctx) => ctx.context).join(', ');
        console.log(`      - ${cat.name} (contexts: ${contexts})`);
      });
    }

    // Tanaman Pertanian validation
    if (hasTanamanPertanian) {
      console.log('   ✅ "Tanaman Pertanian" node: EXISTS');
      if (isTanamanPertanianStructural) {
        console.log('   ✅ "Tanaman Pertanian": CORRECT (marked as structural)');
        const contexts = tanamanPertanian!.contexts.map((ctx) => ctx.context);
        if (contexts.length === 1 && contexts.includes('ai')) {
          console.log('   ✅ "Tanaman Pertanian" context: CORRECT (AI only)');
        } else {
          console.log(`   ❌ "Tanaman Pertanian" context: INCORRECT (got: ${contexts.join(', ')})`);
        }
      } else {
        console.log('   ❌ "Tanaman Pertanian": INCORRECT (not marked as structural)');
      }
    } else {
      console.log('   ❌ "Tanaman Pertanian" node: MISSING (flattening detected!)');
    }

    // No flattening validation
    const expectedNodes = [
      'Tanaman',
      'Tanaman Hias',
      'Tanaman Pertanian',
      'Tanaman Pangan',
      'Tanaman Hortikultura',
      'Tanaman Perkebunan',
      'Padi',
      'Jagung',
      'Kentang',
      'Cabai',
      'Tomat',
      'Kubis',
      'Wortel',
      'Kopi',
      'Kakao',
      'Tebu',
    ];
    
    const missingNodes = expectedNodes.filter(
      (name) => !categories.find((cat) => cat.name === name)
    );

    if (missingNodes.length === 0) {
      console.log('   ✅ No flattening: PASS (all expected nodes exist)');
    } else {
      console.log(`   ❌ No flattening: FAIL (missing nodes: ${missingNodes.join(', ')})`);
    }

    // Hierarchy validation
    if (tanamanPertanian) {
      const hasCorrectParent = tanamanPertanian.parent?.name === 'Tanaman';
      const hasCorrectChildren = tanamanPertanian.children.length === 3 &&
        tanamanPertanian.children.some((c) => c.name === 'Tanaman Pangan') &&
        tanamanPertanian.children.some((c) => c.name === 'Tanaman Hortikultura') &&
        tanamanPertanian.children.some((c) => c.name === 'Tanaman Perkebunan');
      
      if (hasCorrectParent && hasCorrectChildren) {
        console.log('   ✅ Hierarchy: CORRECT (Tanaman Pertanian has correct parent and children)');
      } else {
        console.log('   ❌ Hierarchy: INCORRECT (Tanaman Pertanian structure wrong)');
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  STRUCTURAL NODES DETAIL');
    console.log('═══════════════════════════════════════════════════════\n');

    structuralNodes.forEach((cat) => {
      const contexts = cat.contexts.map((ctx) => ctx.context).join(', ');
      console.log(`📁 ${cat.name} (level ${cat.level})`);
      console.log(`   Contexts: ${contexts}`);
      console.log(`   Children: ${cat.children.length}`);
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
