import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/testimonials - Get social proof messages
export async function GET() {
  try {
    // Get recent social proof logs
    const logs = await prisma.socialProofLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // Get products for context
    const productIds = logs
      .map((log) => log.productId)
      .filter((id): id is string => id !== null);

    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    // Format messages
    const messages = logs.map((log) => ({
      text: log.message,
      location: log.location || 'Indonesia',
      productId: log.productId,
      productName: log.productId ? productMap.get(log.productId) : null,
      timestamp: log.timestamp,
    }));

    // If no logs, return default messages with agricultural locations
    if (messages.length === 0) {
      // Get random agricultural locations from database
      const agriculturalLocations = await prisma.location.findMany({
        where: { isActive: true },
        take: 5,
        orderBy: { displayOrder: 'asc' },
      });

      if (agriculturalLocations.length > 0) {
        const defaultMessages = agriculturalLocations.slice(0, 3).map((loc, idx) => {
          const products = [
            'Benih Cabe Oriental Seed',
            'Fungisida Mantep 80 WP',
            'Benih Kubis Greennova',
          ];
          const actions = [
            'baru saja membeli',
            'baru saja memesan',
            'baru saja checkout',
          ];
          
          return {
            text: `Petani dari ${loc.name} ${actions[idx % actions.length]} ${products[idx % products.length]}`,
            location: loc.name,
          };
        });
        
        return NextResponse.json({ messages: defaultMessages });
      }
      
      // Ultimate fallback with agricultural areas
      return NextResponse.json({
        messages: [
          {
            text: 'Petani dari Wonosobo baru saja membeli Benih Cabe Oriental Seed',
            location: 'Wonosobo',
          },
          {
            text: 'Petani dari Temanggung baru saja memesan Fungisida Mantep 80 WP',
            location: 'Temanggung',
          },
          {
            text: 'Petani dari Cianjur baru saja checkout Benih Kubis Greennova',
            location: 'Cianjur',
          },
        ],
      });
    }

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
