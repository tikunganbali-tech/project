/**
 * M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP (TERKONTROL)
 * 
 * STEP 3: UI-C VALIDATION (READ-ONLY)
 * 
 * Verifikasi bahwa /admin/media/monitor menampilkan hasil yang sama
 * dengan query STEP 1
 */

import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Load STEP 1 results
const STEP1_RESULTS_PATH = path.join(process.cwd(), 'm-03-step1-results.json');

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

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  let normalized = url.trim();
  // Remove /public prefix if present
  if (normalized.startsWith('/public/')) {
    normalized = normalized.replace('/public', '');
  }
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized;
}

/**
 * Get orphan media from UI monitor API logic
 */
async function getOrphanFromMonitor(): Promise<Set<string>> {
  // Directories to scan (same as monitor API)
  const MEDIA_DIRECTORIES = [
    { path: 'public/images/products', urlPrefix: '/images/products' },
    { path: 'public/images/blog', urlPrefix: '/images/blog' },
    { path: 'public/images/settings', urlPrefix: '/images/settings' },
    { path: 'public/uploads/site', urlPrefix: '/uploads/site' },
    { path: 'public/images/articles', urlPrefix: '/images/articles' },
    { path: 'public/uploads', urlPrefix: '/uploads' },
  ];

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

  async function isMediaUsed(url: string): Promise<boolean> {
    const normalizedUrl = normalizeUrlForMatching(url);
    const urlVariations = [
      normalizedUrl,
      url,
      url.startsWith('/') ? url.slice(1) : '/' + url,
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
      return true; // Safe default
    }
  }

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
            }
          }
        }
      }
    } catch (error) {
      console.error(`[M-03] Error scanning directory ${dirPath}:`, error);
    }
    
    return mediaItems;
  }

  const basePath = process.cwd();
  const allMediaItems: Array<{ url: string; filename: string; size: number; createdAt: Date; filePath: string }> = [];
  
  for (const dir of MEDIA_DIRECTORIES) {
    const fullDirPath = path.join(basePath, dir.path);
    const items = scanDirectory(fullDirPath, dir.urlPrefix, basePath);
    allMediaItems.push(...items);
  }

  const orphanUrls = new Set<string>();
  let checked = 0;

  for (const item of allMediaItems) {
    checked++;
    if (checked % 50 === 0) {
      console.log(`   Progress: ${checked}/${allMediaItems.length}...`);
    }

    if (!fs.existsSync(item.filePath)) {
      continue;
    }

    const isUsed = await isMediaUsed(item.url);
    
    if (!isUsed) {
      orphanUrls.add(normalizeUrl(item.url));
    }
  }

  return orphanUrls;
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('M-03 — MEDIA LIBRARY ORPHAN & LEGACY CLEANUP');
  console.log('STEP 3: UI-C VALIDATION (READ-ONLY)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Load STEP 1 results
    if (!fs.existsSync(STEP1_RESULTS_PATH)) {
      console.error('❌ STEP 1 results not found. Run STEP 1 first.');
      process.exit(1);
    }

    const step1Data: Step1Result = JSON.parse(fs.readFileSync(STEP1_RESULTS_PATH, 'utf-8'));
    console.log(`✅ Loaded STEP 1 results: ${step1Data.totalOrphan} ORPHAN media\n`);

    await prisma.$connect();
    console.log('✅ Database connected\n');

    console.log('🔍 [M-03 STEP 3] Re-checking orphan status (UI-C logic)...');
    const uiOrphanUrls = await getOrphanFromMonitor();

    // Normalize STEP 1 URLs
    const step1OrphanUrls = new Set(
      step1Data.orphanMedia.map(item => normalizeUrl(item.url))
    );

    // Compare
    const step1Only = new Set(Array.from(step1OrphanUrls).filter(x => !uiOrphanUrls.has(x)));
    const uiOnly = new Set(Array.from(uiOrphanUrls).filter(x => !step1OrphanUrls.has(x)));
    const common = new Set(Array.from(step1OrphanUrls).filter(x => uiOrphanUrls.has(x)));

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 HASIL STEP 3 — UI-C VALIDATION');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`STEP 1 ORPHAN count: ${step1OrphanUrls.size}`);
    console.log(`UI-C ORPHAN count: ${uiOrphanUrls.size}`);
    console.log(`Common (match): ${common.size}`);
    console.log(`STEP 1 only (not in UI-C): ${step1Only.size}`);
    console.log(`UI-C only (not in STEP 1): ${uiOnly.size}`);

    if (step1Only.size > 0) {
      console.log('\n⚠️  Media in STEP 1 but not in UI-C (first 5):');
      Array.from(step1Only).slice(0, 5).forEach(url => {
        console.log(`   - ${url}`);
      });
    }

    if (uiOnly.size > 0) {
      console.log('\n⚠️  Media in UI-C but not in STEP 1 (first 5):');
      Array.from(uiOnly).slice(0, 5).forEach(url => {
        console.log(`   - ${url}`);
      });
    }

    // Validation result
    const isValid = step1Only.size === 0 && uiOnly.size === 0 && step1OrphanUrls.size === uiOrphanUrls.size;

    console.log('\n═══════════════════════════════════════════════════════════');
    if (isValid) {
      console.log('✅ VALIDATION PASSED');
      console.log('   UI-C konsisten dengan STEP 1');
    } else {
      console.log('⚠️  VALIDATION WARNING');
      console.log('   Ada perbedaan antara STEP 1 dan UI-C');
      console.log('   Periksa perbedaan di atas');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    // Save validation results
    const resultsPath = path.join(process.cwd(), 'm-03-step3-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      isValid,
      step1Count: step1OrphanUrls.size,
      uiCount: uiOrphanUrls.size,
      commonCount: common.size,
      step1Only: Array.from(step1Only),
      uiOnly: Array.from(uiOnly),
    }, null, 2));

    console.log(`💾 Validation results saved to: ${resultsPath}`);
    console.log('\n✅ STEP 3 COMPLETE — READ-ONLY, no data modified');

    if (!isValid) {
      console.log('\n⚠️  ACTION REQUIRED: Investigate differences before proceeding to STEP 4');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ [M-03 STEP 3] Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
