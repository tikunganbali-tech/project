/**
 * UI-C1 — MEDIA MONITOR API
 * 
 * Endpoint: GET /api/admin/media/monitor
 * 
 * Fungsi: List semua media dengan metadata lengkap untuk monitoring
 * Status: READ-ONLY (tidak mengubah data)
 * 
 * Return: Array of media items dengan:
 * - Thumbnail
 * - Source: MANUAL | AI_GENERATED | SCHEDULER
 * - Digunakan di: Blog (judul) | Product (nama)
 * - Status: USED | ORPHAN
 * - Created At
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface MediaMonitorItem {
  id: string;
  url: string;
  filename: string;
  thumbnail: string;
  size: number;
  createdAt: Date;
  source: 'MANUAL' | 'AI_GENERATED' | 'SCHEDULER' | 'UNKNOWN';
  usedIn: Array<{
    type: 'blog' | 'product';
    id: string;
    title: string;
  }>;
  status: 'USED' | 'ORPHAN';
}

// Directories to scan for media files
const MEDIA_DIRECTORIES = [
  { path: 'public/images/products', urlPrefix: '/images/products' },
  { path: 'public/images/blog', urlPrefix: '/images/blog' },
  { path: 'public/images/settings', urlPrefix: '/images/settings' },
  { path: 'public/uploads/site', urlPrefix: '/uploads/site' },
  { path: 'public/images/articles', urlPrefix: '/images/articles' },
  { path: 'public/uploads', urlPrefix: '/uploads' }, // Include all uploads
];

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
 * Detect media source based on path and database records
 */
async function detectMediaSource(url: string): Promise<'MANUAL' | 'AI_GENERATED' | 'SCHEDULER' | 'UNKNOWN'> {
  // Check if URL is in uploads/articles (AI generated)
  if (url.includes('/uploads/artikel-') || url.includes('/uploads/articles/')) {
    // Check scheduler logs
    const schedulerLog = await prisma.schedulerExecutionLog.findFirst({
      where: {
        metadata: {
          path: ['imageUrl'],
          equals: url,
        },
      },
      orderBy: { executedAt: 'desc' },
    });
    
    if (schedulerLog) {
      return 'SCHEDULER';
    }
    
    // Check AI generation logs
    const aiLog = await prisma.aIContentGenerationLog.findFirst({
      where: {
        imageUrl: url,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    if (aiLog) {
      return 'AI_GENERATED';
    }
    
    // Default to AI_GENERATED for article uploads
    return 'AI_GENERATED';
  }
  
  // Check scheduler logs for any URL
  const schedulerLog = await prisma.schedulerExecutionLog.findFirst({
    where: {
      metadata: {
        path: ['imageUrl'],
        equals: url,
      },
    },
    orderBy: { executedAt: 'desc' },
  });
  
  if (schedulerLog) {
    return 'SCHEDULER';
  }
  
  // Check AI generation logs
  const aiLog = await prisma.aIContentGenerationLog.findFirst({
    where: {
      imageUrl: url,
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (aiLog) {
    return 'AI_GENERATED';
  }
  
  // Default to MANUAL for other paths
  return 'MANUAL';
}

/**
 * Check where media is used and return detailed info
 */
async function checkMediaUsageDetailed(url: string): Promise<{
  isUsed: boolean;
  usedIn: Array<{ type: 'blog' | 'product'; id: string; title: string }>;
}> {
  const usedIn: Array<{ type: 'blog' | 'product'; id: string; title: string }> = [];
  
  const normalizedUrl = normalizeUrlForMatching(url);
  const urlVariations = [
    normalizedUrl,
    url,
    url.startsWith('/') ? url.slice(1) : '/' + url,
  ];
  const uniqueUrls = Array.from(new Set(urlVariations));
  
  try {
    // Check Products - imageUrl
    const productsByImageUrl = await prisma.product.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ imageUrl: u })),
      },
      select: { id: true, name: true, imageUrl: true },
    });
    
    productsByImageUrl.forEach(p => {
      usedIn.push({ type: 'product', id: p.id, title: p.name });
    });
    
    // Check Products - images JSON array
    const productsByImages = await prisma.product.findMany({
      where: { images: { not: null } },
      select: { id: true, name: true, images: true },
    });
    
    productsByImages.forEach(p => {
      if (!p.images) return;
      try {
        const imageArray = JSON.parse(p.images);
        if (Array.isArray(imageArray) && uniqueUrls.some(u => imageArray.includes(u))) {
          if (!usedIn.some(u => u.type === 'product' && u.id === p.id)) {
            usedIn.push({ type: 'product', id: p.id, title: p.name });
          }
        }
      } catch {
        if (p.images && uniqueUrls.some(u => p.images!.includes(u))) {
          if (!usedIn.some(u => u.type === 'product' && u.id === p.id)) {
            usedIn.push({ type: 'product', id: p.id, title: p.name });
          }
        }
      }
    });
    
    // Check ProductImage table
    const productImages = await prisma.productImage.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ url: u })),
      },
      select: { id: true, productId: true, product: { select: { id: true, name: true } } },
    });
    
    productImages.forEach(pi => {
      if (!usedIn.some(u => u.type === 'product' && u.id === pi.product.id)) {
        usedIn.push({ type: 'product', id: pi.product.id, title: pi.product.name });
      }
    });
    
    // Check Blog
    const blogs = await prisma.blog.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ imageUrl: u })),
      },
      select: { id: true, title: true },
    });
    
    blogs.forEach(b => {
      usedIn.push({ type: 'blog', id: b.id, title: b.title });
    });
    
    // Check BlogPost
    const blogPosts = await prisma.blogPost.findMany({
      where: {
        OR: uniqueUrls.map(u => ({ featuredImageUrl: u })),
      },
      select: { id: true, title: true },
    });
    
    blogPosts.forEach(bp => {
      usedIn.push({ type: 'blog', id: bp.id, title: bp.title });
    });
    
    // Check Blog content
    const blogsWithContent = await prisma.blog.findMany({
      where: {
        OR: uniqueUrls.flatMap(u => [
          { content: { contains: u } },
          { excerpt: { contains: u } },
        ]),
      },
      select: { id: true, title: true },
    });
    
    blogsWithContent.forEach(b => {
      if (!usedIn.some(u => u.type === 'blog' && u.id === b.id)) {
        usedIn.push({ type: 'blog', id: b.id, title: b.title });
      }
    });
    
    // Check BlogPost content
    const blogPostsWithContent = await prisma.blogPost.findMany({
      where: {
        OR: uniqueUrls.flatMap(u => [
          { content: { contains: u } },
          { excerpt: { contains: u } },
        ]),
      },
      select: { id: true, title: true },
    });
    
    blogPostsWithContent.forEach(bp => {
      if (!usedIn.some(u => u.type === 'blog' && u.id === bp.id)) {
        usedIn.push({ type: 'blog', id: bp.id, title: bp.title });
      }
    });
    
  } catch (error) {
    console.error(`[MEDIA-MONITOR] Error checking usage for ${url}:`, error);
  }
  
  return {
    isUsed: usedIn.length > 0,
    usedIn,
  };
}

