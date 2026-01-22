/**
 * Behavior Loop API - Scroll CTA
 * Get CTA based on page type at 70% scroll
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logEngineActivity } from '@/lib/engine-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageType = searchParams.get('pageType') as 'blog' | 'product' | 'home';
    const pageId = searchParams.get('pageId');
    const categoryId = searchParams.get('categoryId');

    if (!pageType || !pageId) {
      return NextResponse.json({ error: 'pageType and pageId are required' }, { status: 400 });
    }

    let cta: {
      type: 'whatsapp' | 'product' | 'article';
      title: string;
      description?: string;
      url?: string;
      productId?: string;
    } | null = null;

    if (pageType === 'blog') {
      // Blog → CTA to relevant product
      if (categoryId) {
        const relatedProducts = await prisma.product.findMany({
          where: {
            isActive: true,
            categoryId,
          },
          take: 1,
          orderBy: { salesWeight: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        if (relatedProducts.length > 0) {
          const product = relatedProducts[0];
          cta = {
            type: 'product',
            title: 'Produk Terkait',
            description: `Lihat ${product.name} - Solusi untuk kebutuhan Anda`,
            url: `/produk/${product.slug}`,
            productId: product.id,
          };
        }
      } else {
        // Fallback: WhatsApp CTA
        cta = {
          type: 'whatsapp',
          title: 'Butuh Bantuan?',
          description: 'Hubungi kami untuk konsultasi gratis',
        };
      }
    } else if (pageType === 'product') {
      // Product → WhatsApp + educational article
      cta = {
        type: 'whatsapp',
        title: 'Tertarik dengan Produk Ini?',
        description: 'Hubungi kami untuk informasi lebih lanjut dan konsultasi gratis',
      };

      // Also suggest educational article
      if (categoryId) {
        const educationalBlog = await prisma.blog.findFirst({
          where: {
            status: 'published',
            categoryId,
          },
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
          },
        });

        if (educationalBlog) {
          // Return WhatsApp as primary, article suggestion can be added to metadata
          cta.description = `${cta.description}. Atau baca artikel: ${educationalBlog.title}`;
        }
      }
    } else if (pageType === 'home') {
      // Home → Featured product + best article
      const featuredProduct = await prisma.product.findFirst({
        where: {
          isActive: true,
          isFeatured: true,
        },
        orderBy: { salesWeight: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      if (featuredProduct) {
        cta = {
          type: 'product',
          title: 'Produk Unggulan',
          description: `Lihat ${featuredProduct.name} - Produk terlaris kami`,
          url: `/produk/${featuredProduct.slug}`,
          productId: featuredProduct.id,
        };
      }
    }

    // Log to EngineLog
    await logEngineActivity('user-behavior', {
      actionType: 'execute',
      moduleName: 'getScrollCTA',
      status: 'success',
      message: `Generated CTA for ${pageType}:${pageId}`,
      relatedEntityId: pageId || undefined,
      relatedEntityType: pageType as 'blog' | 'product' | 'page',
      metadata: {
        ctaType: cta?.type,
        categoryId: categoryId || undefined,
      },
    });

    return NextResponse.json({ cta });
  } catch (error: any) {
    console.error('Error getting scroll CTA:', error);
    await logEngineActivity('user-behavior', {
      actionType: 'error',
      moduleName: 'getScrollCTA',
      status: 'failed',
      message: `Failed to get scroll CTA: ${error.message}`,
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

