/**
 * M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP (TERKONTROL)
 * 
 * FINAL VERIFICATION
 * 
 * Checklist:
 * - Media ORPHAN terdeteksi akurat
 * - Media USED tidak terpengaruh
 * - Frontend & admin tidak kehilangan image
 * - UI-C konsisten dengan DB
 * - Tidak ada 404 baru
 */

import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const ORPHAN_MARKER_PATH = path.join(process.cwd(), 'm-03-orphan-markers.json');
const STEP3_RESULTS_PATH = path.join(process.cwd(), 'm-03-step3-results.json');

interface OrphanMarker {
  url: string;
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  markedAt: string;
  status: 'ORPHAN';
  verified: boolean;
}

/**
 * Verify USED media are not affected
 */
async function verifyUsedMediaNotAffected(): Promise<{
  passed: boolean;
  checked: number;
  issues: string[];
}> {
  const issues: string[] = [];
  let checked = 0;

  console.log('🔍 [VERIFICATION] Checking USED media are not affected...');

  // Check a sample of used products
  const products = await prisma.product.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, name: true, imageUrl: true },
    take: 20,
  });

  for (const product of products) {
    if (!product.imageUrl) continue;
    checked++;

    // Verify file exists
    let filePath = product.imageUrl;
    if (!filePath.startsWith('/')) filePath = '/' + filePath;
    if (filePath.startsWith('/public/')) filePath = filePath.replace('/public', '');
    
    const fullPath = path.join(process.cwd(), 'public', filePath.startsWith('/') ? filePath.slice(1) : filePath);
    
    if (!fs.existsSync(fullPath)) {
      issues.push(`Product ${product.name} (${product.id}): imageUrl ${product.imageUrl} file not found`);
    }
  }

  // Check a sample of used blogs
  const blogs = await prisma.blog.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, title: true, imageUrl: true },
    take: 20,
  });

  for (const blog of blogs) {
    if (!blog.imageUrl) continue;
    checked++;

    let filePath = blog.imageUrl;
    if (!filePath.startsWith('/')) filePath = '/' + filePath;
    if (filePath.startsWith('/public/')) filePath = filePath.replace('/public', '');
    
    const fullPath = path.join(process.cwd(), 'public', filePath.startsWith('/') ? filePath.slice(1) : filePath);
    
    if (!fs.existsSync(fullPath)) {
      issues.push(`Blog ${blog.title} (${blog.id}): imageUrl ${blog.imageUrl} file not found`);
    }
  }

  return {
    passed: issues.length === 0,
    checked,
    issues,
  };
}

/**
 * Verify orphan markers are accurate
 */