/**
 * Recursively scan directory for image files
 */
function scanDirectory(dirPath: string, urlPrefix: string, basePath: string): Array<{
  url: string;
  filename: string;
  size: number;
  createdAt: Date;
}> {
  const mediaItems: Array<{ url: string; filename: string; size: number; createdAt: Date }> = [];
  
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
            const url = `/${relativePath.replace(/\\/g, '/')}`;
            
            mediaItems.push({
              url,
              filename: entry.name,
              size: stats.size,
              createdAt: stats.birthtime,
            });
          } catch (statError: any) {
            if (statError.code === 'ENOENT') {
              continue;
            }
            console.warn(`[MEDIA-MONITOR] Error accessing file: ${fullPath}`, statError);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[MEDIA-MONITOR] Error scanning directory ${dirPath}:`, error);
  }
  
  return mediaItems;
}

export async function GET(req: NextRequest) {
  try {
    // Authentication & permission check
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

    // Get filter params
    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all'; // all, used, orphan
    const sourceFilter = searchParams.get('source'); // MANUAL, AI_GENERATED, SCHEDULER
    const search = searchParams.get('search') || '';

    // Scan all media directories
    const basePath = process.cwd();
    const allMediaItems: Array<{ url: string; filename: string; size: number; createdAt: Date }> = [];
    
    for (const dir of MEDIA_DIRECTORIES) {
      const fullDirPath = path.join(basePath, dir.path);
      const items = scanDirectory(fullDirPath, dir.urlPrefix, basePath);
      allMediaItems.push(...items);
    }

    // Process each media item
    const processedItems: MediaMonitorItem[] = [];
    
    for (const item of allMediaItems) {
      // Verify file exists
      let filePath = path.join(process.cwd(), item.url.startsWith('/') ? item.url.slice(1) : item.url);
      filePath = path.normalize(filePath);
      filePath = path.resolve(filePath);
      
      if (!fs.existsSync(filePath)) {
        const altPath = path.join(process.cwd(), 'public', item.url.startsWith('/') ? item.url.slice(1) : item.url);
        if (!fs.existsSync(altPath)) {
          continue;
        }
        filePath = path.resolve(altPath);
      }
      
      try {
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
          continue;
        }
      } catch {
        continue;
      }
      
      // Check usage
      const usage = await checkMediaUsageDetailed(item.url);
      
      // Detect source
      const source = await detectMediaSource(item.url);
      
      // Apply filters
      if (filter === 'used' && !usage.isUsed) continue;
      if (filter === 'orphan' && usage.isUsed) continue;
      if (sourceFilter && source !== sourceFilter) continue;
      if (search && !item.filename.toLowerCase().includes(search.toLowerCase()) && 
          !item.url.toLowerCase().includes(search.toLowerCase())) {
        continue;
      }
      
      processedItems.push({
        id: item.url,
        url: item.url,
        filename: item.filename,
        thumbnail: item.url, // Use URL as thumbnail
        size: item.size,
        createdAt: item.createdAt,
        source,
        usedIn: usage.usedIn,
        status: usage.isUsed ? 'USED' : 'ORPHAN',
      });
    }
    
    // Sort by created date (newest first)
    processedItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Calculate stats
    const total = processedItems.length;
    const used = processedItems.filter(i => i.status === 'USED').length;
    const orphan = processedItems.filter(i => i.status === 'ORPHAN').length;
    
    return NextResponse.json({
      success: true,
      media: processedItems,
      stats: {
        total,
        used,
        orphan,
      },
    });

  } catch (error: any) {
    console.error('❌ [GET /api/admin/media/monitor] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}
