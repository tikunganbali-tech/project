import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, productId, blogId, metadata } = body;

    await prisma.trackingEvent.create({
      data: {
        eventType,
        productId: productId || null,
        blogId: blogId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Update aggregates for product
    if (productId) {
      const increment: any = {};
      if (eventType === 'ProductView' || eventType === 'ViewContent') {
        increment.views = { increment: 1 };
      }
      if (eventType === 'CTA_Click') {
        const cta = metadata?.cta;
        if (cta === 'whatsapp') increment.clicksWa = { increment: 1 };
        if (cta === 'shopee') increment.clicksShopee = { increment: 1 };
        if (cta === 'tokopedia') increment.clicksTokopedia = { increment: 1 };
      }
      if (Object.keys(increment).length > 0) {
        await prisma.productStats.upsert({
          where: { productId },
          update: increment,
          create: { productId, ...Object.fromEntries(Object.keys(increment).map((k) => [k, 1])) },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
