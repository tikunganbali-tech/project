/**
 * M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP (TERKONTROL)
 * 
 * STEP 2: Klasifikasi LEGACY (AMAN)
 * 
 * Identifikasi media lama (pre-v2) yang belum tervalidasi
 * LEGACY ≠ ORPHAN (LEGACY tidak otomatis dihapus)
 */

import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Directories to scan (same as monitor API)
const MEDIA_DIRECTORIES = [
  { path: 'public/images/products', urlPrefix: '/images/products' },
  { path: 'public/images/blog', urlPrefix: '/images/blog' },
  { path: 'public/images/settings', urlPrefix: '/images/settings' },
  { path: 'public/uploads/site', urlPrefix: '/uploads/site' },
  { path: 'public/images/articles', urlPrefix: '/images/articles' },
  { path: 'public/uploads', urlPrefix: '/uploads' },
];

// V2 cutover date - adjust based on your project
// Default: 2026-01-01 (as per instructions)
const V2_CUTOVER_DATE = new Date('2026-01-01T00:00:00Z');

interface LegacyMedia {
  url: string;
  filename: string;
  size: number;
  createdAt: Date;
  path: string;
  isOrphan: boolean;
}

/**
 * Recursively scan directory for image files
 */
function scanDirectory(dirPath: string, urlPrefix: string, basePath: string): Array<{
  url: string;
  filename: string;
  size: number;
  createdAt: Date;
  filePath: string;
}> {
  const mediaItems: Array<{ url: string; filename: string; size: number; createdAt: Date; filePath: string }> = [];
  
  if (!fs.existsSync(dirPath)) {
    return mediaItems;
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        const subUrlPrefix = `${urlPrefix}/${entry.name}`;
        mediaItems.push(...scanDirectory(fullPath, subUrlPrefix, basePath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
        
        if (imageExts.includes(ext)) {
          try {
            if (!fs.existsSync(fullPath)) {
              continue;
            }
            
            const stats = fs.statSync(fullPath);
            if (!stats.isFile()) {
              continue;
            }
            
            const relativePath = path.relative(basePath, fullPath);
            let url = `/${relativePath.replace(/\\/g, '/')}`;
            // Remove /public prefix if present
            if (url.startsWith('/public/')) {
              url = url.replace('/public', '');
            }
            
            mediaItems.push({
              url,
              filename: entry.name,
              size: stats.size,
              createdAt: stats.birthtime,
              filePath: fullPath,
            });
          } catch (statError: any) {
            if (statError.code === 'ENOENT') {
              continue;
            }
            console.warn(`[M-03] Error accessing file: ${fullPath}`, statError);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[M-03] Error scanning directory ${dirPath}:`, error);
  }
  
  return mediaItems;
}

/**
 * Check if media is orphan (not used)
 */
async function isMediaOrphan(url: string): Promise<boolean> {
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
    // Also check with /public prefix
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

    return true;
  } catch (error) {
    console.error(`[M-03] Error checking usage for ${url}:`, error);
    // Safe default: assume used if error
    return false;
  }
}

/**
 * STEP 2: Classify LEGACY media
 */
async function classifyLegacyMedia(): Promise<{
  legacy: LegacyMedia[];
  legacyOrphan: LegacyMedia[];
  legacyUsed: LegacyMedia[];
}> {
  console.log('🔍 [M-03 STEP 2] Scanning media directories...');
  
  const basePath = process.cwd();
  const allMediaItems: Array<{ url: string; filename: string; size: number; createdAt: Date; filePath: string }> = [];
  
  for (const dir of MEDIA_DIRECTORIES) {
    const fullDirPath = path.join(basePath, dir.path);
    const items = scanDirectory(fullDirPath, dir.urlPrefix, basePath);
    allMediaItems.push(...items);
  }

  console.log(`📊 [M-03 STEP 2] Found ${allMediaItems.length} media files`);
  console.log(`📅 [M-03 STEP 2] V2 Cutover Date: ${V2_CUTOVER_DATE.toISOString()}`);
  console.log('🔍 [M-03 STEP 2] Classifying LEGACY media...');

  const legacyMedia: LegacyMedia[] = [];
  let checked = 0;

  for (const item of allMediaItems) {
    checked++;
    if (checked % 50 === 0) {
      console.log(`   Progress: ${checked}/${allMediaItems.length}...`);
    }

    // Check if created before V2 cutover
    if (item.createdAt < V2_CUTOVER_DATE) {
      // Verify file exists
      if (!fs.existsSync(item.filePath)) {
        continue;
      }

      // Check if orphan
      const isOrphan = await isMediaOrphan(item.url);

      legacyMedia.push({
        url: item.url,
        filename: item.filename,
        size: item.size,
        createdAt: item.createdAt,
        path: item.filePath,
        isOrphan,
      });
    }
  }

  const legacyOrphan = legacyMedia.filter(m => m.isOrphan);
  const legacyUsed = legacyMedia.filter(m => !m.isOrphan);

  return {
    legacy: legacyMedia,
    legacyOrphan,
    legacyUsed,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP');
  console.log('STEP 2: Klasifikasi LEGACY (AMAN)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    const { legacy, legacyOrphan, legacyUsed } = await classifyLegacyMedia();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 HASIL STEP 2 — KLASIFIKASI LEGACY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total LEGACY Media (created < ${V2_CUTOVER_DATE.toISOString().split('T')[0]}): ${legacy.length}`);
    console.log(`  - LEGACY + ORPHAN: ${legacyOrphan.length}`);
    console.log(`  - LEGACY + USED: ${legacyUsed.length}`);
    console.log('\n📋 Sample LEGACY Media (first 10):');
    
    legacy.slice(0, 10).forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.filename} ${item.isOrphan ? '[ORPHAN]' : '[USED]'}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Created: ${item.createdAt.toISOString()}`);
      console.log(`   Size: ${(item.size / 1024).toFixed(2)} KB`);
    });

    if (legacy.length > 10) {
      console.log(`\n... and ${legacy.length - 10} more LEGACY files`);
    }

    // Save results to file
    const resultsPath = path.join(process.cwd(), 'm-03-step2-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      v2CutoverDate: V2_CUTOVER_DATE.toISOString(),
      totalLegacy: legacy.length,
      legacyOrphan: legacyOrphan.length,
      legacyUsed: legacyUsed.length,
      legacy: legacy.map(item => ({
        url: item.url,
        filename: item.filename,
        size: item.size,
        createdAt: item.createdAt.toISOString(),
        path: item.path,
        isOrphan: item.isOrphan,
      })),
    }, null, 2));

    console.log(`\n💾 Results saved to: ${resultsPath}`);
    console.log('\n✅ STEP 2 COMPLETE — READ-ONLY, no data modified');
    console.log('⚠️  NOTE: LEGACY ≠ ORPHAN. LEGACY tidak otomatis dihapus.');

  } catch (error: any) {
    console.error('\n❌ [M-03 STEP 2] Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
