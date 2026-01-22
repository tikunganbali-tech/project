/**
 * FITUR 4: Slug Generation Utilities
 * 
 * Purpose: Generate unique slugs with duplicate handling (-2, -3, etc.)
 */

import { prisma } from './db';

/**
 * Generate a URL-friendly slug from text
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100); // Limit length
}

/**
 * Generate unique slug for product (with duplicate handling)
 * 
 * Checks for duplicates within the same brand + locale scope
 * Appends -2, -3, etc. if duplicates exist
 * 
 * @param baseSlug - Base slug to check
 * @param brandId - Brand ID
 * @param localeId - Locale ID
 * @param excludeProductId - Optional product ID to exclude from check (for updates)
 * @returns Unique slug
 */
export async function generateUniqueProductSlug(
  baseSlug: string,
  brandId: string,
  localeId: string,
  excludeProductId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.product.findFirst({
      where: {
        slug,
        brandId,
        localeId,
        ...(excludeProductId && { id: { not: excludeProductId } }),
      },
    });

    if (!existing) {
      return slug;
    }

    // Generate next slug with counter
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety: prevent infinite loop
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after 1000 attempts');
    }
  }
}

/**
 * Validate and ensure unique slug for product
 * If slug exists, automatically appends suffix
 * 
 * @param slug - Slug to validate
 * @param brandId - Brand ID
 * @param localeId - Locale ID
 * @param excludeProductId - Optional product ID to exclude
 * @returns Unique slug (may be modified with suffix)
 */
export async function ensureUniqueProductSlug(
  slug: string,
  brandId: string,
  localeId: string,
  excludeProductId?: string
): Promise<string> {
  // First check if exact slug exists
  const existing = await prisma.product.findFirst({
    where: {
      slug,
      brandId,
      localeId,
      ...(excludeProductId && { id: { not: excludeProductId } }),
    },
  });

  if (!existing) {
    return slug;
  }

  // Generate unique slug with suffix
  return generateUniqueProductSlug(slug, brandId, localeId, excludeProductId);
}

/**
 * Generate unique slug for blog post (with duplicate handling)
 * 
 * Checks for duplicates within the same brand scope
 * Appends -2, -3, etc. if duplicates exist
 * 
 * @param baseSlug - Base slug to check
 * @param brandId - Brand ID
 * @param excludePostId - Optional post ID to exclude from check (for updates)
 * @returns Unique slug
 */
export async function generateUniqueBlogPostSlug(
  baseSlug: string,
  brandId: string,
  excludePostId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.blogPost.findFirst({
      where: {
        slug,
        brandId,
        ...(excludePostId && { id: { not: excludePostId } }),
      },
    });

    if (!existing) {
      return slug;
    }

    // Generate next slug with counter
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety: prevent infinite loop
    if (counter > 1000) {
      throw new Error('Unable to generate unique slug after 1000 attempts');
    }
  }
}

/**
 * Validate and ensure unique slug for blog post
 * If slug exists, automatically appends suffix
 * 
 * @param slug - Slug to validate
 * @param brandId - Brand ID
 * @param excludePostId - Optional post ID to exclude
 * @returns Unique slug (may be modified with suffix)
 */
export async function ensureUniqueBlogPostSlug(
  slug: string,
  brandId: string,
  excludePostId?: string
): Promise<string> {
  // First check if exact slug exists
  const existing = await prisma.blogPost.findFirst({
    where: {
      slug,
      brandId,
      ...(excludePostId && { id: { not: excludePostId } }),
    },
  });

  if (!existing) {
    return slug;
  }

  // Generate unique slug with suffix
  return generateUniqueBlogPostSlug(slug, brandId, excludePostId);
}
