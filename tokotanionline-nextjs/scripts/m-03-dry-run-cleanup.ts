/**
 * M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP (TERKONTROL)
 * 
 * STEP 4: DRY-RUN CLEANUP (WAJIB)
 * 
 * Tandai ORPHAN tanpa hapus file
 * Tidak hapus file
 * Tidak hapus row
 * Hanya marking untuk tracking
 */

import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Load STEP 1 results
const STEP1_RESULTS_PATH = path.join(process.cwd(), 'm-03-step1-results.json');
const ORPHAN_MARKER_PATH = path.join(process.cwd(), 'm-03-orphan-markers.json');

interface Step1Result {
  timestamp: string;
  totalOrphan: number;
  orphanMedia: Array<{
    url: string;
    filename: string;
    size: number;
    createdAt: string;
    path: string;
  }>;
}

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
 * Normalize URL
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  let normalized = url.trim();
  if (normalized.startsWith('/public/')) {
    normalized = normalized.replace('/public', '');
  }
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized;
}

/**
 * Verify file still exists and is still orphan
 */
async function verifyOrphanStatus(url: string, filePath: string): Promise<boolean> {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return false; // File doesn't exist, skip
  }

  // Re-check if still orphan
  function normalizeUrlForMatching(url: string): string {
    if (!url) return '';
    let normalized = url.trim();
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  const normalizedUrl = normalizeUrlForMatching(url);
  const urlVariations = [
    normalizedUrl,
    url,
    url.startsWith('/') ? url.slice(1) : '/' + url,
    `/public${normalizedUrl}`,
    `/public${url}`,
  ];
  const uniqueUrls = Array.from(new Set(urlVariations));

  try {
    // Check Products - imageUrl
    const productsByImageUrl = await prisma.product.findFirst({
      where: {
        OR: uniqueUrls.map(u => ({ imageUrl: u })),
      },
    });
    if (productsByImageUrl) return false;

    // Check Products - images JSON array
    const productsByImages = await prisma.product.findMany({
      where: { images: { not: null } },
      select: { id: true, images: true },
    });
    
    for (const p of productsByImages) {
      if (!p.images) continue;
      try {
        const imageArray = JSON.parse(p.images);
        if (Array.isArray(imageArray) && uniqueUrls.some(u => imageArray.includes(u))) {
          return false;
        }
      } catch {
        if (p.images && uniqueUrls.some(u => p.images!.includes(u))) {
          return false;
        }
      }
    }

    // Check ProductImage table
    const productImages = await prisma.productImage.findFirst({
      where: {
        OR: uniqueUrls.map(u => ({ url: u })),
      },
    });
    if (productImages) return false;

    // Check Blog
    const blogs = await prisma.blog.findFirst({
      where: {
        OR: uniqueUrls.map(u => ({ imageUrl: u })),
      },
    });
    if (blogs) return false;

    // Check BlogPost
    const blogPosts = await prisma.blogPost.findFirst({
      where: {
        OR: uniqueUrls.map(u => ({ featuredImageUrl: u })),
      },
    });
    if (blogPosts) return false;

    // Check Blog content
    const blogsWithContent = await prisma.blog.findFirst({
      where: {
        OR: uniqueUrls.flatMap(u => [
          { content: { contains: u } },
          { excerpt: { contains: u } },
        ]),
      },
    });
    if (blogsWithContent) return false;

    // Check BlogPost content
    const blogPostsWithContent = await prisma.blogPost.findFirst({
      where: {
        OR: uniqueUrls.flatMap(u => [
          { content: { contains: u } },
          { excerpt: { contains: u } },
        ]),
      },
    });
    if (blogPostsWithContent) return false;

    return true; // Still orphan
  } catch (error) {
    console.error(`[M-03] Error verifying orphan status for ${url}:`, error);
    return false; // Safe default: assume used if error
  }
}

/**
 * STEP 4: Dry-run cleanup - Mark ORPHAN
 */
async function markOrphanMedia(): Promise<{
  marked: OrphanMarker[];
  skipped: number;
  errors: number;
}> {
  console.log('🔍 [M-03 STEP 4] Loading STEP 1 results...');
  
  if (!fs.existsSync(STEP1_RESULTS_PATH)) {
    throw new Error('STEP 1 results not found. Run STEP 1 first.');
  }

  const step1Data: Step1Result = JSON.parse(fs.readFileSync(STEP1_RESULTS_PATH, 'utf-8'));
  console.log(`✅ Loaded ${step1Data.totalOrphan} ORPHAN media from STEP 1\n`);

  const marked: OrphanMarker[] = [];
  let skipped = 0;
  let errors = 0;
  let verified = 0;

  console.log('🔍 [M-03 STEP 4] Verifying and marking ORPHAN media...');

  for (let i = 0; i < step1Data.orphanMedia.length; i++) {
    const item = step1Data.orphanMedia[i];
    
    if ((i + 1) % 20 === 0) {
      console.log(`   Progress: ${i + 1}/${step1Data.orphanMedia.length}...`);
    }

    try {
      // Verify file still exists and is still orphan
      const normalizedUrl = normalizeUrl(item.url);
      const isStillOrphan = await verifyOrphanStatus(normalizedUrl, item.path);

      if (!isStillOrphan) {
        skipped++;
        continue; // File is now used or doesn't exist
      }

      verified++;

      // Mark as ORPHAN
      const marker: OrphanMarker = {
        url: normalizedUrl,
        filename: item.filename,
        path: item.path,
        size: item.size,
        createdAt: item.createdAt,
        markedAt: new Date().toISOString(),
        status: 'ORPHAN',
        verified: true,
      };

      marked.push(marker);
    } catch (error: any) {
      console.error(`[M-03] Error processing ${item.url}:`, error.message);
      errors++;
    }
  }

  return { marked, skipped, errors };
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP');
  console.log('STEP 4: DRY-RUN CLEANUP (WAJIB)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    const { marked, skipped, errors } = await markOrphanMedia();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 HASIL STEP 4 — DRY-RUN CLEANUP');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total ORPHAN marked: ${marked.length}`);
    console.log(`Skipped (now used or missing): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('\n📋 Sample marked ORPHAN (first 10):');
    
    marked.slice(0, 10).forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.filename}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Size: ${(item.size / 1024).toFixed(2)} KB`);
      console.log(`   Created: ${item.createdAt}`);
      console.log(`   Marked: ${item.markedAt}`);
    });

    if (marked.length > 10) {
      console.log(`\n... and ${marked.length - 10} more marked ORPHAN files`);
    }

    // Save markers to file
    const markersData = {
      timestamp: new Date().toISOString(),
      totalMarked: marked.length,
      skipped,
      errors,
      markers: marked,
    };

    fs.writeFileSync(ORPHAN_MARKER_PATH, JSON.stringify(markersData, null, 2));

    console.log(`\n💾 ORPHAN markers saved to: ${ORPHAN_MARKER_PATH}`);
    console.log('\n✅ STEP 4 COMPLETE — DRY-RUN, no files deleted');
    console.log('📌 Status: ORPHAN files marked for tracking');
    console.log('📌 Next: Review markers, then proceed to STEP 5 (optional cleanup)');

    // Calculate total size
    const totalSize = marked.reduce((sum, m) => sum + m.size, 0);
    console.log(`\n📊 Total size of marked ORPHAN: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

  } catch (error: any) {
    console.error('\n❌ [M-03 STEP 4] Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
