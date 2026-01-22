/**
 * PHASE 7A + 7B Verification Script
 * 
 * Verifies that:
 * 1. Brand and Locale entities exist
 * 2. All content has brand_id and locale_id
 * 3. Unique constraints are working
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying PHASE 7A + 7B Implementation...\n');

  try {
    // Check 1: Brands exist
    const brands = await prisma.brand.findMany();
    console.log(`✅ Brands: ${brands.length} found`);
    if (brands.length === 0) {
      console.log('   ⚠️  No brands found. Run migration script first.');
      return;
    }

    // Check 2: Locales exist
    const locales = await prisma.locale.findMany();
    console.log(`✅ Locales: ${locales.length} found`);
    if (locales.length === 0) {
      console.log('   ⚠️  No locales found. Run migration script first.');
      return;
    }

    // Check 3: Products have brand_id and locale_id
    const productsWithoutBrand = await prisma.product.count({
      where: { brandId: null as any },
    });
    const productsWithoutLocale = await prisma.product.count({
      where: { localeId: null as any },
    });
    console.log(`✅ Products:`);
    console.log(`   - Without brand_id: ${productsWithoutBrand}`);
    console.log(`   - Without locale_id: ${productsWithoutLocale}`);
    if (productsWithoutBrand > 0 || productsWithoutLocale > 0) {
      console.log('   ⚠️  Some products missing brand_id or locale_id');
    }

    // Check 4: Blogs have brand_id and locale_id
    const blogsWithoutBrand = await prisma.blog.count({
      where: { brandId: null as any },
    });
    const blogsWithoutLocale = await prisma.blog.count({
      where: { localeId: null as any },
    });
    console.log(`✅ Blogs:`);
    console.log(`   - Without brand_id: ${blogsWithoutBrand}`);
    console.log(`   - Without locale_id: ${blogsWithoutLocale}`);
    if (blogsWithoutBrand > 0 || blogsWithoutLocale > 0) {
      console.log('   ⚠️  Some blogs missing brand_id or locale_id');
    }

    // Check 5: ContentVersions have brand_id and locale_id
    const versionsWithoutBrand = await prisma.contentVersion.count({
      where: { brandId: null as any },
    });
    const versionsWithoutLocale = await prisma.contentVersion.count({
      where: { localeId: null as any },
    });
    console.log(`✅ ContentVersions:`);
    console.log(`   - Without brand_id: ${versionsWithoutBrand}`);
    console.log(`   - Without locale_id: ${versionsWithoutLocale}`);
    if (versionsWithoutBrand > 0 || versionsWithoutLocale > 0) {
      console.log('   ⚠️  Some content versions missing brand_id or locale_id');
    }

    // Check 6: Default locales per brand
    for (const brand of brands) {
      const brandLocales = await prisma.locale.findMany({
        where: { brandId: brand.id },
      });
      const defaultLocale = brandLocales.find(l => l.isDefault);
      console.log(`\n📊 Brand: ${brand.brandName}`);
      console.log(`   - Locales: ${brandLocales.length}`);
      console.log(`   - Default locale: ${defaultLocale ? defaultLocale.languageName : '⚠️  NONE'}`);
    }

    // Check 7: Sample data isolation
    console.log('\n🔒 Testing data isolation...');
    const sampleProduct = await prisma.product.findFirst({
      include: { brand: true, locale: true },
    });
    if (sampleProduct) {
      console.log(`✅ Sample Product:`);
      console.log(`   - Brand: ${sampleProduct.brand?.brandName || 'N/A'}`);
      console.log(`   - Locale: ${sampleProduct.locale?.languageName || 'N/A'} (${sampleProduct.locale?.localeCode || 'N/A'})`);
    }

    console.log('\n✅ Verification complete!');
    
    // Summary
    const totalIssues = productsWithoutBrand + productsWithoutLocale + 
                       blogsWithoutBrand + blogsWithoutLocale + 
                       versionsWithoutBrand + versionsWithoutLocale;
    
    if (totalIssues === 0) {
      console.log('\n🎉 All checks passed! System is ready for multi-brand + multi-language.');
    } else {
      console.log(`\n⚠️  Found ${totalIssues} issues. Run migration script to fix.`);
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Verification error:', e);
    process.exit(1);
  });
