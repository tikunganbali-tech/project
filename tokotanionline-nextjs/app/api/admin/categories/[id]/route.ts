/**
 * FITUR 3: Category Update, Move & Delete API (PROFESIONAL)
 * 
 * Purpose: Update category details, move in hierarchy, and safe deletion
 * - PUT: Update name, slug, description, SEO fields
 * - PATCH: Move category (change parentId)
 * - DELETE: Delete category dengan proteksi (check usage & children)
 * - Validations:
 *   - No circular parent (A → B → A)
 *   - Parent must exist and same type
 *   - DELETE: DITOLAK jika masih dipakai produk/blog atau punya child
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { generateCategorySlug, wouldCreateCircular, canDeleteCategory } from '@/lib/category-utils';

const categoryUpdateSchema = z.object({
  name: z.string().min(1, 'Nama kategori diperlukan').optional(),
  slug: z.string().min(1, 'Slug diperlukan').optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

const categoryMoveSchema = z.object({
  parentId: z.string().nullable(), // null = move to root, string = move to parent
});

// Removed: wouldCreateCircular is now imported from category-utils

// PUT /api/admin/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: super_admin or admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if category exists
    const existing = await prisma.productCategory.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = categoryUpdateSchema.parse(body);

    // If slug is being updated, check if new slug exists (per type + brand, excluding current)
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.productCategory.findFirst({
        where: {
          slug: data.slug,
          type: existing.type,
          brandId: existing.brandId,
          id: { not: params.id },
        },
      });

      if (slugExists) {
        return NextResponse.json({ 
          error: `Slug "${data.slug}" sudah digunakan untuk kategori ${existing.type}` 
        }, { status: 400 });
      }
    }

    // If name is being updated, check duplicate name pada parent yang sama (per type)
    if (data.name && data.name !== existing.name) {
      const nameExists = await prisma.productCategory.findFirst({
        where: {
          name: data.name,
          type: existing.type,
          parentId: existing.parentId,
          brandId: existing.brandId,
          id: { not: params.id },
        },
      });

      if (nameExists) {
        return NextResponse.json({ 
          error: 'Nama kategori sudah digunakan pada parent yang sama' 
        }, { status: 400 });
      }
    }

    // Update category (name, slug, description, imageUrl, SEO fields)
    // Does not touch parentId, type, or products
    const category = await prisma.productCategory.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
        ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: true,
      },
    });

    return NextResponse.json({ 
      category,
      message: 'Category updated',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        issues: error.issues 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// PATCH /api/admin/categories/[id] - Move category (change parentId)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: super_admin or admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if category exists
    const existing = await prisma.productCategory.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const { parentId } = categoryMoveSchema.parse(body);

    // If parentId is provided (not null), verify parent exists and check max depth
    if (parentId) {
      const parent = await prisma.productCategory.findUnique({
        where: { id: parentId },
        include: { parent: true },
      });

      if (!parent) {
        return NextResponse.json({ 
          error: 'Parent category tidak ditemukan' 
        }, { status: 404 });
      }

      // Parent must be same type
      if (parent.type !== existing.type) {
        return NextResponse.json({
          error: 'Parent category harus memiliki type yang sama',
          message: `Parent adalah ${parent.type}, tetapi kategori ini adalah ${existing.type}`,
        }, { status: 400 });
      }

      // Max depth validation: parent cannot have a parent (max 2 levels)
      if (parent.parentId) {
        return NextResponse.json({
          error: 'Max depth exceeded',
          message: 'Cannot move category to a subcategory. Maximum depth is 2 levels.',
        }, { status: 400 });
      }
    }

    // Check for circular reference
    const isCircular = await wouldCreateCircular(params.id, parentId);
    if (isCircular) {
      return NextResponse.json({ 
        error: 'Circular reference detected',
        message: 'Cannot move category to create circular parent relationship',
      }, { status: 400 });
    }

    // Move category (update parentId only)
    // Does not touch products or other fields
    const category = await prisma.productCategory.update({
      where: { id: params.id },
      data: {
        parentId: parentId, // null = root, string = subcategory
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: true,
      },
    });

    return NextResponse.json({ 
      category,
      message: parentId ? 'Category moved to subcategory' : 'Category moved to root',
      previousParentId: existing.parentId,
      newParentId: parentId,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        issues: error.issues 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE /api/admin/categories/[id] - Delete category dengan proteksi
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Role guard: super_admin or admin only
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if category exists
    const existing = await prisma.productCategory.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category can be deleted (FITUR 3: DELETE BERSYARAT)
    const deleteCheck = await canDeleteCategory(params.id);
    
    if (!deleteCheck.canDelete) {
      return NextResponse.json({
        error: 'Cannot delete category',
        message: deleteCheck.reason,
        details: {
          productCount: deleteCheck.productCount || 0,
          blogCount: deleteCheck.blogCount || 0,
          childCount: deleteCheck.childCount || 0,
        },
      }, { status: 400 });
    }

    // Safe to delete
    await prisma.productCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ 
      message: 'Category deleted successfully',
      deletedId: params.id,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

