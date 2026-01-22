/**
 * Get blog by slug (for analytics tracking)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const blog = await prisma.blog.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        categoryId: true,
        // Tags might be stored differently, adjust based on schema
        metaKeywords: true, // Using metaKeywords as tags for now
      },
    });

    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    // Parse tags from metaKeywords (assuming it's JSON string)
    let tags: string[] = [];
    if (blog.metaKeywords) {
      try {
        tags = typeof blog.metaKeywords === 'string' 
          ? JSON.parse(blog.metaKeywords) 
          : Array.isArray(blog.metaKeywords) 
          ? blog.metaKeywords 
          : [];
      } catch {
        // If not JSON, treat as string
        tags = [];
      }
    }

    return NextResponse.json({
      ...blog,
      tags,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch blog' },
      { status: 500 }
    );
  }
}
