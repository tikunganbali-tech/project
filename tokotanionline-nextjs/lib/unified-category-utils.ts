/**
 * PHASE 1: UNIVERSAL CATEGORY CORE - Utilities
 * 
 * Professional category management utilities for unified category system:
 * - Slug generation with auto-increment for duplicates
 * - Level auto-calculation (1, 2, 3)
 * - Validation (slug unique, parent valid, no orphans)
 * - Idempotent insert (skip if exists)
 * - Context management (product, blog, ai)
 */

import { prisma } from '@/lib/db';
import { normalizeSlug } from './content-contract';

export type CategoryContextType = 'product' | 'blog' | 'ai';

export interface CategoryInput {
  name: string;
  slug?: string; // Optional: auto-generate if not provided
  parentId?: string | null;
  level?: number; // Optional: auto-calculate if not provided
  type: string; // Flexible string for any niche
  isActive?: boolean;
  isStructural?: boolean; // Structural node (grouping only, no product/blog context)
  brandId?: string | null;
}

/**
 * Calculate category level based on parent chain
 * Rules:
 * - Root (parentId = null) → level 1
 * - Child of level 1 → level 2
 * - Child of level 2 → level 3
 * - Child of level 3 → level 4
 * - Max depth: 4 levels (to support structural nodes)
 */
export async function calculateCategoryLevel(
  parentId: string | null | undefined
): Promise<number> {
  if (!parentId) {
    return 1; // Root category
  }

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { level: true },
  });

  if (!parent) {
    throw new Error(`Parent category with id ${parentId} not found`);
  }

  const level = parent.level + 1;

  if (level > 4) {
    throw new Error(`Maximum category depth is 4. Cannot create level ${level} category`);
  }

  return level;
}

/**
 * Generate slug from name with auto-increment for duplicates
 * Rules:
 * - Lowercase
 * - Hyphenated
 * - Globally unique
 * - Auto-increment for duplicates (e.g., pertanian, pertanian-2, pertanian-3)
 */
