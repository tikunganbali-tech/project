/**
 * PHASE C2-A — MEDIA DELETE API
 * 
 * Endpoint: DELETE /api/admin/media/delete?url=<encoded-url>
 * 
 * Fungsi: Delete media file (hanya jika UNUSED)
 * 
 * Validasi:
 * - Role: admin / super_admin
 * - Media harus UNUSED
 * - Konfirmasi sebelum delete
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Check if a media URL is used in the database
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
    
    // Check Products - description & specifications (HTML may contain image URLs)
    const productsWithImageInContent = await prisma.product.findMany({
      where: {
        OR: [
          { description: { contains: url } },
          { specifications: { contains: url } },
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
    
    // Check Blog
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
    const blogsWithContent = await prisma.blog.findMany({
      where: { content: { contains: url } },
      select: { id: true },
    });
    
    // Check BlogPost content
    const blogPostsWithContent = await prisma.blogPost.findMany({
      where: { content: { contains: url } },
      select: { id: true },
    });
    
    if (blogs.length > 0 || blogPosts.length > 0 || blogsWithContent.length > 0 || blogPostsWithContent.length > 0) {
      usedIn.push('blog');
    }
    
    // Check Product Categories
    const categories = await prisma.productCategory.findMany({
      where: { imageUrl: url },
      select: { id: true },
    });
    
    if (categories.length > 0) {
      usedIn.push('categories');
    }
    
    // Check SiteSettings
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
    
    if (settings) {
      usedIn.push('settings');
    }
    
    // Check BrandEntity
    const brandEntities = await prisma.brandEntity.findMany({
      where: { logoUrl: url },
      select: { id: true },
    });
    
    if (brandEntities.length > 0) {
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
  }
  
  return {
    isUsed: usedIn.length > 0,
    usedIn,
  };
}

export async function DELETE(req: NextRequest) {
  try {
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

    // 📥 GET URL FROM QUERY PARAM
    const { searchParams } = new URL(req.url);
    const mediaUrl = searchParams.get('url');
    
    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'Media URL is required' },
        { status: 400 }
      );
    }
    
    // 🔍 CHECK IF MEDIA IS USED
    const usage = await checkMediaUsage(mediaUrl);
    
    if (usage.isUsed) {
      return NextResponse.json(
        { 
          error: 'Cannot delete: Media is currently in use',
          usedIn: usage.usedIn,
        },
        { status: 400 }
      );
    }
    
    // 📁 CONVERT URL TO FILE PATH
    // Remove leading slash and convert to file path
    const relativePath = mediaUrl.startsWith('/') ? mediaUrl.slice(1) : mediaUrl;
    const filePath = path.join(process.cwd(), 'public', relativePath);
    
    // ✅ VERIFY FILE EXISTS
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // 🗑️ DELETE FILE
    try {
      fs.unlinkSync(filePath);
    } catch (deleteError: any) {
      console.error(`Error deleting file ${filePath}:`, deleteError);
      return NextResponse.json(
        { error: 'Failed to delete file', details: deleteError.message },
        { status: 500 }
      );
    }
    
    // ✅ VERIFY FILE WAS DELETED
    if (fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File deletion failed' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully',
      url: mediaUrl,
    });

  } catch (error: any) {
    console.error('❌ [DELETE /api/admin/media/delete] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
      },
      { status: 500 }
    );
  }
}
