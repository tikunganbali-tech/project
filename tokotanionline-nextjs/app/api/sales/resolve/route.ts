/**
 * FASE F — F1: BUY FLOW CORE API
 * GET /api/sales/resolve
 * 
 * Purpose: Resolve sales channel (WA/Shopee/Tokopedia) & generate message
 * - Deterministic admin rotation
 * - Generate WhatsApp message template
 * - Return channel link & message
 * 
 * Query Params:
 * - productId: string (required)
 * - channel: 'WA' | 'Shopee' | 'Tokopedia' (required)
 * 
 * Response:
 * {
 *   channel: 'WA' | 'Shopee' | 'Tokopedia',
 *   link: string,
 *   message: string,
 *   adminName: string
 * }
 * 
 * F4: Fail-fast if SALES_ENABLED = false
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPublicSiteSettings } from '@/lib/site-settings';

/**
 * Get active sales admins ordered by rotation priority
 * Deterministic rotation: sort by lastUsed ASC, then by clickCount ASC, then by sortOrder ASC
 */
async function getActiveSalesAdmins() {
  // Prisma doesn't support ascNullsFirst directly
  // Fetch all and sort manually to prioritize null lastUsed (never used = highest priority)
  const admins = await prisma.salesAdmin.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      { clickCount: 'asc' },
      { sortOrder: 'asc' },
    ],
  });
  
  // Sort: null lastUsed first, then by lastUsed asc
  return admins.sort((a, b) => {
    if (a.lastUsed === null && b.lastUsed === null) return 0;
    if (a.lastUsed === null) return -1; // null first
    if (b.lastUsed === null) return 1;
    return a.lastUsed.getTime() - b.lastUsed.getTime(); // asc
  });
}

/**
 * Rotate admin deterministically
 * Returns admin with lowest clickCount and oldest lastUsed
 */
async function rotateAdmin(channel: 'WA' | 'Shopee' | 'Tokopedia'): Promise<{
  id: string;
  name: string;
  whatsapp: string;
  shopeeLink: string | null;
  tokopediaLink: string | null;
} | null> {
  const admins = await getActiveSalesAdmins();

  if (admins.length === 0) {
    return null;
  }

  // Filter admins by channel availability
  const availableAdmins = admins.filter((admin) => {
    if (channel === 'WA') {
      return !!admin.whatsapp;
    } else if (channel === 'Shopee') {
      return !!admin.shopeeLink;
    } else if (channel === 'Tokopedia') {
      return !!admin.tokopediaLink;
    }
    return false;
  });

  if (availableAdmins.length === 0) {
    // Fallback: use first admin even if channel link not available
    return admins[0];
  }

  // Select first admin (already sorted by rotation priority)
  const selectedAdmin = availableAdmins[0];

  // Update rotation metrics (async, don't await to avoid blocking)
  prisma.salesAdmin
    .update({
      where: { id: selectedAdmin.id },
      data: {
        clickCount: { increment: 1 },
        lastUsed: new Date(),
      },
    })
    .catch((err) => {
      console.error('[sales/resolve] Failed to update admin rotation:', err);
    });

  return {
    id: selectedAdmin.id,
    name: selectedAdmin.name,
    whatsapp: selectedAdmin.whatsapp,
    shopeeLink: selectedAdmin.shopeeLink,
    tokopediaLink: selectedAdmin.tokopediaLink,
  };
}

/**
 * Generate WhatsApp message template
 */
function generateWhatsAppMessage(productName: string, productPrice: number): string {
  const priceFormatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(productPrice);

  return `Halo Admin,
Saya tertarik membeli ${productName}
Harga: ${priceFormatted}`;
}

/**
 * Build WhatsApp link
 */
function buildWhatsAppLink(phone: string, message: string): string {
  // Format: 6281234567890 -> 6281234567890 (no +, no spaces)
  const cleanPhone = phone.replace(/[\s\+-]/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export async function GET(request: NextRequest) {
  try {
    // F4: Kill-switch check
    const settings = await getPublicSiteSettings();
    if (!settings?.salesEnabled) {
      return NextResponse.json(
        { error: 'Sales feature is disabled' },
        { status: 503 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const channel = searchParams.get('channel');

    // Validate params
    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    if (!channel || !['WA', 'Shopee', 'Tokopedia'].includes(channel)) {
      return NextResponse.json(
        { error: 'channel must be WA, Shopee, or Tokopedia' },
        { status: 400 }
      );
    }

    // Fetch product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        discountPrice: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Resolve price (use discountPrice if available, else price)
    const productPrice = product.discountPrice || product.price;

    // Rotate admin
    const admin = await rotateAdmin(channel as 'WA' | 'Shopee' | 'Tokopedia');

    if (!admin) {
      return NextResponse.json(
        { error: 'No active sales admin available' },
        { status: 503 }
      );
    }

    // Build response based on channel
    let link: string;
    let message: string = '';

    if (channel === 'WA') {
      message = generateWhatsAppMessage(product.name, productPrice);
      link = buildWhatsAppLink(admin.whatsapp, message);
    } else if (channel === 'Shopee') {
      link = admin.shopeeLink || '';
      if (!link) {
        return NextResponse.json(
          { error: 'Shopee link not available for selected admin' },
          { status: 503 }
        );
      }
    } else if (channel === 'Tokopedia') {
      link = admin.tokopediaLink || '';
      if (!link) {
        return NextResponse.json(
          { error: 'Tokopedia link not available for selected admin' },
          { status: 503 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid channel' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        channel,
        link,
        message,
        adminName: admin.name,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('[sales/resolve] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