export async function generateUnifiedCategorySlug(
  name: string,
  excludeId?: string
): Promise<string> {
  // Generate base slug
  let baseSlug = normalizeSlug(name);

  // Check if slug exists (globally unique)
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        slug,
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
 * Validate category before insert/update
 * Rules:
 * - Slug globally unique
 * - ParentId valid (if provided)
 * - No circular references
 * - Level valid (1, 2, or 3)
 */
export async function validateCategory(
  data: CategoryInput & { id?: string },
  isUpdate: boolean = false
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate slug uniqueness
  const slug = data.slug || (await generateUnifiedCategorySlug(data.name, data.id));
  const existing = await prisma.category.findFirst({
    where: {
      slug,
      ...(isUpdate && data.id ? { id: { not: data.id } } : {}),
    },
  });

  if (existing) {
    errors.push(`Slug "${slug}" already exists. Slug must be globally unique.`);
  }

  // Validate parent exists (if provided)
  if (data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parentId },
      select: { id: true, level: true },
    });

    if (!parent) {
      errors.push(`Parent category with id ${data.parentId} not found.`);
    } else {
      // Validate level (max 4)
      const calculatedLevel = parent.level + 1;
      if (calculatedLevel > 4) {
        errors.push(`Cannot create category: maximum depth is 4 levels. Parent is level ${parent.level}.`);
      }

      // Check for circular reference (only on update)
      if (isUpdate && data.id) {
        const isCircular = await wouldCreateCircular(data.id, data.parentId);
        if (isCircular) {
          errors.push(`Cannot set parent: would create circular reference.`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check for circular reference in parent chain
 */
async function wouldCreateCircular(
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
    const parent = await prisma.category.findUnique({
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

/**
 * Idempotent category insert
 * - Skip if exists (by slug)
 * - Auto-calculate level if not provided
 * - Auto-generate slug if not provided
 * - Returns existing or newly created category
 */
export async function upsertCategory(
  data: CategoryInput
): Promise<{ id: string; name: string; slug: string; level: number; isStructural: boolean; created: boolean }> {
  // Generate slug if not provided
  const slug = data.slug || (await generateUnifiedCategorySlug(data.name));

  // Check if exists
  const existing = await prisma.category.findUnique({
    where: { slug },
  });

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      slug: existing.slug,
      level: existing.level,
      isStructural: existing.isStructural,
      created: false,
    };
  }

  // Calculate level if not provided
  const level = data.level ?? (await calculateCategoryLevel(data.parentId));

  // Validate before insert
  const validation = await validateCategory({ ...data, slug, level }, false);
  if (!validation.valid) {
    throw new Error(`Category validation failed: ${validation.errors.join(', ')}`);
  }

  // Create category
  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      parentId: data.parentId || null,
      level,
      type: data.type,
      isActive: data.isActive ?? true,
      isStructural: data.isStructural ?? false,
      brandId: data.brandId || null,
    },
  });

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    level: category.level,
    isStructural: category.isStructural,
    created: true,
  };
}

/**
 * Insert category tree with hierarchy preservation
 * - Processes categories in order (parents before children)
 * - Auto-detects structural nodes (nodes with children that also have children)
 * - Structural nodes: context = ai only
 * - Leaf nodes: context = product, blog, ai
 * - Idempotent (skip if exists)
 */
export async function insertCategoryTree(
  tree: Array<CategoryInput & { children?: CategoryInput[] }>,
  brandId?: string | null
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  async function processCategory(
    cat: CategoryInput & { children?: CategoryInput[] },
    parentId?: string | null
  ): Promise<void> {
    try {
      // Upsert category first to get the actual level
      const result = await upsertCategory({
        ...cat,
        parentId: parentId || cat.parentId || null,
        brandId: brandId || cat.brandId || null,
      });

      // Determine if this is a structural node AFTER we know the level
      // Structural = has children that also have children, AND not root (level > 1)
      let isStructural = false;
      if (result.level > 1 && (cat as any).children && (cat as any).children.length > 0) {
        // Check if any child has children
        isStructural = (cat as any).children.some((child: any) => child.children && child.children.length > 0);
      }

      // Update isStructural if it was explicitly set or auto-detected
      if (cat.isStructural !== undefined) {
        isStructural = cat.isStructural;
      }

      // Update category if structural flag changed
      if (result.isStructural !== isStructural) {
        await prisma.category.update({
          where: { id: result.id },
          data: { isStructural },
        });
      }

      if (result.created) {
        inserted++;
        
        // Create context rows based on node type
        
        if (isStructural) {
          // Structural node: only AI context
          await prisma.categoryContext.upsert({
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
          });
        } else {
          // Root categories and leaf nodes: product, blog, ai contexts
          // Leaf node: product, blog, ai contexts
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
        }
      } else {
        skipped++;
      }

      // Process children recursively
      if (cat.children && cat.children.length > 0) {
        for (const child of cat.children) {
          await processCategory(child, result.id);
        }
      }
    } catch (error: any) {
      const errorMsg = `Failed to insert category "${cat.name}": ${error.message}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  // Process root categories first
  for (const root of tree) {
    await processCategory(root);
  }

  return { inserted, skipped, errors };
}

/**
 * Get category with full parent chain
 * Used for AI generator to build keyword cluster from tree
 */
export async function getCategoryWithParentChain(
  categoryId: string
): Promise<{
  id: string;
  name: string;
  slug: string;
  level: number;
  type: string;
  parentChain: Array<{ id: string; name: string; slug: string; level: number }>;
}> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      slug: true,
      level: true,
      type: true,
      parentId: true,
    },
  });

  if (!category) {
    throw new Error(`Category with id ${categoryId} not found`);
  }

  // Build parent chain
  const parentChain: Array<{ id: string; name: string; slug: string; level: number }> = [];
  let currentParentId = category.parentId;

  while (currentParentId) {
    const parent = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: {
        id: true,
        name: true,
        slug: true,
        level: true,
        parentId: true,
      },
    });

    if (!parent) {
      break;
    }

    parentChain.unshift({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
      level: parent.level,
    });

    currentParentId = parent.parentId;
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    level: category.level,
    type: category.type,
    parentChain,
  };
}

/**
 * Get categories filtered by context
 * Used for frontend queries (product UI, blog UI, etc.)
 */
export async function getCategoriesByContext(
  context: CategoryContextType,
  options?: {
    brandId?: string | null;
    isActive?: boolean;
    includeInactive?: boolean;
  }
) {
  return await prisma.category.findMany({
    where: {
      contexts: {
        some: {
          context,
        },
      },
      ...(options?.brandId !== undefined ? { brandId: options.brandId } : {}),
      ...(options?.isActive !== undefined
        ? { isActive: options.isActive }
        : options?.includeInactive
          ? {}
          : { isActive: true }),
    },
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
    orderBy: [
      { level: 'asc' },
      { name: 'asc' },
    ],
  });
}
