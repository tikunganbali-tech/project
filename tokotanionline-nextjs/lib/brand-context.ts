/**
 * PHASE 7A: Brand Context Loader
 * 
 * Determines active brand from:
 * - Domain (custom domain)
 * - Subdomain (subdomain.example.com)
 * - Path (/brand-slug/...)
 * - Header (X-Brand-Id)
 * - Session (admin brand selection)
 * 
 * Brand context is read-only and loaded at request start.
 */

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export interface BrandContext {
  brandId: string;
  brandName: string;
  brandSlug: string;
  brandStatus: 'ACTIVE' | 'INACTIVE';
  domain?: string;
  subdomain?: string;
}

/**
 * Load brand context from request
 * Priority:
 * 1. X-Brand-Id header (admin override)
 * 2. Domain/subdomain match
 * 3. Path-based brand slug
 * 4. Default brand (if configured)
 */
export async function loadBrandContext(
  hostname?: string,
  pathname?: string,
  brandIdHeader?: string
): Promise<BrandContext | null> {
  try {
    // Priority 1: Header override (for admin/API)
    if (brandIdHeader) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandIdHeader },
      });
      if (brand && brand.brandStatus === 'ACTIVE') {
        return {
          brandId: brand.id,
          brandName: brand.brandName,
          brandSlug: brand.brandSlug,
          brandStatus: brand.brandStatus as 'ACTIVE' | 'INACTIVE',
          domain: brand.domain || undefined,
          subdomain: brand.subdomain || undefined,
        };
      }
    }

    // Priority 2: Domain/subdomain match
    if (hostname) {
      // Check exact domain match
      const domainBrand = await prisma.brand.findFirst({
        where: {
          domain: hostname,
          brandStatus: 'ACTIVE',
        },
      });
      if (domainBrand) {
        return {
          brandId: domainBrand.id,
          brandName: domainBrand.brandName,
          brandSlug: domainBrand.brandSlug,
          brandStatus: domainBrand.brandStatus as 'ACTIVE' | 'INACTIVE',
          domain: domainBrand.domain || undefined,
          subdomain: domainBrand.subdomain || undefined,
        };
      }

      // Check subdomain match (e.g., brand.example.com)
      const subdomainMatch = hostname.match(/^([^.]+)\.(.+)$/);
      if (subdomainMatch) {
        const subdomain = subdomainMatch[1];
        const brand = await prisma.brand.findFirst({
          where: {
            subdomain: subdomain,
            brandStatus: 'ACTIVE',
          },
        });
        if (brand) {
          return {
            brandId: brand.id,
            brandName: brand.brandName,
            brandSlug: brand.brandSlug,
            brandStatus: brand.brandStatus as 'ACTIVE' | 'INACTIVE',
            domain: brand.domain || undefined,
            subdomain: brand.subdomain || undefined,
          };
        }
      }
    }

    // Priority 3: Path-based brand slug (/brand-slug/...)
    if (pathname) {
      const pathParts = pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const potentialSlug = pathParts[0];
        const brand = await prisma.brand.findFirst({
          where: {
            brandSlug: potentialSlug,
            brandStatus: 'ACTIVE',
          },
        });
        if (brand) {
          return {
            brandId: brand.id,
            brandName: brand.brandName,
            brandSlug: brand.brandSlug,
            brandStatus: brand.brandStatus as 'ACTIVE' | 'INACTIVE',
            domain: brand.domain || undefined,
            subdomain: brand.subdomain || undefined,
          };
        }
      }
    }

    // Priority 4: Default brand (first active brand)
    // NOTE: This is a fallback - in production, you may want to require explicit brand
    const defaultBrand = await prisma.brand.findFirst({
      where: { brandStatus: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (defaultBrand) {
      return {
        brandId: defaultBrand.id,
        brandName: defaultBrand.brandName,
        brandSlug: defaultBrand.brandSlug,
        brandStatus: defaultBrand.brandStatus as 'ACTIVE' | 'INACTIVE',
        domain: defaultBrand.domain || undefined,
        subdomain: defaultBrand.subdomain || undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('[BRAND CONTEXT] Error loading brand context:', error);
    return null;
  }
}

/**
 * Get brand context from Next.js request
 */
export async function getBrandContextFromRequest(): Promise<BrandContext | null> {
  const headersList = await headers();
  const hostname = headersList.get('host') || undefined;
  const pathname = headersList.get('x-pathname') || undefined;
  const brandIdHeader = headersList.get('x-brand-id') || undefined;

  return loadBrandContext(hostname, pathname, brandIdHeader);
}

/**
 * Validate brand context - ensures brand is active
 */
export function validateBrandContext(context: BrandContext | null): context is BrandContext {
  if (!context) return false;
  return context.brandStatus === 'ACTIVE';
}

/**
 * Guardrail: Ensure brand_id is present
 */
export function requireBrandId(brandId: string | null | undefined): string {
  if (!brandId) {
    throw new Error('PHASE 7A GUARDRAIL: brand_id is required. No query without brand_id allowed.');
  }
  return brandId;
}
