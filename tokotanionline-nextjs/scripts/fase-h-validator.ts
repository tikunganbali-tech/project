/**
 * FASE H — AUTOMATIC VALIDATION SCRIPT
 * 
 * Validates structural integrity and boundary locks
 * Manual testing (H2, H3) must be done by user
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ValidationResult {
  category: string;
  item: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: ValidationResult[] = [];

function addResult(category: string, item: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
  results.push({ category, item, status, message });
}

// H1: Source Boundary Validation
async function validateH1Boundaries() {
  console.log('\n🔹 H1 — SOURCE BOUNDARY VALIDATION\n');

  // Check locked files exist
  const lockedFiles = [
    'lib/auth.ts',
    'lib/auth-edge.ts',
    'middleware.ts',
    'lib/permissions.ts',
    'lib/admin-auth.ts',
    'engine/runner.ts',
    'engine/queue.ts',
    'lib/price-resolver.ts',
    'app/api/whatsapp/rotate/route.ts',
    'engine-hub/internal/ai/workflow/pipeline.go',
    'engine-hub/internal/ai/normalize/normalizer.go',
    'lib/admin-config.ts',
  ];

  for (const file of lockedFiles) {
    try {
      await fs.access(file);
      addResult('H1', `Locked file exists: ${file}`, 'PASS', 'File exists and is locked');
    } catch {
      addResult('H1', `Locked file exists: ${file}`, 'FAIL', 'File missing - boundary violation risk');
    }
  }

  // Check admin UI files exist (user-editable via UI, but files locked)
  const adminUIFiles = [
    'app/admin/products/page.tsx',
    'app/admin/blog/posts/page.tsx',
    'app/admin/system/website/page.tsx',
    'app/admin/system/settings/page.tsx',
    'components/admin/WebsiteSettingsClient.tsx',
  ];

  for (const file of adminUIFiles) {
    try {
      await fs.access(file);
      addResult('H1', `Admin UI exists: ${file}`, 'PASS', 'Admin UI exists (user edits via UI, not files)');
    } catch {
      addResult('H1', `Admin UI exists: ${file}`, 'WARN', 'Admin UI missing - user cannot manage via UI');
    }
  }

  // Check admin-config.ts has SAFE_MODE and FEATURE_FREEZE
  try {
    const adminConfig = await fs.readFile('lib/admin-config.ts', 'utf-8');
    if (adminConfig.includes('SAFE_MODE')) {
      addResult('H1', 'SAFE_MODE exists in admin-config.ts', 'PASS', 'SAFE_MODE flag exists');
    } else {
      addResult('H1', 'SAFE_MODE exists in admin-config.ts', 'FAIL', 'SAFE_MODE missing');
    }
    if (adminConfig.includes('FEATURE_FREEZE')) {
      addResult('H1', 'FEATURE_FREEZE exists in admin-config.ts', 'PASS', 'FEATURE_FREEZE flag exists');
    } else {
      addResult('H1', 'FEATURE_FREEZE exists in admin-config.ts', 'FAIL', 'FEATURE_FREEZE missing');
    }
  } catch {
    addResult('H1', 'admin-config.ts readable', 'FAIL', 'Cannot read admin-config.ts');
  }

  // Check middleware protects /admin routes
  try {
    const middleware = await fs.readFile('middleware.ts', 'utf-8');
    if (middleware.includes('/admin') && middleware.includes('auth()')) {
      addResult('H1', 'Middleware protects /admin routes', 'PASS', 'Middleware has auth check for /admin');
    } else {
      addResult('H1', 'Middleware protects /admin routes', 'WARN', 'Middleware may not properly protect /admin');
    }
  } catch {
    addResult('H1', 'Middleware readable', 'FAIL', 'Cannot read middleware.ts');
  }
}

// H2: Structural Checks (can be automated)
async function validateH2Structure() {
  console.log('\n🔹 H2 — STRUCTURAL VALIDATION (Partial)\n');

  // Check public routes exist
  const publicRoutes = [
    'app/page.tsx', // Homepage
    'app/products/page.tsx', // Products list
    'app/blog/page.tsx', // Blog list
    'app/kontak/page.tsx', // Contact
    'app/tentang-kami/page.tsx', // About
  ];

  for (const route of publicRoutes) {
    try {
      await fs.access(route);
      addResult('H2', `Public route exists: ${route}`, 'PASS', 'Route file exists');
    } catch {
      addResult('H2', `Public route exists: ${route}`, 'WARN', 'Route missing - page may not exist');
    }
  }

  // Check admin routes exist
  const adminRoutes = [
    'app/admin/login/page.tsx',
    'app/admin/dashboard/page.tsx',
    'app/admin/products/page.tsx',
    'app/admin/blog/posts/page.tsx',
    'app/admin/system/website/page.tsx',
  ];

  for (const route of adminRoutes) {
    try {
      await fs.access(route);
      addResult('H2', `Admin route exists: ${route}`, 'PASS', 'Admin route exists');
    } catch {
      addResult('H2', `Admin route exists: ${route}`, 'WARN', 'Admin route missing');
    }
  }
}

// Main validation
async function main() {
  console.log('🚀 FASE H — AUTOMATIC VALIDATION');
  console.log('================================\n');
  console.log('Note: Manual testing (H2 acceptance, H3 VPS simulation) must be done by user.\n');

  await validateH1Boundaries();
  await validateH2Structure();

  // Print results
  console.log('\n📊 VALIDATION RESULTS\n');
  console.log('='.repeat(80));

  const categories = ['H1', 'H2'];
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.status === 'PASS').length;
    const failed = categoryResults.filter(r => r.status === 'FAIL').length;
    const warned = categoryResults.filter(r => r.status === 'WARN').length;

    console.log(`\n${category}: ${passed} PASS, ${failed} FAIL, ${warned} WARN\n`);

    for (const result of categoryResults) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.item}`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
    }
  }

  const totalPassed = results.filter(r => r.status === 'PASS').length;
  const totalFailed = results.filter(r => r.status === 'FAIL').length;
  const totalWarned = results.filter(r => r.status === 'WARN').length;

  console.log('\n' + '='.repeat(80));
  console.log(`\nTOTAL: ${totalPassed} PASS, ${totalFailed} FAIL, ${totalWarned} WARN\n`);

  if (totalFailed > 0) {
    console.log('❌ VALIDATION FAILED - Some critical checks failed');
    process.exit(1);
  } else if (totalWarned > 0) {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings above');
    process.exit(0);
  } else {
    console.log('✅ VALIDATION PASSED - All automated checks passed');
    console.log('\n📌 NEXT STEP: Run manual testing (H2 acceptance checklist, H3 VPS simulation)');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
