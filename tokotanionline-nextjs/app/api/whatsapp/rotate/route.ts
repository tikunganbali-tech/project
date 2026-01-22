import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const articleId = searchParams.get('articleId');

    const admins = await prisma.whatsAppAdmin.findMany({
      where: { isActive: true },
      orderBy: [
        { clickCount: 'asc' },
        { lastUsed: 'asc' },
      ],
    });

    if (admins.length === 0) {
      return NextResponse.json({ phone: '6281234567890' });
    }

    // Round-robin: select admin with lowest click count
    const selectedAdmin = admins[0];

    // Update click count and last used
    await prisma.whatsAppAdmin.update({
      where: { id: selectedAdmin.id },
      data: {
        clickCount: { increment: 1 },
        lastUsed: new Date(),
      },
    });

    // Log click with context
    if (productId || articleId) {
      await prisma.trackingEvent.create({
        data: {
          eventType: 'WhatsAppClick',
          productId: productId || null,
          blogId: articleId || null,
          metadata: JSON.stringify({
            phone: selectedAdmin.phone,
            context: productId ? 'product' : 'article',
          }),
        },
      });
    }

    return NextResponse.json({ phone: selectedAdmin.phone });
  } catch (error) {
    console.error('WhatsApp rotation error:', error);
    return NextResponse.json({ phone: '6281234567890' }, { status: 500 });
  }
}
