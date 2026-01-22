/**
 * PRODUCT-AWARE BLOG AI LOGIC
 * 
 * Prinsip:
 * 1. KATEGORI = AKAR NICHE (TIDAK BOLEH DILANGGAR)
 * 2. PRODUK = PENGAYA KONTEN (BOLEH BANYAK)
 * 3. BLOG = MEDIA SEO PENDUKUNG PRODUK
 * 4. BLOG TIDAK BOLEH BERHENTI DI KATEGORI
 * 5. BLOG WAJIB MENGARAH KE PRODUK TERKAIT
 */

import { prisma } from '@/lib/db';
import { getCategoryWithParentChain } from './unified-category-utils';

export interface ProductAwareContext {
  mode: 'PRODUCT_AWARE' | 'CATEGORY_ONLY';
  category: {
    id: string;
    name: string;
    slug: string;
    level: number;
    parentChain: Array<{ id: string; name: string; slug: string; level: number }>;
  };
  products: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    price: number;
    categoryId: string;
  }>;
  keywordTree: {
    primary: string;
    secondary: string[];
    longTail: string[];
  };
  intentType: string;
}

/**
 * STEP 1: Category Tree Load
 * Load current category with parent chain and structural nodes
 */
export async function loadCategoryTree(categoryId: string) {
  const categoryWithChain = await getCategoryWithParentChain(categoryId);
  
  // Load semantic structural nodes (if any)
  const structuralNodes = await prisma.category.findMany({
    where: {
      id: { in: categoryWithChain.parentChain.map((p) => p.id) },
      isStructural: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      level: true,
    },
  });

  return {
    current: categoryWithChain,
    parentChain: categoryWithChain.parentChain,
    structuralNodes,
  };
}

/**
 * STEP 2: Product Discovery
 * Query products by category with relevance ordering
 */
export async function discoverProducts(
  categoryId: string,
  limit: number = 5
): Promise<Array<{
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  categoryId: string;
}>> {
  const products = await prisma.product.findMany({
    where: {
      unifiedCategoryId: categoryId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      price: true,
      unifiedCategoryId: true,
      priority: true,
      salesWeight: true,
    },
    orderBy: [
      { priority: 'desc' },
      { salesWeight: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    price: p.price,
    categoryId: p.unifiedCategoryId || categoryId,
  }));
}

/**
 * STEP 3: Keyword Tree Generation
 * Build keywords from category and products
 */
export function generateKeywordTree(
  category: {
    name: string;
    parentChain: Array<{ name: string }>;
  },
  products: Array<{ name: string; description: string }>,
  intentType: string
): {
  primary: string;
  secondary: string[];
  longTail: string[];
} {
  // A. CATEGORY CORE
  const categoryCore = [
    category.name,
    ...category.parentChain.map((p) => p.name),
  ];

  // B. PRODUCT CONTEXT
  const productNames = products.map((p) => p.name);
  const productTypes = products.map((p) => {
    // Extract product type from name/description
    const words = p.name.split(' ');
    return words.length > 1 ? words.slice(0, 2).join(' ') : p.name;
  });

  // C. SEARCH INTENT
  const intentKeywords = [
    'cara',
    'panduan',
    'tips',
    'rekomendasi',
    'perbandingan',
    'solusi',
  ].filter((intent) => intentType.toLowerCase().includes(intent));

  // PRIMARY KEYWORD (kategori)
  const primary = category.name;

  // SECONDARY KEYWORDS (produk + kategori)
  const secondary: string[] = [];
  products.forEach((product) => {
    secondary.push(`${product.name} ${category.name}`);
    secondary.push(`${category.name} ${product.name}`);
  });
  // Add category + intent combinations
  intentKeywords.forEach((intent) => {
    secondary.push(`${intent} ${category.name}`);
  });

  // LONG-TAIL KEYWORDS (problem + solusi + produk)
  const longTail: string[] = [];
  products.forEach((product) => {
    // Problem-based long-tail
    longTail.push(`cara menggunakan ${product.name} untuk ${category.name}`);
    longTail.push(`tips memilih ${product.name} ${category.name}`);
    longTail.push(`solusi ${category.name} dengan ${product.name}`);
    longTail.push(`panduan ${product.name} ${category.name}`);
  });
  // Category-based long-tail
  longTail.push(`cara mengatasi masalah ${category.name}`);
  longTail.push(`tips sukses ${category.name}`);
  longTail.push(`rekomendasi terbaik ${category.name}`);

  return {
    primary,
    secondary: Array.from(new Set(secondary)), // Remove duplicates
    longTail: Array.from(new Set(longTail)), // Remove duplicates
  };
}

/**
 * STEP 4: Determine Intent Type
 * Analyze title/category to determine search intent
 */
export function determineIntentType(
  title: string,
  categoryName: string
): string {
  const titleLower = title.toLowerCase();
  const categoryLower = categoryName.toLowerCase();

  // Intent detection patterns
  if (titleLower.includes('cara') || titleLower.includes('panduan')) {
    return 'cara';
  }
  if (titleLower.includes('tips') || titleLower.includes('trik')) {
    return 'tips';
  }
  if (titleLower.includes('rekomendasi') || titleLower.includes('terbaik')) {
    return 'rekomendasi';
  }
  if (titleLower.includes('perbandingan') || titleLower.includes('vs')) {
    return 'perbandingan';
  }
  if (titleLower.includes('solusi') || titleLower.includes('mengatasi')) {
    return 'solusi';
  }

  // Default: panduan
  return 'panduan';
}

/**
 * MAIN FUNCTION: Build Product-Aware Context
 * Combines all steps into a single context object
 */
export async function buildProductAwareContext(
  categoryId: string,
  title: string,
  productLimit: number = 5
): Promise<ProductAwareContext> {
  // STEP 1: Category Tree Load
  const categoryTree = await loadCategoryTree(categoryId);
  const category = categoryTree.current;

  // STEP 2: Product Discovery
  const products = await discoverProducts(categoryId, productLimit);

  // Determine mode
  const mode = products.length > 0 ? 'PRODUCT_AWARE' : 'CATEGORY_ONLY';

  // STEP 3: Intent Type
  const intentType = determineIntentType(title, category.name);

  // STEP 4: Keyword Tree Generation
  const keywordTree = generateKeywordTree(
    {
      name: category.name,
      parentChain: category.parentChain,
    },
    products,
    intentType
  );

  return {
    mode,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      level: category.level,
      parentChain: category.parentChain,
    },
    products,
    keywordTree,
    intentType,
  };
}

/**
 * Validate: Blog without products only allowed if product_count = 0
 */
export async function validateBlogProductRequirement(
  categoryId: string,
  relatedProductIds: string[] | null | undefined
): Promise<{ valid: boolean; error?: string }> {
  const productCount = await prisma.product.count({
    where: {
      unifiedCategoryId: categoryId,
      isActive: true,
    },
  });

  if (productCount > 0) {
    // Products exist, blog MUST have related products
    if (!relatedProductIds || relatedProductIds.length === 0) {
      return {
        valid: false,
        error: `Category has ${productCount} active products. Blog must include related products when products are available.`,
      };
    }
  }

  return { valid: true };
}
