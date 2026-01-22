/**
 * FITUR 3: Category System Utilities
 * 
 * Professional category management utilities:
 * - Slug generation with auto-increment for duplicates
 * - Tree building for hierarchy
 * - Validation helpers
 */

import { prisma } from '@/lib/db';
import { normalizeSlug } from './content-contract';

export type CategoryType = 'PRODUCT' | 'BLOG';

/**
 * Generate slug from name with auto-increment for duplicates
 * Rules:
 * - Lowercase
 * - Spasi → -
 * - Anti duplikat: Jika pertanian sudah ada → pertanian-2
 * - Slug bisa diedit manual (dengan validasi)
 */
export async function generateCategorySlug(
  name: string,
  type: CategoryType,
  brandId: string,
  excludeId?: string
): Promise<string> {
  // Generate base slug
  let baseSlug = normalizeSlug(name);
  
  // Check if slug exists (per type + brand)
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.productCategory.findFirst({
      where: {
        slug,
        type: type as any,
        brandId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    
    if (!existing) {
      return slug;
    }
    
    // Increment counter
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

/**
 * Build category tree structure
 * Used for:
 * - Admin selector
 * - Frontend navigation
 */
export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  description?: string | null;
  parentId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  children: CategoryTreeNode[];
  productCount?: number;
  blogCount?: number;
  level: number;
}

export function buildCategoryTree(
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    type: CategoryType;
    description?: string | null;
    parentId?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    _count?: {
      products?: number;
      blogs?: number;
    };
  }>,
  level: number = 0
): CategoryTreeNode[] {
  // Get root categories (no parent)
  const roots = categories.filter((cat) => !cat.parentId);
  
  return roots.map((root) => {
    const children = categories.filter((cat) => cat.parentId === root.id);
    
    return {
      id: root.id,
      name: root.name,
      slug: root.slug,
      type: root.type,
      description: root.description,
      parentId: root.parentId,
      seoTitle: root.seoTitle,
      seoDescription: root.seoDescription,
      children: buildCategoryTree(children, level + 1),
      productCount: root._count?.products || 0,
      blogCount: root._count?.blogs || 0, // FITUR 3: Blog count
      level,
    };
  });
}

/**
 * Check if category can be deleted
 * Returns error message if cannot be deleted, null if safe
 */
export async function canDeleteCategory(categoryId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  productCount?: number;
  blogCount?: number;
  childCount?: number;
}> {
  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: {
          products: true,
            // blogs: true, // Removed - not in schema // FITUR 3: Blog count
          children: true,
        },
      },
    },
  });
  
  if (!category) {
    return { canDelete: false, reason: 'Category not found' };
  }
  
  const productCount = category._count?.products || 0;
  const blogCount = 0; // FITUR 3: Blog count (removed - not in schema)
  const childCount = category._count?.children || 0;
  
  if (productCount > 0 || blogCount > 0) {
    const reasons: string[] = [];
    if (productCount > 0) {
      reasons.push(`${productCount} produk`);
    }
    if (blogCount > 0) {
      reasons.push(`${blogCount} blog`);
    }
    return {
      canDelete: false,
      reason: `Kategori masih digunakan oleh ${reasons.join(' dan ')}`,
      productCount,
      blogCount,
    };
  }
  
  if (childCount > 0) {
    return {
      canDelete: false,
      reason: `Kategori memiliki ${childCount} subkategori`,
      childCount,
    };
  }
  
  return { canDelete: true };
}

/**
 * Check for circular reference in parent chain
 */
export async function wouldCreateCircular(
  categoryId: string,
  newParentId: string | null
): Promise<boolean> {
  // If moving to root (null), no circular possible
  if (!newParentId) {
    return false;
  }
  
  // If new parent is the category itself, circular
  if (newParentId === categoryId) {
    return true;
  }
  
  // Traverse up the parent chain from newParentId
  // If we encounter categoryId, it means circular
  let currentParentId: string | null = newParentId;
  const visited = new Set<string>();
  
  while (currentParentId) {
    // Prevent infinite loop
    if (visited.has(currentParentId)) {
      break;
    }
    visited.add(currentParentId);
    
    // If we find the category being moved in the chain, it's circular
    if (currentParentId === categoryId) {
      return true;
    }
    
    // Get parent of current parent
    const parent: { parentId: string | null } | null = await prisma.productCategory.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    
    if (!parent) {
      break;
    }
    
    currentParentId = parent.parentId;
  }
  
  return false;
}
