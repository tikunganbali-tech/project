/**
 * DATABASE AUDIT & NORMALIZATION SCRIPT
 * Validates critical tables and data integrity
 * Run: npx tsx scripts/db-audit.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditResult {
  prismaStudio: 'OK' | 'ERROR';
  environment: string;
  databaseName: string;
  siteSettings: {
    rowCount: number;
    status: 'OK' | 'ERROR';
    errors: string[];
  };
  product: {
    statusNull: 'ADA' | 'TIDAK';
    slugIssue: 'ADA' | 'TIDAK';
    priceNull: 'ADA' | 'TIDAK';
    categoryIssue: 'ADA' | 'TIDAK';
    errors: string[];
  };
  category: {
    depthIssue: 'ADA' | 'TIDAK';
    circularIssue: 'ADA' | 'TIDAK';
    slugIssue: 'ADA' | 'TIDAK';
    errors: string[];
  };
  blogPost: {
    statusNull: 'ADA' | 'TIDAK';
    slugIssue: 'ADA' | 'TIDAK';
    publishedAtIssue: 'ADA' | 'TIDAK';
    errors: string[];
  };
  admin: {
    superAdminExists: 'YA' | 'TIDAK';
    roleNull: 'ADA' | 'TIDAK';
    errors: string[];
  };
  anomalies: string[];
}

async function auditDatabase(): Promise<AuditResult> {
  const result: AuditResult = {
    prismaStudio: 'OK',
    environment: '',
    databaseName: '',
    siteSettings: {
      rowCount: 0,
      status: 'OK',
      errors: [],
    },
    product: {
      statusNull: 'TIDAK',
      slugIssue: 'TIDAK',
      priceNull: 'TIDAK',
      categoryIssue: 'TIDAK',
      errors: [],
    },
    category: {
      depthIssue: 'TIDAK',
      circularIssue: 'TIDAK',
      slugIssue: 'TIDAK',
      errors: [],
    },
    blogPost: {
      statusNull: 'TIDAK',
      slugIssue: 'TIDAK',
      publishedAtIssue: 'TIDAK',
      errors: [],
    },
    admin: {
      superAdminExists: 'TIDAK',
      roleNull: 'TIDAK',
      errors: [],
    },
    anomalies: [],
  };

  try {
    // Get environment info
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('.env.local')) {
      result.environment = '.env.local';
    } else if (dbUrl.includes('.env')) {
      result.environment = '.env';
    } else {
      result.environment = 'environment variable';
    }

    // Extract database name from connection string
    const dbMatch = dbUrl.match(/\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (dbMatch) {
      result.databaseName = dbMatch[5];
    } else {
      const dbMatch2 = dbUrl.match(/\/\/([^\/]+)\/(.+)/);
      if (dbMatch2) {
        result.databaseName = dbMatch2[2];
      }
    }

    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // ============================================
    // 1. SITE SETTINGS AUDIT
    // ============================================
    console.log('🔍 Auditing SiteSettings...');
    const siteSettings = await prisma.siteSettings.findMany();
    result.siteSettings.rowCount = siteSettings.length;

    if (siteSettings.length === 0) {
      result.siteSettings.status = 'ERROR';
      result.siteSettings.errors.push('TIDAK ADA ROW - ERROR KRITIS');
    } else if (siteSettings.length > 1) {
      result.siteSettings.status = 'ERROR';
      result.siteSettings.errors.push(`LEBIH DARI 1 ROW (${siteSettings.length}) - ERROR KRITIS`);
    } else {
      const settings = siteSettings[0];
      const requiredFields = [
        'siteTitle',
        'tagline',
        'logoLight',
        'logoDark',
        'favicon',
        'heroTitle',
        'heroSubtitle',
        'aboutContent',
        'contactContent',
        'footerText',
      ];

      for (const field of requiredFields) {
        if (settings[field as keyof typeof settings] === null) {
          result.siteSettings.errors.push(`Field ${field} adalah NULL (harus ada, boleh string kosong)`);
        }
      }

      if (result.siteSettings.errors.length > 0) {
        result.siteSettings.status = 'ERROR';
      }
    }

    // ============================================
    // 2. PRODUCT AUDIT
    // ============================================
    console.log('🔍 Auditing Product...');
    const products = await prisma.product.findMany({
      select: {
        id: true,
        slug: true,
        status: true,
        price: true,
        categoryId: true,
        subCategoryId: true,
      },
    });

    // Check status null
    const productsWithNullStatus = products.filter((p) => p.status === null);
    if (productsWithNullStatus.length > 0) {
      result.product.statusNull = 'ADA';
      result.product.errors.push(`${productsWithNullStatus.length} produk dengan status NULL`);
    }

    // Check invalid status values
    const invalidStatus = products.filter(
      (p) => p.status !== null && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(p.status)
    );
    if (invalidStatus.length > 0) {
      result.product.errors.push(`${invalidStatus.length} produk dengan status tidak valid`);
    }

    // Check slug issues
    const emptySlugs = products.filter((p) => !p.slug || p.slug.trim() === '');
    if (emptySlugs.length > 0) {
      result.product.slugIssue = 'ADA';
      result.product.errors.push(`${emptySlugs.length} produk dengan slug kosong`);
    }

    // Check duplicate slugs
    const slugCounts = new Map<string, number>();
    products.forEach((p) => {
      if (p.slug) {
        slugCounts.set(p.slug, (slugCounts.get(p.slug) || 0) + 1);
      }
    });
    const duplicateSlugs = Array.from(slugCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicateSlugs.length > 0) {
      result.product.slugIssue = 'ADA';
      result.product.errors.push(`${duplicateSlugs.length} slug duplikat ditemukan`);
    }

    // Check price null
    const productsWithNullPrice = products.filter((p) => p.price === null);
    if (productsWithNullPrice.length > 0) {
      result.product.priceNull = 'ADA';
      result.product.errors.push(`${productsWithNullPrice.length} produk dengan price NULL`);
    }

    // Check category references
    const categoryIds = new Set(
      (await prisma.productCategory.findMany({ select: { id: true } })).map((c) => c.id)
    );
    const invalidCategoryIds = products.filter(
      (p) => p.categoryId && !categoryIds.has(p.categoryId)
    );
    const invalidSubCategoryIds = products.filter(
      (p) => p.subCategoryId && !categoryIds.has(p.subCategoryId)
    );
    if (invalidCategoryIds.length > 0 || invalidSubCategoryIds.length > 0) {
      result.product.categoryIssue = 'ADA';
      result.product.errors.push(
        `${invalidCategoryIds.length + invalidSubCategoryIds.length} produk dengan categoryId/subCategoryId tidak valid`
      );
    }

    // ============================================
    // 3. PRODUCT CATEGORY AUDIT
    // ============================================
    console.log('🔍 Auditing ProductCategory...');
    const categories = await prisma.productCategory.findMany({
      select: {
        id: true,
        slug: true,
        parentId: true,
      },
    });

    // Check slug issues
    const emptyCategorySlugs = categories.filter((c) => !c.slug || c.slug.trim() === '');
    if (emptyCategorySlugs.length > 0) {
      result.category.slugIssue = 'ADA';
      result.category.errors.push(`${emptyCategorySlugs.length} kategori dengan slug kosong`);
    }

    // Check duplicate slugs
    const categorySlugCounts = new Map<string, number>();
    categories.forEach((c) => {
      if (c.slug) {
        categorySlugCounts.set(c.slug, (categorySlugCounts.get(c.slug) || 0) + 1);
      }
    });
    const duplicateCategorySlugs = Array.from(categorySlugCounts.entries()).filter(
      ([_, count]) => count > 1
    );
    if (duplicateCategorySlugs.length > 0) {
      result.category.slugIssue = 'ADA';
      result.category.errors.push(`${duplicateCategorySlugs.length} slug kategori duplikat`);
    }

    // Check depth > 2 and circular references
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    let maxDepth = 0;
    const visited = new Set<string>();
    const checking = new Set<string>();

    const checkDepth = (categoryId: string, depth: number): { depth: number; circular: boolean } => {
      if (checking.has(categoryId)) {
        return { depth, circular: true };
      }
      if (visited.has(categoryId)) {
        return { depth: 0, circular: false };
      }

      checking.add(categoryId);
      const category = categoryMap.get(categoryId);
      if (!category || !category.parentId) {
        checking.delete(categoryId);
        visited.add(categoryId);
        return { depth, circular: false };
      }

      const result = checkDepth(category.parentId, depth + 1);
      checking.delete(categoryId);
      visited.add(categoryId);
      return { depth: Math.max(depth, result.depth), circular: result.circular };
    }

    for (const category of categories) {
      if (category.parentId) {
        const { depth, circular } = checkDepth(category.id, 1);
        maxDepth = Math.max(maxDepth, depth);
        if (circular) {
          result.category.circularIssue = 'ADA';
          result.category.errors.push(`Circular reference ditemukan di kategori ${category.id}`);
        }
      }
    }

    if (maxDepth > 2) {
      result.category.depthIssue = 'ADA';
      result.category.errors.push(`Depth > 2 ditemukan (max depth: ${maxDepth})`);
    }

    // ============================================
    // 4. BLOG POST AUDIT
    // ============================================
    console.log('🔍 Auditing BlogPost...');
    const blogPosts = await prisma.blogPost.findMany({
      select: {
        id: true,
        slug: true,
        status: true,
        publishedAt: true,
      },
    });

    // Check status null (should not happen with enum, but check anyway)
    const postsWithNullStatus = blogPosts.filter((p) => p.status === null);
    if (postsWithNullStatus.length > 0) {
      result.blogPost.statusNull = 'ADA';
      result.blogPost.errors.push(`${postsWithNullStatus.length} post dengan status NULL`);
    }

    // Check invalid status values
    const invalidPostStatus = blogPosts.filter(
      (p) => !['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(p.status)
    );
    if (invalidPostStatus.length > 0) {
      result.blogPost.errors.push(`${invalidPostStatus.length} post dengan status tidak valid`);
    }

    // Check slug issues
    const emptyPostSlugs = blogPosts.filter((p) => !p.slug || p.slug.trim() === '');
    if (emptyPostSlugs.length > 0) {
      result.blogPost.slugIssue = 'ADA';
      result.blogPost.errors.push(`${emptyPostSlugs.length} post dengan slug kosong`);
    }

    // Check duplicate slugs
    const postSlugCounts = new Map<string, number>();
    blogPosts.forEach((p) => {
      if (p.slug) {
        postSlugCounts.set(p.slug, (postSlugCounts.get(p.slug) || 0) + 1);
      }
    });
    const duplicatePostSlugs = Array.from(postSlugCounts.entries()).filter(
      ([_, count]) => count > 1
    );
    if (duplicatePostSlugs.length > 0) {
      result.blogPost.slugIssue = 'ADA';
      result.blogPost.errors.push(`${duplicatePostSlugs.length} slug post duplikat`);
    }

    // Check publishedAt logic
    const publishedPostsWithoutDate = blogPosts.filter(
      (p) => p.status === 'PUBLISHED' && p.publishedAt === null
    );
    const unpublishedPostsWithDate = blogPosts.filter(
      (p) => p.status !== 'PUBLISHED' && p.publishedAt !== null
    );
    if (publishedPostsWithoutDate.length > 0 || unpublishedPostsWithDate.length > 0) {
      result.blogPost.publishedAtIssue = 'ADA';
      if (publishedPostsWithoutDate.length > 0) {
        result.blogPost.errors.push(
          `${publishedPostsWithoutDate.length} post PUBLISHED tanpa publishedAt`
        );
      }
      if (unpublishedPostsWithDate.length > 0) {
        result.blogPost.errors.push(
          `${unpublishedPostsWithDate.length} post non-PUBLISHED dengan publishedAt`
        );
      }
    }

    // ============================================
    // 5. ADMIN (USER) AUDIT
    // ============================================
    console.log('🔍 Auditing Admin...');
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // Check for super_admin
    const superAdmins = admins.filter((a) => a.role === 'super_admin');
    if (superAdmins.length > 0) {
      result.admin.superAdminExists = 'YA';
    } else {
      result.admin.errors.push('TIDAK ADA super_admin - ERROR KRITIS');
    }

    // Check role null (should not happen with default, but check)
    const adminsWithNullRole = admins.filter((a) => !a.role || a.role.trim() === '');
    if (adminsWithNullRole.length > 0) {
      result.admin.roleNull = 'ADA';
      result.admin.errors.push(`${adminsWithNullRole.length} admin dengan role NULL/kosong`);
    }

    // Check invalid roles
    const invalidRoles = admins.filter(
      (a) => !['super_admin', 'content_admin', 'marketing_admin'].includes(a.role)
    );
    if (invalidRoles.length > 0) {
      result.admin.errors.push(`${invalidRoles.length} admin dengan role tidak valid`);
    }

    // ============================================
    // 6. GENERAL ANOMALIES
    // ============================================
    console.log('🔍 Checking for general anomalies...');

    // Check for test/dummy data (heuristic: contains "test", "dummy", "example")
    const testProducts = products.filter(
      (p) =>
        p.slug?.toLowerCase().includes('test') ||
        p.slug?.toLowerCase().includes('dummy') ||
        p.slug?.toLowerCase().includes('example')
    );
    if (testProducts.length > 0) {
      result.anomalies.push(`${testProducts.length} produk dengan slug mengandung "test/dummy/example"`);
    }

    const testPosts = blogPosts.filter(
      (p) =>
        p.slug?.toLowerCase().includes('test') ||
        p.slug?.toLowerCase().includes('dummy') ||
        p.slug?.toLowerCase().includes('example')
    );
    if (testPosts.length > 0) {
      result.anomalies.push(`${testPosts.length} post dengan slug mengandung "test/dummy/example"`);
    }

    console.log('\n✅ Audit completed\n');

    return result;
  } catch (error: any) {
    console.error('❌ Audit failed:', error.message);
    result.prismaStudio = 'ERROR';
    result.anomalies.push(`Audit error: ${error.message}`);
    return result;
  } finally {
    await prisma.$disconnect();
  }
}

// Run audit and print results
async function main() {
  const result = await auditDatabase();

  console.log('='.repeat(60));
  console.log('DB AUDIT RESULT:');
  console.log('='.repeat(60));
  console.log(`- Prisma Studio: ${result.prismaStudio}`);
  console.log(`- Environment: ${result.environment}`);
  console.log(`- Database name: ${result.databaseName || 'N/A'}`);
  console.log(`- SiteSettings:`);
  console.log(`  - Row count: ${result.siteSettings.rowCount}`);
  console.log(`  - Status: ${result.siteSettings.status}`);
  if (result.siteSettings.errors.length > 0) {
    result.siteSettings.errors.forEach((err) => console.log(`    ⚠️  ${err}`));
  }
  console.log(`- Product:`);
  console.log(`  - Status null: ${result.product.statusNull}`);
  console.log(`  - Slug issue: ${result.product.slugIssue}`);
  console.log(`  - Price null: ${result.product.priceNull}`);
  console.log(`  - Category issue: ${result.product.categoryIssue}`);
  if (result.product.errors.length > 0) {
    result.product.errors.forEach((err) => console.log(`    ⚠️  ${err}`));
  }
  console.log(`- Category:`);
  console.log(`  - Depth > 2: ${result.category.depthIssue}`);
  console.log(`  - Circular: ${result.category.circularIssue}`);
  console.log(`  - Slug issue: ${result.category.slugIssue}`);
  if (result.category.errors.length > 0) {
    result.category.errors.forEach((err) => console.log(`    ⚠️  ${err}`));
  }
  console.log(`- BlogPost:`);
  console.log(`  - Status null: ${result.blogPost.statusNull}`);
  console.log(`  - Slug issue: ${result.blogPost.slugIssue}`);
  console.log(`  - PublishedAt issue: ${result.blogPost.publishedAtIssue}`);
  if (result.blogPost.errors.length > 0) {
    result.blogPost.errors.forEach((err) => console.log(`    ⚠️  ${err}`));
  }
  console.log(`- Admin:`);
  console.log(`  - super_admin exists: ${result.admin.superAdminExists}`);
  console.log(`  - Role null: ${result.admin.roleNull}`);
  if (result.admin.errors.length > 0) {
    result.admin.errors.forEach((err) => console.log(`    ⚠️  ${err}`));
  }
  console.log(`- Anomali lain:`);
  if (result.anomalies.length > 0) {
    result.anomalies.forEach((anom) => console.log(`  - ${anom}`));
  } else {
    console.log(`  - (tidak ada)`);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
