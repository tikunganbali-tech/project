/**
 * M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP (TERKONTROL)
 * 
 * STEP 1: Query deteksi ORPHAN (READ-ONLY)
 * 
 * Identifikasi media yang tidak dipakai blog & product
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

interface OrphanMedia {
  url: string;
  filename: string;
  size: number;
  createdAt: Date;
  path: string;
}

/**
 * Normalize URL for matching
 */
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

/**
 * Check if media URL is used in database
 */
async function isMediaUsed(url: string): Promise<boolean> {
  const normalizedUrl = normalizeUrlForMatching(url);
  const urlVariations = [
    normalizedUrl,
    url,
    url.startsWith('/') ? url.slice(1) : '/' + url,
    // Also check with /public prefix (legacy paths)
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
    if (productsByImageUrl) return true;

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
          return true;
        }
      } catch {
        if (p.images && uniqueUrls.some(u => p.images!.includes(u))) {
          return true;
        }
      }
    }

    // Check ProductImage table
    const productImages = await prisma.productImage.findFirst({
      where: {
        OR: uniqueUrls.map(u => ({ url: u })),
      },
    });
    if (productImages) return true;

    // Check Blog
    const blogs = await prisma.blog.findFirst({
      where: {
        OR: uniqueUrls.map(u => ({ imageUrl: u })),
      },
    });
    if (blogs) return true;

    // Check BlogPost
    const blogPosts = await prisma.blogPost.findFirst({
      where: {
        OR: uniqueUrls.map(u => ({ featuredImageUrl: u })),
      },
    });
    if (blogPosts) return true;

    // Check Blog content
    const blogsWithContent = await prisma.blog.findFirst({
      where: {
        OR: uniqueUrls.flatMap(u => [
          { content: { contains: u } },
          { excerpt: { contains: u } },
        ]),
      },
    });
    if (blogsWithContent) return true;

    // Check BlogPost content
    const blogPostsWithContent = await prisma.blogPost.findFirst({
      where: {
        OR: uniqueUrls.flatMap(u => [
          { content: { contains: u } },
          { excerpt: { contains: u } },
        ]),
      },
    });
    if (blogPostsWithContent) return true;

    return false;
  } catch (error) {
    console.error(`[M-03] Error checking usage for ${url}:`, error);
    // Safe default: assume used if error
    return true;
  }
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
            // Remove /public prefix if present (Next.js serves public/ from root)
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
 * STEP 1: Detect ORPHAN media (READ-ONLY)
 */
async function detectOrphanMedia(): Promise<OrphanMedia[]> {
  console.log('🔍 [M-03 STEP 1] Scanning media directories...');
  
  const basePath = process.cwd();
  const allMediaItems: Array<{ url: string; filename: string; size: number; createdAt: Date; filePath: string }> = [];
  
  for (const dir of MEDIA_DIRECTORIES) {
    const fullDirPath = path.join(basePath, dir.path);
    const items = scanDirectory(fullDirPath, dir.urlPrefix, basePath);
    allMediaItems.push(...items);
  }

  console.log(`📊 [M-03 STEP 1] Found ${allMediaItems.length} media files`);
  console.log('🔍 [M-03 STEP 1] Checking usage in database...');

  const orphanMedia: OrphanMedia[] = [];
  let checked = 0;

  for (const item of allMediaItems) {
    checked++;
    if (checked % 50 === 0) {
      console.log(`   Progress: ${checked}/${allMediaItems.length}...`);
    }

    // Verify file exists
    if (!fs.existsSync(item.filePath)) {
      continue;
    }

    // Check usage
    const isUsed = await isMediaUsed(item.url);
    
    if (!isUsed) {
      orphanMedia.push({
        url: item.url,
        filename: item.filename,
        size: item.size,
        createdAt: item.createdAt,
        path: item.filePath,
      });
    }
  }

  return orphanMedia;
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP');
  console.log('STEP 1: Query deteksi ORPHAN (READ-ONLY)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await prisma.$connect();
    console.log('✅ Database connected\n');

    const orphanMedia = await detectOrphanMedia();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 HASIL STEP 1 — DETEKSI ORPHAN');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Media Files: ${orphanMedia.length + (await prisma.product.count()) + (await prisma.blog.count())}`);
    console.log(`ORPHAN Media: ${orphanMedia.length}`);
    console.log('\n📋 Sample ORPHAN Media (first 10):');
    
    orphanMedia.slice(0, 10).forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.filename}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Path: ${item.path}`);
      console.log(`   Size: ${(item.size / 1024).toFixed(2)} KB`);
      console.log(`   Created: ${item.createdAt.toISOString()}`);
    });

    if (orphanMedia.length > 10) {
      console.log(`\n... and ${orphanMedia.length - 10} more ORPHAN files`);
    }

    // Save results to file
    const resultsPath = path.join(process.cwd(), 'm-03-step1-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalOrphan: orphanMedia.length,
      orphanMedia: orphanMedia.map(item => ({
        url: item.url,
        filename: item.filename,
        size: item.size,
        createdAt: item.createdAt.toISOString(),
        path: item.path,
      })),
    }, null, 2));

    console.log(`\n💾 Results saved to: ${resultsPath}`);
    console.log('\n✅ STEP 1 COMPLETE — READ-ONLY, no data modified');

  } catch (error: any) {
    console.error('\n❌ [M-03 STEP 1] Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
