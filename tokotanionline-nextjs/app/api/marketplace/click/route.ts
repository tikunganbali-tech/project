import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, productId, productName } = body;

    // Track marketplace click
    await prisma.trackingEvent.create({
      data: {
        eventType: 'MarketplaceClick',
        productId,
        metadata: JSON.stringify({
          platform,
          productName,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Marketplace click tracking error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
