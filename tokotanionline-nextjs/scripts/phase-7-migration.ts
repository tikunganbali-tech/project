/**
 * PHASE 7A + 7B Migration Script
 * 
 * This script helps with:
 * 1. Creating default brand if none exists
 * 2. Creating default locales for each brand
 * 3. Assigning existing records to default brand/locale
 * 
 * Run after: npx prisma migrate dev --name phase-7-multi-brand-language
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting PHASE 7A + 7B Migration...\n');

  try {
    // Step 1: Check if any brands exist
    const existingBrands = await prisma.brand.findMany();
    console.log(`📊 Found ${existingBrands.length} existing brand(s)`);

    let defaultBrand;
    
    if (existingBrands.length === 0) {
      // Create default brand
      console.log('\n📝 Creating default brand...');
      defaultBrand = await prisma.brand.create({
        data: {
          brandName: 'Default Brand',
          brandSlug: 'default',
          brandStatus: 'ACTIVE',
        },
      });
      console.log(`✅ Created default brand: ${defaultBrand.brandName} (${defaultBrand.id})`);
    } else {
      defaultBrand = existingBrands[0];
      console.log(`✅ Using existing brand: ${defaultBrand.brandName} (${defaultBrand.id})`);
    }

    // Step 2: Check if locales exist for this brand
    const existingLocales = await prisma.locale.findMany({
      where: { brandId: defaultBrand.id },
    });
    console.log(`\n📊 Found ${existingLocales.length} existing locale(s) for brand`);

    let defaultLocale;
    
    if (existingLocales.length === 0) {
      // Create default locales
      console.log('\n📝 Creating default locales...');
      
      // Create Indonesian locale (default)
      const idLocale = await prisma.locale.create({
        data: {
          brandId: defaultBrand.id,
          localeCode: 'id-ID',
          languageName: 'Indonesian',
          isDefault: true,
          isActive: true,
        },
      });
      console.log(`✅ Created locale: ${idLocale.languageName} (${idLocale.localeCode})`);
      defaultLocale = idLocale;

      // Create English locale (optional)
      const enLocale = await prisma.locale.create({
        data: {
          brandId: defaultBrand.id,
          localeCode: 'en-US',
          languageName: 'English (US)',
          isDefault: false,
          isActive: true,
        },
      });
      console.log(`✅ Created locale: ${enLocale.languageName} (${enLocale.localeCode})`);
    } else {
      defaultLocale = existingLocales.find(l => l.isDefault) || existingLocales[0];
      console.log(`✅ Using existing locale: ${defaultLocale.languageName} (${defaultLocale.localeCode})`);
    }

    // Step 3: Assign existing records to default brand/locale
    console.log('\n📝 Assigning existing records to default brand/locale...');

    // Count records that need updating
    const productsWithoutBrand = await prisma.product.count({
      where: { brandId: null as any },
    });
    const blogsWithoutBrand = await prisma.blog.count({
      where: { brandId: null as any },
    });

    console.log(`   Products without brand: ${productsWithoutBrand}`);
    console.log(`   Blogs without brand: ${blogsWithoutBrand}`);

    if (productsWithoutBrand > 0) {
      const updatedProducts = await prisma.product.updateMany({
        where: { brandId: null as any },
        data: {
          brandId: defaultBrand.id,
          localeId: defaultLocale.id,
        },
      });
      console.log(`✅ Updated ${updatedProducts.count} products`);
    }

    if (blogsWithoutBrand > 0) {
      const updatedBlogs = await prisma.blog.updateMany({
        where: { brandId: null as any },
        data: {
          brandId: defaultBrand.id,
          localeId: defaultLocale.id,
        },
      });
      console.log(`✅ Updated ${updatedBlogs.count} blogs`);
    }

    // Update categories
    const categoriesWithoutBrand = await prisma.productCategory.count({
      where: { brandId: null as any },
    });
    if (categoriesWithoutBrand > 0) {
      const updatedCategories = await prisma.productCategory.updateMany({
        where: { brandId: null as any },
        data: {
          brandId: defaultBrand.id,
        },
      });
      console.log(`✅ Updated ${updatedCategories.count} product categories`);
    }

    const blogCategoriesWithoutBrand = await prisma.blogCategory.count({
      where: { brandId: null as any },
    });
    if (blogCategoriesWithoutBrand > 0) {
      const updatedBlogCategories = await prisma.blogCategory.updateMany({
        where: { brandId: null as any },
        data: {
          brandId: defaultBrand.id,
        },
      });
      console.log(`✅ Updated ${updatedBlogCategories.count} blog categories`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Brand: ${defaultBrand.brandName} (${defaultBrand.id})`);
    console.log(`   - Default Locale: ${defaultLocale.languageName} (${defaultLocale.localeCode})`);
    console.log(`   - Total Locales: ${await prisma.locale.count({ where: { brandId: defaultBrand.id } })}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  });
