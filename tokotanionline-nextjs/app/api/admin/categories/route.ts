/**
 * PHASE 1: Universal Category Core API
 * 
 * Purpose: Unified category system that scales to any niche
 * - GET: List categories with context filter (product/blog/ai)
 * - POST: Create category with auto slug generation and level calculation
 * - Role: super_admin / admin
 * - parentId optional (null = root category)
 * - Type: Flexible string for any niche
 * - Context: Auto-creates product, blog, ai contexts
 * 
 * Behavior controlled by CategoryContext (product, blog, ai)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  generateUnifiedCategorySlug,
  calculateCategoryLevel,
  validateCategory,
  upsertCategory,
  getCategoriesByContext,
  CategoryContextType,
} from '@/lib/unified-category-utils';

const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Nama kategori diperlukan'),
  slug: z.string().optional(), // Optional: auto-generate if not provided
  type: z.string().min(1, 'Type diperlukan'), // Flexible string for any niche
  parentId: z.string().nullable().optional(), // null = root category, string = subcategory
  isActive: z.boolean().optional().default(true),
  brandId: z.string().nullable().optional(), // Optional: null = global category
});

async function resolveBrandIdFromRequest(request: NextRequest, session: any): Promise<string> {
  // Priority 1: Explicit header override (admin UI brand switch)
  const headerBrandId = request.headers.get('x-brand-id');
  if (headerBrandId) return headerBrandId;

  // Priority 2: Admin assignment in DB (regular admin)
  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email! },
    select: { brandId: true, role: true },
  });
  if (admin?.brandId) return admin.brandId;

  // Priority 3: Super admin fallback to first ACTIVE brand
  const firstActiveBrand = await prisma.brand.findFirst({
    where: { brandStatus: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!firstActiveBrand) {
    throw new Error('No ACTIVE brand found. Please create a brand first.');
  }
  return firstActiveBrand.id;
}

// GET /api/admin/categories?context=product|blog|ai - List categories with context filter
export async function GET(request: NextRequest) {
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

    const brandId = await resolveBrandIdFromRequest(request, session);
    const { searchParams } = new URL(request.url);
    const contextFilter = searchParams.get('context') as CategoryContextType | null;

    // Fetch categories filtered by context
    const categories = await getCategoriesByContext(contextFilter || 'product', {
      brandId,
      isActive: true,
    });

    // Build tree structure
    const roots = categories.filter((cat) => !cat.parentId);
    const buildTree = (parentId: string | null) => {
      return categories
        .filter((cat) => cat.parentId === parentId)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          type: cat.type,
          level: cat.level,
          parentId: cat.parentId,
          isActive: cat.isActive,
          children: buildTree(cat.id),
          productCount: cat._count?.products || 0,
          blogCount: (cat._count?.blogs || 0) + (cat._count?.blogPosts || 0),
          childCount: cat.children.length,
        }));
    };

    const tree = buildTree(null);

    // Helper to build category path
    const buildCategoryPath = (categoryId: string, categories: any[]): string => {
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat) return '';
      
      const path: string[] = [];
      let current: any = cat;
      
      while (current) {
        path.unshift(current.name);
        if (current.parentId) {
          current = categories.find((c) => c.id === current.parentId);
        } else {
          break;
        }
      }
      
      return path.join(' > ');
    };

    // Flat list with counts and path
    const flatWithCounts = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      type: cat.type,
      level: cat.level,
      parentId: cat.parentId,
      isActive: cat.isActive,
      isStructural: cat.isStructural || false,
      productCount: cat._count?.products || 0,
      blogCount: (cat._count?.blogs || 0) + (cat._count?.blogPosts || 0),
      childCount: cat.children.length,
      path: buildCategoryPath(cat.id, categories),
    }));

    return NextResponse.json({
      categories: tree,
      flat: flatWithCounts,
      brandId,
      contextFilter: contextFilter || 'product',
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// POST /api/admin/categories - Create category with auto slug generation and context creation
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const data = categoryCreateSchema.parse(body);

    const brandId = await resolveBrandIdFromRequest(request, session);

    // Validate category
    const validation = await validateCategory(
      {
        ...data,
        brandId: data.brandId || brandId,
      },
      false
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.errors },
        { status: 400 }
      );
    }

    // Calculate level
    const level = await calculateCategoryLevel(data.parentId);

    // Generate slug if not provided
    const slug = data.slug || (await generateUnifiedCategorySlug(data.name));

    // Create category using upsert (idempotent)
    const result = await upsertCategory({
      name: data.name,
      slug,
      parentId: data.parentId || null,
      level,
      type: data.type,
      isActive: data.isActive ?? true,
      brandId: data.brandId || brandId,
    });

    // Auto-create context rows (product, blog, ai)
    await Promise.all([
      prisma.categoryContext.upsert({
        where: {
          categoryId_context: {
            categoryId: result.id,
            context: 'product',
          },
        },
        update: {},
        create: {
          categoryId: result.id,
          context: 'product',
        },
      }),
      prisma.categoryContext.upsert({
        where: {
          categoryId_context: {
            categoryId: result.id,
            context: 'blog',
          },
        },
        update: {},
        create: {
          categoryId: result.id,
          context: 'blog',
        },
      }),
      prisma.categoryContext.upsert({
        where: {
          categoryId_context: {
            categoryId: result.id,
            context: 'ai',
          },
        },
        update: {},
        create: {
          categoryId: result.id,
          context: 'ai',
        },
      }),
    ]);

    // Fetch created category with relations
    const category = await prisma.category.findUnique({
      where: { id: result.id },
      include: {
        parent: true,
        children: true,
        contexts: true,
        _count: {
          select: {
            products: true,
            blogs: true,
            blogPosts: true,
          },
        },
      },
    });

    return NextResponse.json({
      category,
      message: result.created
        ? data.parentId
          ? 'Subcategory created'
          : 'Category created'
        : 'Category already exists',
      created: result.created,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