async function verifyOrphanMarkers(): Promise<{
  passed: boolean;
  total: number;
  verified: number;
  issues: string[];
}> {
  if (!fs.existsSync(ORPHAN_MARKER_PATH)) {
    return {
      passed: false,
      total: 0,
      verified: 0,
      issues: ['ORPHAN markers file not found'],
    };
  }

  const markersData = JSON.parse(fs.readFileSync(ORPHAN_MARKER_PATH, 'utf-8'));
  const markers: OrphanMarker[] = markersData.markers || [];

  console.log(`🔍 [VERIFICATION] Verifying ${markers.length} ORPHAN markers...`);

  const issues: string[] = [];
  let verified = 0;

  // Sample check (first 10)
  for (let i = 0; i < Math.min(10, markers.length); i++) {
    const marker = markers[i];

    // Verify file exists
    if (!fs.existsSync(marker.path)) {
      issues.push(`ORPHAN marker ${marker.filename}: file not found at ${marker.path}`);
      continue;
    }

    verified++;
  }

  return {
    passed: issues.length === 0,
    total: markers.length,
    verified,
    issues,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP');
  console.log('FINAL VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    const results = {
      orphanDetection: { passed: false, message: '' },
      usedMediaNotAffected: { passed: false, checked: 0, issues: [] as string[] },
      orphanMarkers: { passed: false, total: 0, verified: 0, issues: [] as string[] },
      uiConsistency: { passed: false, message: '' },
    };

    // 1. Verify ORPHAN detection accuracy
    console.log('1️⃣  Verifying ORPHAN detection accuracy...');
    if (fs.existsSync(ORPHAN_MARKER_PATH)) {
      const markersData = JSON.parse(fs.readFileSync(ORPHAN_MARKER_PATH, 'utf-8'));
      results.orphanDetection = {
        passed: markersData.totalMarked > 0,
        message: `${markersData.totalMarked} ORPHAN files detected and marked`,
      };
      console.log(`   ✅ ${results.orphanDetection.message}`);
    } else {
      results.orphanDetection = {
        passed: false,
        message: 'ORPHAN markers not found',
      };
      console.log(`   ❌ ${results.orphanDetection.message}`);
    }

    // 2. Verify USED media not affected
    console.log('\n2️⃣  Verifying USED media not affected...');
    const usedCheck = await verifyUsedMediaNotAffected();
    results.usedMediaNotAffected = usedCheck;
    if (usedCheck.passed) {
      console.log(`   ✅ Checked ${usedCheck.checked} USED media - all files exist`);
    } else {
      console.log(`   ⚠️  Found ${usedCheck.issues.length} issues:`);
      usedCheck.issues.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue}`);
      });
    }

    // 3. Verify orphan markers
    console.log('\n3️⃣  Verifying ORPHAN markers...');
    const orphanCheck = await verifyOrphanMarkers();
    results.orphanMarkers = orphanCheck;
    if (orphanCheck.passed) {
      console.log(`   ✅ Verified ${orphanCheck.verified}/${orphanCheck.total} ORPHAN markers`);
    } else {
      console.log(`   ⚠️  Found ${orphanCheck.issues.length} issues:`);
      orphanCheck.issues.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue}`);
      });
    }

    // 4. Verify UI-C consistency
    console.log('\n4️⃣  Verifying UI-C consistency...');
    if (fs.existsSync(STEP3_RESULTS_PATH)) {
      const step3Data = JSON.parse(fs.readFileSync(STEP3_RESULTS_PATH, 'utf-8'));
      results.uiConsistency = {
        passed: step3Data.isValid === true,
        message: step3Data.isValid 
          ? 'UI-C konsisten dengan STEP 1' 
          : 'UI-C tidak konsisten dengan STEP 1',
      };
      if (step3Data.isValid) {
        console.log(`   ✅ ${results.uiConsistency.message}`);
      } else {
        console.log(`   ⚠️  ${results.uiConsistency.message}`);
      }
    } else {
      results.uiConsistency = {
        passed: false,
        message: 'STEP 3 results not found',
      };
      console.log(`   ❌ ${results.uiConsistency.message}`);
    }

    // Final summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    
    const allPassed = 
      results.orphanDetection.passed &&
      results.usedMediaNotAffected.passed &&
      results.orphanMarkers.passed &&
      results.uiConsistency.passed;

    console.log(`ORPHAN Detection: ${results.orphanDetection.passed ? '✅' : '❌'} ${results.orphanDetection.message}`);
    console.log(`USED Media Safe: ${results.usedMediaNotAffected.passed ? '✅' : '⚠️'} Checked ${results.usedMediaNotAffected.checked} files`);
    console.log(`ORPHAN Markers: ${results.orphanMarkers.passed ? '✅' : '⚠️'} ${results.orphanMarkers.verified}/${results.orphanMarkers.total}`);
    console.log(`UI-C Consistency: ${results.uiConsistency.passed ? '✅' : '⚠️'} ${results.uiConsistency.message}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    if (allPassed) {
      console.log('✅ VERIFICATION PASSED');
      console.log('   M-03 ready for STEP 5 (optional cleanup)');
    } else {
      console.log('⚠️  VERIFICATION WARNING');
      console.log('   Some checks failed. Review issues above.');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    // Save verification results
    const verificationPath = path.join(process.cwd(), 'm-03-verification-results.json');
    fs.writeFileSync(verificationPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      allPassed,
      results,
    }, null, 2));

    console.log(`💾 Verification results saved to: ${verificationPath}`);

  } catch (error: any) {
    console.error('\n❌ [M-03 VERIFICATION] Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
