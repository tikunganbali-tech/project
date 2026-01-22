/**
 * PHASE B — API RESPONSE SCHEMAS (LOCK CONTRACT)
 * 
 * Strict Zod schemas untuk semua public API responses.
 * 
 * Aturan keras:
 * - Tidak ada field opsional yang dipakai UI
 * - Jika field hilang → API FAIL (500 + log)
 * - Semua field yang digunakan UI harus REQUIRED
 * 
 * Purpose: Memastikan Frontend & Admin TIDAK PERNAH MIKIR
 * dan tidak mungkin terjadi bug kontrak data seperti:
 * - slug is not defined
 * - field hilang tapi dipakai
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Category slug is required'),
});

const SEOSchema = z.object({
  title: z.string().min(1, 'SEO title is required'),
  description: z.string().min(1, 'SEO description is required'),
  schemaJson: z.string().nullable(),
});

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

/**
 * Product List Item Schema
 * 
 * Semua field yang digunakan ProductCard harus REQUIRED
 */
export const ProductListItemSchema = z.object({
  id: z.string().min(1, 'Product id is required'),
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Product slug is required'),
  imageUrl: z.string().nullable(),
  priceResolved: z.number().min(0, 'Price resolved must be >= 0'),
  price: z.number().min(0, 'Price must be >= 0'),
  discountPrice: z.number().nullable(),
  stock: z.number().int().min(0, 'Stock must be >= 0'),
  unit: z.string().min(1, 'Unit is required'),
  shopeeUrl: z.string().nullable(),
  tokopediaUrl: z.string().nullable(),
  shortDescription: z.string().nullable(),
  packagingVariants: z.string().nullable(),
  category: CategorySchema,
});

/**
 * Product List Response Schema
 */
export const ProductListResponseSchema = z.object({
  items: z.array(ProductListItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
  }),
});

/**
 * Product Detail Additional Info Schema
 * 
 * Semua field harus ada (bisa null), tapi tidak boleh undefined
 */
const ProductAdditionalInfoSchema = z.object({
  problemSolution: z.string().nullable(),
  applicationMethod: z.string().nullable(),
  dosage: z.string().nullable(),
  advantages: z.string().nullable(),
  safetyNotes: z.string().nullable(),
});

/**
 * Product Detail Schema
 * 
 * Semua field yang digunakan ProductDetail component harus REQUIRED
 */
export const ProductDetailSchema = z.object({
  id: z.string().min(1, 'Product id is required'),
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Product slug is required'),
  description: z.string().min(1, 'Product description is required'),
  imageGallery: z.array(z.string()).min(0, 'Image gallery must be array'),
  priceResolved: z.number().min(0, 'Price resolved must be >= 0'),
  shopeeUrl: z.string().nullable(),
  tokopediaUrl: z.string().nullable(),
  category: CategorySchema,
  additionalInfo: ProductAdditionalInfoSchema,
  seo: SEOSchema,
});

// ============================================================================
// BLOG SCHEMAS
// ============================================================================

/**
 * Blog List Item Schema
 */
export const BlogListItemSchema = z.object({
  id: z.string().min(1, 'Blog id is required'),
  title: z.string().min(1, 'Blog title is required'),
  slug: z.string().min(1, 'Blog slug is required'),
  excerpt: z.string().nullable(),
  publishedAt: z.union([z.string(), z.date()]),
});

/**
 * Blog List Response Schema
 */
export const BlogListResponseSchema = z.object({
  items: z.array(BlogListItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

/**
 * Blog Detail Schema
 * PHASE B2-L: Added FAQ and relatedProducts
 */
export const BlogDetailSchema = z.object({
  title: z.string().min(1, 'Blog title is required'),
  content: z.string().min(1, 'Blog content is required'),
  excerpt: z.string().nullable(),
  publishedAt: z.union([z.string(), z.date()]),
  seo: z.object({
    title: z.string().min(1, 'SEO title is required'),
    description: z.string().nullable(),
    schemaJson: z.string().nullable(),
  }),
  // PHASE B2-L: Optional FAQ and related products
  faq: z.array(z.object({
    q: z.string().min(1),
    a: z.string().min(1),
  })).optional(),
  relatedProducts: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    imageUrl: z.string().nullable(),
    priceResolved: z.number().min(0),
  })).optional(),
});

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

/**
 * Category List Item Schema
 */
export const CategoryListItemSchema = z.object({
  id: z.string().min(1, 'Category id is required'),
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Category slug is required'),
  summary: z.string().nullable(),
  type: z.string().min(1, 'Category type is required'),
  sortOrder: z.number().int(),
});

/**
 * Category List Response Schema
 */
export const CategoryListResponseSchema = z.object({
  categories: z.array(CategoryListItemSchema),
});

/**
 * Category Hub Schema
 */
export const CategoryHubSchema = z.object({
  category: z.object({
    id: z.string().min(1, 'Category id is required'),
    name: z.string().min(1, 'Category name is required'),
    slug: z.string().min(1, 'Category slug is required'),
    description: z.string().nullable(),
    summary: z.string().nullable(),
    type: z.string().min(1, 'Category type is required'),
  }),
  cornerstone: z.array(BlogListItemSchema),
  articles: z.array(BlogListItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate API response and throw if invalid
 * 
 * @param data - Response data to validate
 * @param schema - Zod schema to validate against
 * @param endpoint - Endpoint name for error logging
 * @returns Validated data
 * @throws Error with 500 status if validation fails
 */
export function validateApiResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  endpoint: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));

      console.error(`[API-VALIDATION] ${endpoint} validation failed:`, {
        endpoint,
        errors: errorDetails,
        data: JSON.stringify(data, null, 2),
      });

      throw new Error(
        `API response validation failed for ${endpoint}: ${errorDetails.map((e) => `${e.path}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Safe validation - returns null if invalid instead of throwing
 * Useful for defensive error handling
 */
export function safeValidateApiResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  endpoint: string
): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));

      console.error(`[API-VALIDATION] ${endpoint} validation failed (safe mode):`, {
        endpoint,
        errors: errorDetails,
      });

      return null;
    }
    return null;
  }
}
