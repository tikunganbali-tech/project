/**
 * SYSTEM INTEGRITY AUDIT SCRIPT
 * 
 * FASE DARURAT - System Integrity Recovery
 * 
 * Audit semua menu, route, form, dan data sync
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MenuAudit {
  label: string;
  href: string;
  status: 'active' | 'read-only' | 'coming-soon';
  routeExists: boolean;
  authIssue: boolean;
  actualResult: string;
}

interface FormFieldAudit {
  form: string;
  field: string;
  usedInLogic: boolean;
  usedInEngine: boolean;
  status: 'ACTIVE' | 'UNUSED' | 'DUMMY';
}

async function auditSidebarMenus(): Promise<MenuAudit[]> {
  const menus: MenuAudit[] = [
    // CORE
    { label: 'Dashboard', href: '/admin/dashboard', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Produk', href: '/admin/products', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Kategori', href: '/admin/categories', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Konten (Blog)', href: '/admin/blog/posts', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Media Library', href: '/admin/media', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Scheduler', href: '/admin/scheduler', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Insight', href: '/admin/insight', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Cross-Brand Insights', href: '/admin/insights', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Aktivitas', href: '/admin/activity', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    // MONITOR
    { label: 'Content Health', href: '/admin/content-health', status: 'read-only', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Media Monitor', href: '/admin/media/monitor', status: 'read-only', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'SEO Monitor', href: '/admin/seo/monitor', status: 'read-only', routeExists: false, authIssue: false, actualResult: '' },
    // MARKETING
    { label: 'CTA Management', href: '/admin/cta', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Ads Intelligence', href: '/admin/ads-intelligence', status: 'read-only', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Strategy Brief', href: '/admin/ads/strategy-brief', status: 'read-only', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Growth Insight', href: '/admin/growth-insight', status: 'read-only', routeExists: false, authIssue: false, actualResult: '' },
    // ENGINE CENTER
    { label: 'Engine Status', href: '/admin/engine', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Engine Jobs', href: '/admin/engine/jobs', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Engine Logs', href: '/admin/engine/logs', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Engine Insight', href: '/admin/engine/insight', status: 'read-only', routeExists: false, authIssue: false, actualResult: '' },
    // SYSTEM
    { label: 'Admin & Role', href: '/admin/system/admins', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Sales Admins', href: '/admin/system/sales-admins', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Website Settings', href: '/admin/system/website', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'Integrations', href: '/admin/system/integrations', status: 'read-only', routeExists: false, authIssue: false, actualResult: '' },
    { label: 'System Settings', href: '/admin/system/settings', status: 'active', routeExists: false, authIssue: false, actualResult: '' },
  ];

  // Check route existence (simplified - actual check would require file system access)
  // This is a template - actual implementation would check file existence
  
  return menus;
}

async function disableAutoTriggers() {
  console.log('🟥 LANGKAH 1: Disabling Auto-Triggers...\n');

  try {
    // 1. Disable Scheduler
    const schedulerConfig = await prisma.schedulerConfig.findFirst();
    if (schedulerConfig && schedulerConfig.enabled) {
      await prisma.schedulerConfig.update({
        where: { id: schedulerConfig.id },
        data: { enabled: false },
      });
      console.log('✅ Scheduler disabled');
    } else {
      console.log('✅ Scheduler already disabled');
    }

    // 2. Disable AI Auto-generation
    const aiSettings = await prisma.aIContentSettings.findFirst();
    if (aiSettings && aiSettings.isActive) {
      await prisma.aIContentSettings.update({
        where: { id: aiSettings.id },
        data: { isActive: false },
      });
      console.log('✅ AI Auto-generation disabled');
    } else {
      console.log('✅ AI Auto-generation already disabled');
    }

    // 3. Disable SEO Auto-scoring (if exists in settings)
    // Note: SEO auto-worker already removed per codebase
    
    console.log('\n✅ All auto-triggers disabled\n');
  } catch (error: any) {
    console.error('❌ Error disabling auto-triggers:', error.message);
  }
}

async function generateAuditReport() {
  console.log('📋 SYSTEM INTEGRITY REPORT\n');
  console.log('='.repeat(60));

  // 1. Sidebar Audit
  const menus = await auditSidebarMenus();
  const totalMenus = menus.length;
  const workingMenus = menus.filter(m => m.routeExists && !m.authIssue).length;
  const brokenMenus = menus.filter(m => !m.routeExists || m.authIssue).length;
  const dummyMenus = menus.filter(m => m.status === 'coming-soon').length;

  console.log('\n1. SIDEBAR AUDIT');
  console.log(`   - Total menu: ${totalMenus}`);
  console.log(`   - Menu berfungsi: ${workingMenus}`);
  console.log(`   - Menu broken: ${brokenMenus}`);
  console.log(`   - Menu dummy/dev: ${dummyMenus}`);

  // 2. Auto-Triggers Status
  console.log('\n2. AUTO-TRIGGERS STATUS');
  const scheduler = await prisma.schedulerConfig.findFirst();
  const aiSettings = await prisma.aIContentSettings.findFirst();
  console.log(`   - Scheduler: ${scheduler?.enabled ? 'ENABLED ❌' : 'DISABLED ✅'}`);
  console.log(`   - AI Auto-generation: ${aiSettings?.isActive ? 'ENABLED ❌' : 'DISABLED ✅'}`);
  console.log(`   - SEO Auto-scoring: DISABLED ✅ (removed)`);

  // 3. Data Sync Check
  console.log('\n3. DATA SYNC CHECK');
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const blogPosts = await prisma.blogPost.findMany({
    select: { id: true, unifiedCategoryId: true },
    take: 10,
  });
  const products = await prisma.product.findMany({
    select: { id: true, unifiedCategoryId: true },
    take: 10,
  });

  const blogWithCategory = blogPosts.filter(b => b.unifiedCategoryId).length;
  const productWithCategory = products.filter(p => p.unifiedCategoryId).length;

  console.log(`   - Total categories: ${categories.length}`);
  console.log(`   - Blog posts with category: ${blogWithCategory}/${blogPosts.length}`);
  console.log(`   - Products with category: ${productWithCategory}/${products.length}`);
  console.log(`   - Category sync admin-blog: ${blogWithCategory > 0 ? 'YA ✅' : 'TIDAK ❌'}`);
  console.log(`   - Category sync admin-product: ${productWithCategory > 0 ? 'YA ✅' : 'TIDAK ❌'}`);

  console.log('\n' + '='.repeat(60));
  console.log('\nSTATUS:');
  if (scheduler?.enabled || aiSettings?.isActive) {
    console.log('❌ SISTEM BELUM SIAP - Auto-triggers masih aktif');
  } else if (brokenMenus > 0) {
    console.log('⚠️  SISTEM PERLU PERBAIKAN - Ada menu broken');
  } else {
    console.log('✅ SISTEM SIAP DILANJUTKAN');
  }
}

async function main() {
  try {
    await disableAutoTriggers();
    await generateAuditReport();
  } catch (error: any) {
    console.error('❌ Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
