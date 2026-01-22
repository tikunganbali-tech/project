/**
 * PHASE S+ — MEDIA CLEANUP API (Bulk Delete Unused Media)
 * 
 * Endpoint: POST /api/admin/media/cleanup
 * 
 * Fungsi: Bulk delete semua media files yang tidak terpakai
 * 
 * Validasi:
 * - Role: super_admin only (destructive operation)
 * - Hanya delete UNUSED media
 * - Return summary
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// Directories to scan for media files
const MEDIA_DIRECTORIES = [
  { path: 'public/images/products', urlPrefix: '/images/products' },
  { path: 'public/images/blog', urlPrefix: '/images/blog' },
  { path: 'public/images/settings', urlPrefix: '/images/settings' },
  { path: 'public/uploads/site', urlPrefix: '/uploads/site' },
  { path: 'public/images/articles', urlPrefix: '/images/articles' },
  { path: 'public/uploads', urlPrefix: '/uploads' }, // Engine-hub uploads
];

/**
 * Recursively scan directory for image files
 */
function scanDirectory(dirPath: string, urlPrefix: string, basePath: string): Array<{ url: string; filePath: string }> {
  const mediaItems: Array<{ url: string; filePath: string }> = [];
  
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
          const relativePath = path.relative(basePath, fullPath);
          const url = `/${relativePath.replace(/\\/g, '/')}`;
          
          // PHASE S+: Normalize file path to ensure correctness (absolute path)
          const normalizedFilePath = path.resolve(fullPath);
          
          // PHASE S+: Verify file exists before adding
          if (!fs.existsSync(normalizedFilePath)) {
            console.warn(`[MEDIA-CLEANUP] File does not exist: ${normalizedFilePath}`);
            continue; // Skip non-existent files (fixed: was return, now continue)
          }
          
          mediaItems.push({
            url,
            filePath: normalizedFilePath, // Use absolute resolved path
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return mediaItems;
}

/**
 * Check if a media URL is used in the database (comprehensive check)
 * PHASE S+: Comprehensive check semua konten website untuk memastikan file tidak terhapus jika masih digunakan
 * Jika file ada di database (products, blog, content, dll) → USED → TIDAK BISA DELETE
 * Jika file TIDAK ada di database → UNUSED → BISA DELETE
 */
async function checkMediaUsage(url: string): Promise<{ isUsed: boolean; usedIn: string[] }> {
  const usedIn: string[] = [];
  
  try {
    // Check Products - imageUrl
    const productsByImageUrl = await prisma.product.findMany({
      where: { imageUrl: url },
      select: { id: true },
    });
    
    // Check Products - images JSON array (stored as string)
    const productsByImages = await prisma.product.findMany({
      where: { images: { not: null } },
      select: { id: true, images: true },
    });
    
    const productsWithImageInArray = productsByImages.filter((p) => {
      if (!p.images) return false;
      try {
        const imageArray = JSON.parse(p.images);
        return Array.isArray(imageArray) && imageArray.includes(url);
      } catch {
        // If not valid JSON, check as string
        return p.images.includes(url);
      }
    });
    
    // Check Products - PHASE S+: Comprehensive check semua field konten yang mungkin berisi image URLs
    // Semua field HTML/text yang mungkin berisi URL gambar dicek untuk memastikan tidak ada file terpakai yang terhapus
    const productsWithImageInContent = await prisma.product.findMany({
      where: {
        OR: [
          { description: { contains: url } },
          { specifications: { contains: url } },
          { shortDescription: { contains: url } },
          { features: { contains: url } },
          { problemSolution: { contains: url } },
          { applicationMethod: { contains: url } },
          { advantages: { contains: url } },
          { safetyNotes: { contains: url } },
          { activeIngredients: { contains: url } },
          { usageStage: { contains: url } },
          { dosage: { contains: url } },
          { pestTargets: { contains: url } },
        ],
      },
      select: { id: true },
    });
    
    if (productsByImageUrl.length > 0 || productsWithImageInArray.length > 0 || productsWithImageInContent.length > 0) {
      usedIn.push('products');
    }
    
    // Check ProductImage table
    const productImages = await prisma.productImage.findMany({
      where: { url },
      select: { id: true },
    });
    
    if (productImages.length > 0 && !usedIn.includes('products')) {
      usedIn.push('products');
    }
    
    // Check Blog (BlogPost)
    const blogs = await prisma.blog.findMany({
      where: { imageUrl: url },
      select: { id: true },
    });
    
    // Check BlogPost (if exists)
    const blogPosts = await prisma.blogPost.findMany({
      where: { featuredImageUrl: url },
      select: { id: true },
    });
    
    // Check Blog content (HTML may contain image URLs)
    // PHASE S+: Cek semua field konten blog yang mungkin berisi URL gambar
    const blogsWithContent = await prisma.blog.findMany({
      where: {
        OR: [
          { content: { contains: url } },
          { excerpt: { contains: url } },
          { metaDescription: { contains: url } },
        ],
      },
      select: { id: true },
    });
    
    // Check BlogPost content - PHASE S+: Comprehensive check semua field konten
    const blogPostsWithContent = await prisma.blogPost.findMany({
      where: {
        OR: [
          { content: { contains: url } },
          { excerpt: { contains: url } },
          { seoDescription: { contains: url } },
          { seoTitle: { contains: url } },
        ],
      },
      select: { id: true },
    });
    
    if (blogs.length > 0 || blogPosts.length > 0 || blogsWithContent.length > 0 || blogPostsWithContent.length > 0) {
      usedIn.push('blog');
    }
    
    // Check Categories
    const categories = await prisma.productCategory.findMany({
      where: { imageUrl: url },
      select: { id: true },
    });
    
    if (categories.length > 0) {
      usedIn.push('categories');
    }
    
    // Check SiteSettings - PHASE S+: Comprehensive check semua field yang mungkin berisi image URL
    // Termasuk logoLight, logoDark, favicon, heroBackgroundImage, dll
    const settings = await prisma.siteSettings.findFirst({
      where: {
        OR: [
          { logoLight: url },
          { logoDark: url },
          { favicon: url },
          { faviconUrl: url },
          { logoUrl: url },
          { heroBackgroundImage: url },
        ],
      },
      select: { id: true },
    });
    
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
    
    // Check BrandEntity
    const brandEntities = await prisma.brandEntity.findMany({
      where: { logoUrl: url },
      select: { id: true },
    });
    
    if (brandEntities.length > 0 && !usedIn.includes('brands')) {
      usedIn.push('brand-entities');
    }
    
    // Check AuthorEntity
    const authorEntities = await prisma.authorEntity.findMany({
      where: { profileImageUrl: url },
      select: { id: true },
    });
    
    if (authorEntities.length > 0) {
      usedIn.push('author-entities');
    }
    
  } catch (error) {
    console.error(`Error checking media usage for ${url}:`, error);
    // If error, assume used (safe default)
    return { isUsed: true, usedIn: ['error-checking'] };
  }
  
  return {
    isUsed: usedIn.length > 0,
    usedIn,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 🔒 AUTHENTICATION & PERMISSION CHECK (super_admin only - destructive operation)
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super admin access required for bulk cleanup' },
        { status: 403 }
      );
    }

    // Parse request body (optional: dry-run mode, minAgeDays filter)
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true; // If true, only report, don't delete
    const minAgeDays = body.minAgeDays || 30; // SCALE-3: Default 30 days for ORPHAN cleanup
    
    const now = new Date();

    // 📁 SCAN ALL MEDIA DIRECTORIES
    const basePath = process.cwd();
    const allMediaItems: Array<{ url: string; filePath: string }> = [];
    
    console.log(`[MEDIA-CLEANUP] Base path: ${basePath}`);
    
    for (const dir of MEDIA_DIRECTORIES) {
      const fullDirPath = path.join(basePath, dir.path);
      console.log(`[MEDIA-CLEANUP] Scanning directory: ${fullDirPath} (exists: ${fs.existsSync(fullDirPath)})`);
      const items = scanDirectory(fullDirPath, dir.urlPrefix, basePath);
      console.log(`[MEDIA-CLEANUP] Found ${items.length} files in ${dir.path}`);
      allMediaItems.push(...items);
    }
    
    console.log(`[MEDIA-CLEANUP] Total found: ${allMediaItems.length} media files to check`);
    
    // 🔍 CHECK USAGE STATUS FOR EACH MEDIA
    const unusedMedia: Array<{ url: string; filePath: string; size: number }> = [];
    const usedMedia: Array<{ url: string; usedIn: string[] }> = [];
    let totalSize = 0;
    
    for (const item of allMediaItems) {
      const usage = await checkMediaUsage(item.url);
      
      if (!usage.isUsed) {
        // SCALE-3: Filter by age (only cleanup ORPHAN > minAgeDays)
        try {
          const stats = fs.statSync(item.filePath);
          const fileAge = now.getTime() - stats.birthtime.getTime();
          const minAgeMs = minAgeDays * 24 * 60 * 60 * 1000;
          
          if (fileAge >= minAgeMs) {
            unusedMedia.push({
              url: item.url,
              filePath: item.filePath,
              size: stats.size,
            });
            totalSize += stats.size;
          } else {
            // File is ORPHAN but too new - skip
            console.log(`[MEDIA-CLEANUP] Skipping ${item.url} - ORPHAN but only ${Math.floor(fileAge / (24 * 60 * 60 * 1000))} days old (min: ${minAgeDays} days)`);
          }
        } catch (error) {
          console.error(`Error getting stats for ${item.filePath}:`, error);
        }
      } else {
        usedMedia.push({
          url: item.url,
          usedIn: usage.usedIn,
        });
      }
    }
    
    console.log(`[MEDIA-CLEANUP] Found ${unusedMedia.length} unused files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    
    // 🗑️ DELETE UNUSED FILES (if not dry-run)
    // PHASE S+: Synchronous deletion dengan re-check database untuk maintain data integrity
    const deletedFiles: string[] = [];
    const failedDeletes: Array<{ url: string; error: string }> = [];
    let raceConditionDetected = 0; // Track files that became used during deletion
    
    if (!dryRun) {
      // PHASE S+: Synchronous deletion dengan re-check database untuk prevent race condition
      // Process sequentially untuk maintain data integrity dan avoid overwhelming filesystem
      for (const item of unusedMedia) {
        try {
          // PHASE S+: Use multiple path resolution methods to ensure correctness
          // Method 1: Use stored filePath (from scanDirectory)
          let absoluteFilePath = path.resolve(item.filePath);
          
          // Method 2: Convert from URL (same as delete route) as fallback
          const projectRoot = path.resolve(process.cwd());
          const relativePath = item.url.startsWith('/') ? item.url.slice(1) : item.url;
          const urlBasedPath = path.join(projectRoot, relativePath);
          
          // Verify which path exists
          const storedPathExists = fs.existsSync(absoluteFilePath);
          const urlBasedPathExists = fs.existsSync(urlBasedPath);
          
          // Use the path that exists, or prefer stored path
          if (!storedPathExists && urlBasedPathExists) {
            console.warn(`[MEDIA-CLEANUP] Stored path not found, using URL-based path: ${absoluteFilePath} -> ${urlBasedPath}`);
            absoluteFilePath = urlBasedPath;
          }
          
          // Double-check file exists
          if (!fs.existsSync(absoluteFilePath)) {
            console.log(`[MEDIA-CLEANUP] File already deleted or not found: ${absoluteFilePath} (stored: ${item.filePath}, url-based: ${urlBasedPath})`);
            deletedFiles.push(item.url); // Consider already deleted
            continue;
          }
          
          // PHASE S+: Verify file path is correct (safety check - must be within project)
          if (!absoluteFilePath.startsWith(projectRoot)) {
            console.error(`[MEDIA-CLEANUP] Invalid file path (outside project): ${absoluteFilePath} (project: ${projectRoot})`);
            failedDeletes.push({
              url: item.url,
              error: 'Invalid file path (outside project directory)',
            });
            continue;
          }
          
          // PHASE S+: CRITICAL - Re-check database usage BEFORE delete (race condition prevention)
          // Ini memastikan file tidak digunakan saat akan dihapus (sinkron dengan database)
          // Sequential processing memastikan operasi tidak mengganggu stabilitas sistem
          const recheckUsage = await checkMediaUsage(item.url);
          if (recheckUsage.isUsed) {
            raceConditionDetected++;
            console.warn(`[MEDIA-CLEANUP] File is now used (race condition detected): ${item.url} - used in: ${recheckUsage.usedIn.join(', ')}`);
            // Skip deletion - file sekarang digunakan (mungkin baru saja di-assign oleh operasi lain)
            // Track sebagai used media, not failed delete
            // Ini memastikan database dan filesystem tetap sinkron
            usedMedia.push({
              url: item.url,
              usedIn: recheckUsage.usedIn,
            });
            continue;
          }
          
          // PHASE S+: Log before delete for debugging (non-blocking operation)
          console.log(`[MEDIA-CLEANUP] Deleting file: ${absoluteFilePath}`);
          console.log(`[MEDIA-CLEANUP] File stats before delete:`, {
            exists: fs.existsSync(absoluteFilePath),
            isFile: fs.statSync(absoluteFilePath).isFile(),
            size: fs.statSync(absoluteFilePath).size,
          });
          
          // PHASE S+: CRITICAL - File deletion dengan verifikasi ketat
          // Pastikan file benar-benar terhapus, bukan hanya tampilan UI
          let deletionSuccess = false;
          
          // PHASE S+: Check file permission before delete
          try {
            const stats = fs.statSync(absoluteFilePath);
            // Check if file is read-only
            if ((stats.mode & parseInt('222', 8)) === 0) {
              // File is read-only - change permission first
              console.warn(`[MEDIA-CLEANUP] File is read-only, changing permission: ${absoluteFilePath}`);
              fs.chmodSync(absoluteFilePath, 0o666);
            }
          } catch (statError: any) {
            console.warn(`[MEDIA-CLEANUP] Could not check file stats: ${statError.message}`);
          }
          
          try {
            // Method 1: Try unlinkSync (synchronous, atomic)
            try {
              fs.unlinkSync(absoluteFilePath);
              console.log(`[MEDIA-CLEANUP] unlinkSync executed for: ${absoluteFilePath}`);
            } catch (syncError: any) {
              // If unlinkSync fails, try fs.promises.unlink (async)
              console.warn(`[MEDIA-CLEANUP] unlinkSync failed, trying fs.promises.unlink: ${syncError.message}`);
              await fs.promises.unlink(absoluteFilePath);
              console.log(`[MEDIA-CLEANUP] fs.promises.unlink executed for: ${absoluteFilePath}`);
            }
            
            // PHASE S+: Verify deletion dengan multiple checks
            // Check 5 kali dengan delay untuk filesystem sync
            for (let attempt = 0; attempt < 5; attempt++) {
              const exists = fs.existsSync(absoluteFilePath);
              
              if (!exists) {
                // File benar-benar terhapus
                deletionSuccess = true;
                console.log(`[MEDIA-CLEANUP] ✅ File verified deleted (attempt ${attempt + 1}): ${absoluteFilePath}`);
                break;
              } else {
                // File masih ada - wait dan check lagi
                console.warn(`[MEDIA-CLEANUP] File still exists after unlinkSync (attempt ${attempt + 1}/5): ${absoluteFilePath}`);
                
                // Try delete again if not last attempt - use both methods
                if (attempt < 4) {
                  try {
                    // Try unlinkSync first
                    try {
                      fs.unlinkSync(absoluteFilePath);
                    } catch (syncRetryError: any) {
                      // If sync fails, try async
                      console.warn(`[MEDIA-CLEANUP] Retry unlinkSync failed, trying async: ${syncRetryError.message}`);
                      await fs.promises.unlink(absoluteFilePath);
                    }
                    await new Promise(resolve => setTimeout(resolve, 150)); // Wait for filesystem (increased delay)
                  } catch (retryError: any) {
                    console.error(`[MEDIA-CLEANUP] Retry delete failed (attempt ${attempt + 1}):`, retryError);
                  }
                }
              }
            }
            
            // PHASE S+: Final verification - pastikan file benar-benar tidak ada
            if (!deletionSuccess) {
              // File masih ada setelah 5 attempts - coba metode lain
              const finalCheck = fs.existsSync(absoluteFilePath);
              if (finalCheck) {
                // CRITICAL FIX: Try different deletion methods
                try {
                  // Method 1: Check if file is read-only and remove readonly flag
                  fs.chmodSync(absoluteFilePath, 0o666);
                  
                  // Method 2: Try unlinkSync again after chmod
                  fs.unlinkSync(absoluteFilePath);
                  
                  // Method 3: Verify again after chmod + unlink
                  await new Promise(resolve => setTimeout(resolve, 200));
                  
                  if (!fs.existsSync(absoluteFilePath)) {
                    // Success after chmod
                    console.log(`[MEDIA-CLEANUP] ✅ File deleted after chmod: ${absoluteFilePath}`);
                    deletionSuccess = true;
                  } else {
                    // Still exists - likely locked or permission issue
                    console.error(`[MEDIA-CLEANUP] ❌ File deletion FAILED - file still exists after chmod + unlink: ${absoluteFilePath}`);
                    failedDeletes.push({
                      url: item.url,
                      error: `File deletion failed - file may be locked or permission denied. Path: ${absoluteFilePath}`,
                    });
                    continue;
                  }
                } catch (chmodError: any) {
                  console.error(`[MEDIA-CLEANUP] ❌ Chmod/delete error for ${absoluteFilePath}:`, chmodError);
                  failedDeletes.push({
                    url: item.url,
                    error: `File deletion failed - ${chmodError.message || 'Permission or lock error'}. Path: ${absoluteFilePath}`,
                  });
                  continue;
                }
              } else {
                // File akhirnya terhapus (verification delay)
                deletionSuccess = true;
                console.log(`[MEDIA-CLEANUP] ✅ File verified deleted after delay: ${absoluteFilePath}`);
              }
            }
            
          } catch (unlinkError: any) {
            // Error saat delete - track sebagai failed dengan detail path
            console.error(`[MEDIA-CLEANUP] ❌ unlinkSync error for ${absoluteFilePath}:`, unlinkError);
            console.error(`[MEDIA-CLEANUP] Error details:`, {
              path: absoluteFilePath,
              url: item.url,
              storedPath: item.filePath,
              errorCode: (unlinkError as any).code,
              errorMessage: unlinkError.message,
            });
            failedDeletes.push({
              url: item.url,
              error: `Deletion error: ${unlinkError.message || 'Unknown error'} (Path: ${absoluteFilePath})`,
            });
            continue; // Skip to next file
          }
          
          // PHASE S+: Only mark as deleted if verification passed
          if (deletionSuccess) {
            // Final double-check
            const ultimateCheck = fs.existsSync(absoluteFilePath);
            if (!ultimateCheck) {
              console.log(`[MEDIA-CLEANUP] ✅ Successfully deleted and verified: ${absoluteFilePath}`);
              deletedFiles.push(item.url);
            } else {
              // File masih ada meskipun semua method sudah dicoba
              console.error(`[MEDIA-CLEANUP] ⚠️ File STILL EXISTS after all deletion attempts: ${absoluteFilePath}`);
              failedDeletes.push({
                url: item.url,
                error: `File still exists after all deletion attempts. Path: ${absoluteFilePath}`,
              });
            }
          } else {
            // Should not reach here, but safety check
            console.error(`[MEDIA-CLEANUP] ⚠️ Deletion not verified for: ${absoluteFilePath}`);
            failedDeletes.push({
              url: item.url,
              error: 'Deletion verification failed',
            });
          }
          
        } catch (error: any) {
          // PHASE S+: Isolated error handling - error per file tidak stop seluruh proses
          // Ini memastikan cleanup tetap berjalan meskipun ada beberapa file yang gagal
          console.error(`[MEDIA-CLEANUP] Error deleting ${item.filePath}:`, error);
          failedDeletes.push({
            url: item.url,
            error: error.message || 'Unknown error',
          });
          // Continue dengan file berikutnya (tidak throw error)
        }
      }
    }
    
    // PHASE S+: Final summary dengan race condition tracking
    console.log(`[MEDIA-CLEANUP] Cleanup completed: ${deletedFiles.length} deleted, ${failedDeletes.length} failed, ${raceConditionDetected} race conditions detected`);
    
    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        total: allMediaItems.length,
        used: usedMedia.length,
        unused: unusedMedia.length,
        deleted: deletedFiles.length,
        failed: failedDeletes.length,
        raceConditionDetected, // Files that became used during deletion (data integrity protection)
        totalSizeBytes: totalSize,
        totalSizeMB: parseFloat((totalSize / 1024 / 1024).toFixed(2)),
      },
      deletedFiles: dryRun ? [] : deletedFiles,
      failedDeletes,
      unusedFiles: unusedMedia.map(m => ({
        url: m.url,
        size: m.size,
        sizeMB: parseFloat((m.size / 1024 / 1024).toFixed(2)),
      })),
      // PHASE S+: Metadata untuk debugging dan monitoring
      metadata: {
        processedAt: new Date().toISOString(),
        syncWithDatabase: true, // Indicates re-check before delete was performed
        sequentialProcessing: true, // Indicates files were processed one by one (safe for system)
      },
    });

  } catch (error: any) {
    console.error('❌ [POST /api/admin/media/cleanup] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}
