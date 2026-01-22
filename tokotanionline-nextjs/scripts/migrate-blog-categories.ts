/**
 * Migration Script: BlogCategory → ProductCategory (type=BLOG)
 * 
 * Purpose: Migrate existing BlogCategory records to ProductCategory with type=BLOG
 * and update Blog records to point to the new ProductCategory records.
 * 
 * Run this BEFORE applying the schema changes that add the foreign key constraint.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateBlogCategories() {
  console.log('🔄 Starting BlogCategory → ProductCategory migration...\n');

  try {
    // Step 1: Get all BlogCategory records
    const blogCategories = await prisma.blogCategory.findMany();

    console.log(`📊 Found ${blogCategories.length} BlogCategory records\n`);

    if (blogCategories.length === 0) {
      console.log('✅ No BlogCategory records to migrate. Migration complete.');
      return;
    }

    // Step 2: Create ProductCategory records from BlogCategory (type=BLOG)
    const categoryMap = new Map<string, string>(); // oldId -> newId

    for (const blogCat of blogCategories) {
      // Check if ProductCategory with same slug and type=BLOG already exists
      const existing = await prisma.productCategory.findFirst({
        where: {
          slug: blogCat.slug,
          type: 'BLOG',
          brandId: blogCat.brandId,
        },
      });

      if (existing) {
        console.log(`⚠️  ProductCategory with slug "${blogCat.slug}" (type=BLOG) already exists. Using existing.`);
        categoryMap.set(blogCat.id, existing.id);
        continue;
      }

      // Create new ProductCategory
      const newCategory = await prisma.productCategory.create({
        data: {
          name: blogCat.name,
          slug: blogCat.slug,
          type: 'BLOG',
          description: blogCat.description,
          brandId: blogCat.brandId,
          // SEO fields will be null initially
        },
      });

      categoryMap.set(blogCat.id, newCategory.id);
      console.log(`✅ Created ProductCategory: ${newCategory.name} (${newCategory.id})`);
    }

    console.log(`\n📝 Created ${categoryMap.size} ProductCategory records\n`);

    // Step 3: Update Blog records to point to new ProductCategory
    const blogs = await prisma.blog.findMany({
      where: {
        categoryId: {
          not: null,
        },
      },
    });

    console.log(`📊 Found ${blogs.length} Blog records with categoryId\n`);

    let updatedCount = 0;
    for (const blog of blogs) {
      if (!blog.categoryId) continue;

      const newCategoryId = categoryMap.get(blog.categoryId);
      if (!newCategoryId) {
        console.log(`⚠️  No mapping found for BlogCategory ${blog.categoryId}. Skipping blog ${blog.id}`);
        continue;
      }

      await prisma.blog.update({
        where: { id: blog.id },
        data: { categoryId: newCategoryId },
      });

      updatedCount++;
    }

    console.log(`✅ Updated ${updatedCount} Blog records\n`);

    console.log('🎉 Migration complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run prisma:push');
    console.log('2. Verify data integrity');
    console.log('3. (Optional) Archive or delete old BlogCategory records');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateBlogCategories()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
