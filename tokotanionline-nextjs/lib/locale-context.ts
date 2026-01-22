/**
 * PHASE 7B: Locale Context Loader
 * 
 * Determines active locale from:
 * - URL path (/id/..., /en/...)
 * - Accept-Language header
 * - X-Locale-Id header (admin override)
 * - Default locale for brand
 * 
 * Locale context is read-only and loaded at request start.
 */

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { BrandContext } from './brand-context';

export interface LocaleContext {
  localeId: string;
  localeCode: string; // e.g. "id-ID", "en-US"
  languageName: string; // e.g. "Indonesian", "English (US)"
  isDefault: boolean;
  isActive: boolean;
}

/**
 * Load locale context from request
 * Priority:
 * 1. X-Locale-Id header (admin override)
 * 2. URL path (/id/..., /en/...)
 * 3. Accept-Language header
 * 4. Default locale for brand
 */
export async function loadLocaleContext(
  brandContext: BrandContext,
  pathname?: string,
  localeIdHeader?: string,
  acceptLanguage?: string
): Promise<LocaleContext | null> {
  try {
    // Priority 1: Header override (for admin/API)
    if (localeIdHeader) {
      const locale = await prisma.locale.findUnique({
        where: { id: localeIdHeader },
      });
      if (locale && locale.brandId === brandContext.brandId && locale.isActive) {
        return {
          localeId: locale.id,
          localeCode: locale.localeCode,
          languageName: locale.languageName,
          isDefault: locale.isDefault,
          isActive: locale.isActive,
        };
      }
    }

    // Priority 2: URL path-based locale (/id/..., /en/...)
    if (pathname) {
      const pathParts = pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const potentialLocaleCode = pathParts[0].toLowerCase();
        
        // Common locale codes mapping
        const localeCodeMap: Record<string, string> = {
          'id': 'id-ID',
          'en': 'en-US',
          'en-us': 'en-US',
          'en-gb': 'en-GB',
        };
        
        const normalizedCode = localeCodeMap[potentialLocaleCode] || potentialLocaleCode;
        
        const locale = await prisma.locale.findFirst({
          where: {
            brandId: brandContext.brandId,
            localeCode: normalizedCode,
            isActive: true,
          },
        });
        
        if (locale) {
          return {
            localeId: locale.id,
            localeCode: locale.localeCode,
            languageName: locale.languageName,
            isDefault: locale.isDefault,
            isActive: locale.isActive,
          };
        }
      }
    }

    // Priority 3: Accept-Language header
    if (acceptLanguage) {
      // Parse Accept-Language header (e.g., "id-ID,id;q=0.9,en-US;q=0.8")
      const languages = acceptLanguage
        .split(',')
        .map(lang => {
          const [code, q] = lang.trim().split(';');
          const quality = q ? parseFloat(q.replace('q=', '')) : 1.0;
          return { code: code.trim().toLowerCase(), quality };
        })
        .sort((a, b) => b.quality - a.quality);

      for (const lang of languages) {
        const locale = await prisma.locale.findFirst({
          where: {
            brandId: brandContext.brandId,
            localeCode: {
              startsWith: lang.code.split('-')[0], // Match "id" for "id-ID"
            },
            isActive: true,
          },
        });
        
        if (locale) {
          return {
            localeId: locale.id,
            localeCode: locale.localeCode,
            languageName: locale.languageName,
            isDefault: locale.isDefault,
            isActive: locale.isActive,
          };
        }
      }
    }

    // Priority 4: Default locale for brand
    const defaultLocale = await prisma.locale.findFirst({
      where: {
        brandId: brandContext.brandId,
        isDefault: true,
        isActive: true,
      },
    });

    if (defaultLocale) {
      return {
        localeId: defaultLocale.id,
        localeCode: defaultLocale.localeCode,
        languageName: defaultLocale.languageName,
        isDefault: defaultLocale.isDefault,
        isActive: defaultLocale.isActive,
      };
    }

    // Fallback: First active locale for brand
    const firstLocale = await prisma.locale.findFirst({
      where: {
        brandId: brandContext.brandId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (firstLocale) {
      return {
        localeId: firstLocale.id,
        localeCode: firstLocale.localeCode,
        languageName: firstLocale.languageName,
        isDefault: firstLocale.isDefault,
        isActive: firstLocale.isActive,
      };
    }

    return null;
  } catch (error) {
    console.error('[LOCALE CONTEXT] Error loading locale context:', error);
    return null;
  }
}

/**
 * Get locale context from Next.js request
 */
export async function getLocaleContextFromRequest(
  brandContext: BrandContext
): Promise<LocaleContext | null> {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || undefined;
  const localeIdHeader = headersList.get('x-locale-id') || undefined;
  const acceptLanguage = headersList.get('accept-language') || undefined;

  return loadLocaleContext(brandContext, pathname, localeIdHeader, acceptLanguage);
}

/**
 * Validate locale context - ensures locale is active
 */
export function validateLocaleContext(context: LocaleContext | null): context is LocaleContext {
  if (!context) return false;
  return context.isActive;
}

/**
 * Guardrail: Ensure locale_id is present
 */
export function requireLocaleId(localeId: string | null | undefined): string {
  if (!localeId) {
    throw new Error('PHASE 7B GUARDRAIL: locale_id is required. No content without locale allowed.');
  }
  return localeId;
}
