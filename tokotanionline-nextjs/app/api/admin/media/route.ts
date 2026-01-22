/**
 * PHASE C2-A — MEDIA LIBRARY API
 * 
 * Endpoint: GET /api/admin/media
 * 
 * Fungsi: List semua media files dengan status USED/UNUSED
 * 
 * Return: Array of media items dengan metadata
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { fileExists, generateMediaId } from '@/lib/media-file-utils';

export const runtime = 'nodejs';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  size: number;
  createdAt: Date;
  isUsed: boolean;
  usedIn?: string[]; // Array of entity types using this media
}

// Directories to scan for media files
const MEDIA_DIRECTORIES = [
  { path: 'public/images/products', urlPrefix: '/images/products' },
  { path: 'public/images/blog', urlPrefix: '/images/blog' },
  { path: 'public/images/settings', urlPrefix: '/images/settings' },
  { path: 'public/uploads/site', urlPrefix: '/uploads/site' },
  { path: 'public/images/articles', urlPrefix: '/images/articles' },
];

/**
 * Recursively scan directory for image files
 */
function scanDirectory(dirPath: string, urlPrefix: string, basePath: string): MediaItem[] {
  const mediaItems: MediaItem[] = [];
  
  if (!fs.existsSync(dirPath)) {
    return mediaItems;
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subUrlPrefix = `${urlPrefix}/${entry.name}`;
        mediaItems.push(...scanDirectory(fullPath, subUrlPrefix, basePath));
      } else if (entry.isFile()) {
        // Check if it's an image file
        const ext = path.extname(entry.name).toLowerCase();
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
        
        if (imageExts.includes(ext)) {
          // PHASE S+: CRITICAL - Verify file actually exists before adding
          // fs.readdirSync can return entries that don't exist due to race conditions
          try {
            // Double-check file exists and get stats
            if (!fs.existsSync(fullPath)) {
              console.warn(`[MEDIA-LIBRARY] File from readdirSync does not exist, skipping: ${fullPath}`);
              continue; // Skip file yang tidak ada
            }
            
            const stats = fs.statSync(fullPath);
            
            // Verify it's actually a file (not directory or symlink)
            if (!stats.isFile()) {
              console.warn(`[MEDIA-LIBRARY] Entry is not a file, skipping: ${fullPath}`);
              continue; // Skip directories/symlinks
            }
            
            const relativePath = path.relative(basePath, fullPath);
            const url = `/${relativePath.replace(/\\/g, '/')}`;
            
            // PHASE D: Generate unique ID using helper
            const mediaId = generateMediaId(url);
            
            mediaItems.push({
              id: mediaId, // PHASE D: Use generated unique ID
              url,
              filename: entry.name,
              size: stats.size,
              createdAt: stats.birthtime,
              isUsed: false, // Will be determined later
            });
          } catch (statError: any) {
            // If statSync fails (file doesn't exist, permission issue, etc.), skip it
            if ((statError as any).code === 'ENOENT') {
              console.warn(`[MEDIA-LIBRARY] File not found during scan, skipping: ${fullPath}`);
              continue; // Skip file yang tidak ada
            } else {
              // Other errors (permission, etc.) - log but skip for safety
              console.warn(`[MEDIA-LIBRARY] Error accessing file during scan, skipping: ${fullPath} (error: ${statError.message})`);
              continue;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return mediaItems;
}

/**
 * Normalize URL for matching (handle leading slash, trailing slash, case, etc.)
 */
function normalizeUrlForMatching(url: string): string {
  if (!url) return '';
  // Remove leading/trailing whitespace
  let normalized = url.trim();
  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  // Remove trailing slash (except root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Check if a media URL is used in the database
 * PHASE S+: Enhanced dengan URL normalization dan logging untuk debugging
 */
async function checkMediaUsage(url: string): Promise<{ isUsed: boolean; usedIn: string[] }> {
  const usedIn: string[] = [];
  
  // PHASE S+: Normalize URL untuk matching
  const normalizedUrl = normalizeUrlForMatching(url);
  const urlVariations = [
    normalizedUrl,
    url, // Original
    url.startsWith('/') ? url.slice(1) : '/' + url, // Without/with leading slash
  ];
  
  // Remove duplicates
  const uniqueUrls = Array.from(new Set(urlVariations));
  
  try {
    // PHASE S+: Check Products - imageUrl dengan multiple URL variations
    const productsByImageUrl = await prisma.product.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ imageUrl: u })),
      },
      select: { id: true, imageUrl: true },
    });
    
    if (productsByImageUrl.length > 0) {
      console.log(`[MEDIA-USAGE] Found ${productsByImageUrl.length} products using: ${url} (variations checked: ${uniqueUrls.join(', ')})`);
    }
    
    // Check Products - images JSON array (stored as string) dengan URL variations
    const productsByImages = await prisma.product.findMany({
      where: { images: { not: null } },
      select: { id: true, images: true },
    });
    
    const productsWithImageInArray = productsByImages.filter((p) => {
      if (!p.images) return false;
      try {
        const imageArray = JSON.parse(p.images);
        if (Array.isArray(imageArray)) {
          // Check all URL variations
          return uniqueUrls.some(u => imageArray.includes(u));
        }
        return false;
      } catch {
        // If not valid JSON, check as string dengan semua variations
        return p.images ? uniqueUrls.some(u => p.images!.includes(u)) : false;
      }
    });
    
    if (productsWithImageInArray.length > 0) {
      console.log(`[MEDIA-USAGE] Found ${productsWithImageInArray.length} products with image in array: ${url}`);
    }
    
    // Check Products - PHASE S+: Comprehensive check semua field konten dengan URL variations
    // Build OR conditions untuk semua URL variations
    const productContentConditions = uniqueUrls.flatMap(u => [
      { description: { contains: u } },
      { specifications: { contains: u } },
      { shortDescription: { contains: u } },
      { features: { contains: u } },
      { problemSolution: { contains: u } },
      { applicationMethod: { contains: u } },
      { advantages: { contains: u } },
      { safetyNotes: { contains: u } },
      { activeIngredients: { contains: u } },
      { usageStage: { contains: u } },
      { dosage: { contains: u } },
      { pestTargets: { contains: u } },
    ]);
    
    const productsWithImageInContent = await prisma.product.findMany({
      where: {
        OR: productContentConditions,
      },
      select: { id: true },
    });
    
    if (productsWithImageInContent.length > 0) {
      console.log(`[MEDIA-USAGE] Found ${productsWithImageInContent.length} products with image in content: ${url}`);
    }
    
    if (productsByImageUrl.length > 0 || productsWithImageInArray.length > 0 || productsWithImageInContent.length > 0) {
      usedIn.push('products');
    }
    
    // Check ProductImage table dengan URL variations
    const productImages = await prisma.productImage.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ url: u })),
      },
      select: { id: true },
    });
    
    if (productImages.length > 0 && !usedIn.includes('products')) {
      usedIn.push('products');
    }
    
    // Check Blog dengan URL variations
    const blogs = await prisma.blog.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ imageUrl: u })),
      },
      select: { id: true },
    });
    
    // Check BlogPost (if exists) dengan URL variations
    const blogPosts = await prisma.blogPost.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ featuredImageUrl: u })),
      },
      select: { id: true },
    });
    
    // Check Blog content - PHASE S+: Comprehensive check dengan URL variations
    const blogContentConditions = uniqueUrls.flatMap(u => [
      { content: { contains: u } },
      { excerpt: { contains: u } },
      { metaDescription: { contains: u } },
    ]);
    
    const blogsWithContent = await prisma.blog.findMany({
      where: {
        OR: blogContentConditions,
      },
      select: { id: true },
    });
    
    // Check BlogPost content - PHASE S+: Comprehensive check dengan URL variations
    const blogPostContentConditions = uniqueUrls.flatMap(u => [
      { content: { contains: u } },
      { excerpt: { contains: u } },
      { metaDescription: { contains: u } },
      { seoTitle: { contains: u } },
    ]);
    
    const blogPostsWithContent = await prisma.blogPost.findMany({
      where: {
        OR: blogPostContentConditions,
      },
      select: { id: true },
    });
    
    if (blogs.length > 0 || blogPosts.length > 0 || blogsWithContent.length > 0 || blogPostsWithContent.length > 0) {
      usedIn.push('blog');
    }
    
    // Check Product Categories dengan URL variations
    const categories = await prisma.productCategory.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ imageUrl: u })),
      },
      select: { id: true },
    });
    
    if (categories.length > 0) {
      usedIn.push('categories');
    }
    
    // Check SiteSettings - PHASE S+: Comprehensive check dengan URL variations
    const settingsConditions = uniqueUrls.flatMap(u => [
      { logoLight: u },
      { logoDark: u },
      { favicon: u },
      { faviconUrl: u },
      { logoUrl: u },
      { heroBackgroundImage: u },
    ]);
    
    const settings = await prisma.siteSettings.findFirst({
      where: {
        OR: settingsConditions,
      },
      select: { id: true },
    });
    
    if (settings) {
      console.log(`[MEDIA-USAGE] Found in SiteSettings: ${url}`);
    }
    
    // PHASE S+: Also check if URL appears in any text/JSON fields of SiteSettings
    // Some settings might store image URLs in JSON fields
    const allSettings = await prisma.siteSettings.findMany({
      select: {
        id: true,
        homepageBlocks: true,
        valueProps: true,
        features: true,
        problemItems: true,
        trustItems: true,
      },
    });
    
    const settingsWithImageInContent = allSettings.filter((s) => {
      // Check JSON fields that might contain image URLs
      const fieldsToCheck = [
        s.homepageBlocks,
        s.valueProps,
        s.features,
        s.problemItems,
        s.trustItems,
      ];
      
      return fieldsToCheck.some((field) => {
        if (!field) return false;
        try {
          const parsed = typeof field === 'string' ? JSON.parse(field) : field;
          const jsonString = JSON.stringify(parsed);
          return jsonString.includes(url);
        } catch {
          // If not JSON, check as string
          return String(field).includes(url);
        }
      });
    });
    
    if (settings || settingsWithImageInContent.length > 0) {
      usedIn.push('settings');
    }
    
    // Check BrandEntity dengan URL variations
    const brandEntities = await prisma.brandEntity.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ logoUrl: u })),
      },
      select: { id: true },
    });
    
    if (brandEntities.length > 0) {
      usedIn.push('brand-entities');
    }
    
    // Check AuthorEntity dengan URL variations
    const authorEntities = await prisma.authorEntity.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ profileImageUrl: u })),
      },
      select: { id: true },
    });
    
    if (authorEntities.length > 0) {
      usedIn.push('author-entities');
    }
    
    
  } catch (error) {
    console.error(`[MEDIA-USAGE] Error checking media usage for ${url}:`, error);
  }
  
  const result = {
    isUsed: usedIn.length > 0,
    usedIn,
  };
  
  // PHASE S+: CRITICAL FIX - Fallback check jika semua check gagal
  // Query database langsung untuk verify file benar-benar tidak digunakan
  if (!result.isUsed) {
    // Double-check dengan query langsung (case-insensitive, partial match)
    try {
      const filename = url.split('/').pop() || '';
      const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
      
      // Query products dengan filename match (case-insensitive)
      const directProductCheck = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "Product" 
        WHERE "imageUrl" ILIKE ${`%${filename}%`}
           OR "images"::text ILIKE ${`%${filename}%`}
           OR "description" ILIKE ${`%${filename}%`}
      `;
      
      // Query SiteSettings
      const directSettingsCheck = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "SiteSettings"
        WHERE "logoLight" ILIKE ${`%${filename}%`}
           OR "logoDark" ILIKE ${`%${filename}%`}
           OR "favicon" ILIKE ${`%${filename}%`}
           OR "faviconUrl" ILIKE ${`%${filename}%`}
           OR "logoUrl" ILIKE ${`%${filename}%`}
           OR "heroBackgroundImage" ILIKE ${`%${filename}%`}
      `;
      
      // Query BlogPosts
      const directBlogCheck = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "BlogPost"
        WHERE "featuredImageUrl" ILIKE ${`%${filename}%`}
           OR "content" ILIKE ${`%${filename}%`}
      `;
      
      const totalDirectCheck = Number(directProductCheck[0]?.count || 0) + 
                                Number(directSettingsCheck[0]?.count || 0) + 
                                Number(directBlogCheck[0]?.count || 0);
      
      if (totalDirectCheck > 0) {
        console.warn(`[MEDIA-USAGE] ⚠️ Fallback check found usage for ${url} via direct query! (filename: ${filename})`);
        result.isUsed = true;
        usedIn.push('fallback-direct-query');
        result.usedIn = usedIn;
      }
    } catch (fallbackError) {
      console.error(`[MEDIA-USAGE] Fallback check error for ${url}:`, fallbackError);
    }
  }
  
  // PHASE S+: Log result untuk debugging
  if (result.isUsed) {
    console.log(`[MEDIA-USAGE] ✅ ${url} is USED in: ${result.usedIn.join(', ')}`);
  } else {
    console.log(`[MEDIA-USAGE] ❌ ${url} is UNUSED`);
  }
  
  return result;
}

export async function GET(req: NextRequest) {
  try {
    // PHASE S+: Log untuk debugging sinkronisasi
    console.log('[MEDIA-LIBRARY] Starting media scan...');
    // 🔒 AUTHENTICATION & PERMISSION CHECK
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 📁 SCAN ALL MEDIA DIRECTORIES
    const basePath = process.cwd();
    const allMediaItems: MediaItem[] = [];
    
    for (const dir of MEDIA_DIRECTORIES) {
      const fullDirPath = path.join(basePath, dir.path);
      const items = scanDirectory(fullDirPath, dir.urlPrefix, basePath);
      allMediaItems.push(...items);
    }
    
    // PHASE S+: Check usage status for each media item dengan logging dan file verification
    console.log(`[MEDIA-LIBRARY] Checking usage for ${allMediaItems.length} media files...`);
    
    const validMediaItems: MediaItem[] = [];
    let checkedCount = 0;
    
    for (const item of allMediaItems) {
      // PHASE D: Use fileExists helper (filesystem = sumber kebenaran)
      if (!fileExists(item.url)) {
        // File tidak ada di filesystem - SKIP
        console.warn(`[MEDIA-LIBRARY] PHASE D: ❌ File not found, SKIPPING: ${item.url}`);
        continue; // Skip file yang tidak ada - JANGAN tambahkan ke list
      }
      
      // File exists and is valid - check usage
      const usage = await checkMediaUsage(item.url);
      const mediaItemWithUsage: MediaItem = {
        ...item,
        isUsed: usage.isUsed,
        usedIn: usage.usedIn,
      };
      
      validMediaItems.push(mediaItemWithUsage);
      checkedCount++;
      
      if (checkedCount % 10 === 0) {
        const usedCount = validMediaItems.filter(i => i.isUsed).length;
        console.log(`[MEDIA-LIBRARY] Checked ${checkedCount}/${allMediaItems.length} files... (${validMediaItems.length} valid, ${usedCount} used)`);
      }
    }
    
    // PHASE S+: Calculate statistics dengan logging
    const used = validMediaItems.filter((item) => item.isUsed).length;
    const unused = validMediaItems.filter((item) => !item.isUsed).length;
    
    console.log(`[MEDIA-LIBRARY] Scan complete: ${validMediaItems.length} valid files (${allMediaItems.length - validMediaItems.length} invalid skipped), ${used} used, ${unused} unused`);
    
    // 📊 SORT BY CREATED DATE (newest first)
    validMediaItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return NextResponse.json({
      success: true,
      media: validMediaItems, // Only return valid files that exist on disk
      total: validMediaItems.length,
      used,
      unused,
    });

  } catch (error: any) {
    console.error('❌ [GET /api/admin/media] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}
