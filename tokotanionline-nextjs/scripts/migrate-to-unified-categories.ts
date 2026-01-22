/**
 * PHASE 1: MIGRATION TO UNIFIED CATEGORY CORE
 * 
 * This script migrates existing category data to the unified Category system:
 * - ProductCategory → Category (with context='product')
 * - BlogCategory → Category (with context='blog')
 * - ContentCategory → Category (with context='blog')
 * 
 * Rules:
 * - Preserves all existing data
 * - Creates CategoryContext entries automatically
 * - Updates Product/Blog/BlogPost references
 * - Idempotent (safe to run multiple times)
 * 
 * IMPORTANT: Backup database before running!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  productCategoriesMigrated: number;
  blogCategoriesMigrated: number;
  contentCategoriesMigrated: number;
  contextsCreated: number;
  productsUpdated: number;
  blogsUpdated: number;
  blogPostsUpdated: number;
  errors: string[];
}

async function migrateProductCategories(stats: MigrationStats): Promise<void> {
  console.log('\n📦 Migrating ProductCategory → Category...');

  const productCategories = await prisma.productCategory.findMany({
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: [
      { parentId: { sort: 'asc', nulls: 'first' } }, // Process parents first
      { name: 'asc' },
    ],
  });

  console.log(`   Found ${productCategories.length} product categories`);

  // Create a map for old ID → new ID
  const idMap = new Map<string, string>();

  // First pass: Create all categories (parents before children)
  for (const pc of productCategories) {
    try {
      // Check if already migrated (by slug)
      const existing = await prisma.category.findUnique({
        where: { slug: pc.slug },
      });

      if (existing) {
        idMap.set(pc.id, existing.id);
        console.log(`   ⏭️  Skipped (already exists): ${pc.name}`);
        continue;
      }

      // Calculate level
      let level = 1;
      if (pc.parentId) {
        const parentNewId = idMap.get(pc.parentId);
        if (parentNewId) {
          const parent = await prisma.category.findUnique({
            where: { id: parentNewId },
            select: { level: true },
          });
          if (parent) {
            level = parent.level + 1;
          }
        }
      }

      // Create unified category
      const category = await prisma.category.create({
        data: {
          name: pc.name,
          slug: pc.slug,
          parentId: pc.parentId ? idMap.get(pc.parentId) || null : null,
          level,
          type: pc.type || 'PRODUCT',
          isActive: true,
          brandId: pc.brandId,
        },
      });

      idMap.set(pc.id, category.id);
      stats.productCategoriesMigrated++;

      // Create context entry
      await prisma.categoryContext.create({
        data: {
          categoryId: category.id,
          context: 'product',
        },
      });
      stats.contextsCreated++;

      console.log(`   ✅ Migrated: ${pc.name} (level ${level})`);
    } catch (error: any) {
      const errorMsg = `Failed to migrate ProductCategory "${pc.name}": ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  // Second pass: Update Product references
  console.log('\n   Updating Product references...');
  for (const pc of productCategories) {
    const newCategoryId = idMap.get(pc.id);
    if (!newCategoryId) continue;

    try {
      const result = await prisma.product.updateMany({
        where: { categoryId: pc.id },
        data: { unifiedCategoryId: newCategoryId },
      });

      if (result.count > 0) {
        stats.productsUpdated += result.count;
        console.log(`   ✅ Updated ${result.count} products for category: ${pc.name}`);
      }
    } catch (error: any) {
      const errorMsg = `Failed to update products for category "${pc.name}": ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }
}

async function migrateBlogCategories(stats: MigrationStats): Promise<void> {
  console.log('\n📝 Migrating BlogCategory → Category...');

  const blogCategories = await prisma.blogCategory.findMany({
    // BlogCategory doesn't have blogs relation, so no _count needed
  });

  console.log(`   Found ${blogCategories.length} blog categories`);

  const idMap = new Map<string, string>();

  for (const bc of blogCategories) {
    try {
      // Check if already exists (by slug)
      const existing = await prisma.category.findUnique({
        where: { slug: bc.slug },
      });

      if (existing) {
        idMap.set(bc.id, existing.id);
        console.log(`   ⏭️  Skipped (already exists): ${bc.name}`);
        continue;
      }

      // Blog categories are typically root (level 1)
      const category = await prisma.category.create({
        data: {
          name: bc.name,
          slug: bc.slug,
          parentId: null,
          level: 1,
          type: 'BLOG',
          isActive: true,
          brandId: bc.brandId,
        },
      });

      idMap.set(bc.id, category.id);
      stats.blogCategoriesMigrated++;

      // Create context entries (blog and ai)
      await Promise.all([
        prisma.categoryContext.create({
          data: {
            categoryId: category.id,
            context: 'blog',
          },
        }),
        prisma.categoryContext.create({
          data: {
            categoryId: category.id,
            context: 'ai',
          },
        }),
      ]);
      stats.contextsCreated += 2;

      console.log(`   ✅ Migrated: ${bc.name}`);
    } catch (error: any) {
      const errorMsg = `Failed to migrate BlogCategory "${bc.name}": ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  // Update Blog references
  console.log('\n   Updating Blog references...');
  for (const bc of blogCategories) {
    const newCategoryId = idMap.get(bc.id);
    if (!newCategoryId) continue;

    try {
      const result = await prisma.blog.updateMany({
        where: { categoryId: bc.id },
        data: { unifiedCategoryId: newCategoryId },
      });

      if (result.count > 0) {
        stats.blogsUpdated += result.count;
        console.log(`   ✅ Updated ${result.count} blogs for category: ${bc.name}`);
      }
    } catch (error: any) {
      const errorMsg = `Failed to update blogs for category "${bc.name}": ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }
}

async function migrateContentCategories(stats: MigrationStats): Promise<void> {
  console.log('\n📚 Migrating ContentCategory → Category...');

  const contentCategories = await prisma.contentCategory.findMany({
    // ContentCategory has posts relation, but we'll count separately if needed
  });

  console.log(`   Found ${contentCategories.length} content categories`);

  const idMap = new Map<string, string>();

  for (const cc of contentCategories) {
    try {
      // Check if already exists (by slug)
      const existing = await prisma.category.findUnique({
        where: { slug: cc.slug },
      });

      if (existing) {
        idMap.set(cc.id, existing.id);
        console.log(`   ⏭️  Skipped (already exists): ${cc.name}`);
        continue;
      }

      // Content categories are typically root (level 1)
      const category = await prisma.category.create({
        data: {
          name: cc.name,
          slug: cc.slug,
          parentId: null,
          level: 1,
          type: cc.type || 'BLOG',
          isActive: cc.isActive,
          brandId: null, // ContentCategory doesn't have brandId
        },
      });

      idMap.set(cc.id, category.id);
      stats.contentCategoriesMigrated++;

      // Create context entries (blog and ai)
      await Promise.all([
        prisma.categoryContext.create({
          data: {
            categoryId: category.id,
            context: 'blog',
          },
        }),
        prisma.categoryContext.create({
          data: {
            categoryId: category.id,
            context: 'ai',
          },
        }),
      ]);
      stats.contextsCreated += 2;

      console.log(`   ✅ Migrated: ${cc.name}`);
    } catch (error: any) {
      const errorMsg = `Failed to migrate ContentCategory "${cc.name}": ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }

  // Update BlogPost references
  console.log('\n   Updating BlogPost references...');
  for (const cc of contentCategories) {
    const newCategoryId = idMap.get(cc.id);
    if (!newCategoryId) continue;

    try {
      const result = await prisma.blogPost.updateMany({
        where: { categoryId: cc.id },
        data: { unifiedCategoryId: newCategoryId },
      });

      if (result.count > 0) {
        stats.blogPostsUpdated += result.count;
        console.log(`   ✅ Updated ${result.count} blog posts for category: ${cc.name}`);
      }
    } catch (error: any) {
      const errorMsg = `Failed to update blog posts for category "${cc.name}": ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`   ❌ ${errorMsg}`);
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PHASE 1: MIGRATION TO UNIFIED CATEGORY CORE');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('⚠️  IMPORTANT: Make sure you have backed up your database!');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const stats: MigrationStats = {
    productCategoriesMigrated: 0,
    blogCategoriesMigrated: 0,
    contentCategoriesMigrated: 0,
    contextsCreated: 0,
    productsUpdated: 0,
    blogsUpdated: 0,
    blogPostsUpdated: 0,
    errors: [],
  };

  try {
    // Migrate in order: ProductCategory, BlogCategory, ContentCategory
    await migrateProductCategories(stats);
    await migrateBlogCategories(stats);
    await migrateContentCategories(stats);

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`✅ ProductCategories migrated: ${stats.productCategoriesMigrated}`);
    console.log(`✅ BlogCategories migrated: ${stats.blogCategoriesMigrated}`);
    console.log(`✅ ContentCategories migrated: ${stats.contentCategoriesMigrated}`);
    console.log(`✅ CategoryContext entries created: ${stats.contextsCreated}`);
    console.log(`✅ Products updated: ${stats.productsUpdated}`);
    console.log(`✅ Blogs updated: ${stats.blogsUpdated}`);
    console.log(`✅ BlogPosts updated: ${stats.blogPostsUpdated}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
    }

    console.log('\n🎉 Migration completed!');
    console.log('\nNext steps:');
    console.log('1. Verify data integrity');
    console.log('2. Update API routes to use unified Category');
    console.log('3. Update frontend components');
    console.log('4. Test AI generator with category_id\n');
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
