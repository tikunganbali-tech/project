import ProductCard from './ProductCard';
import { prisma } from '@/lib/db';
import { getBestSellingProductSlugs } from '@/lib/product-intelligence';

export const dynamic = 'force-dynamic';

export default async function FeaturedProducts() {
  let newest: any[] = [];
  let bestSeller: any[] = [];
  let promo: any[] = [];

  try {
    // Produk Terbaru
    newest = await prisma.catalogProduct.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    // Produk Terlaris (REAL: berdasarkan EventLog)
    let bestSlugs: string[] = [];
    try {
      bestSlugs = await getBestSellingProductSlugs(2);
    } catch (error) {
      console.error('Error getting best selling slugs:', error);
      bestSlugs = [];
    }

    bestSeller = bestSlugs.length
      ? await prisma.catalogProduct.findMany({
          where: {
            published: true,
            slug: { in: bestSlugs },
          },
        })
      : [];

    // Produk Promo (sementara rule-based)
    promo = await prisma.catalogProduct.findMany({
      where: { published: true },
      orderBy: { price: 'asc' },
      take: 2,
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    // Keep empty arrays, component will render empty state
  }

  const all = [
    ...newest.map(p => ({ ...p, badge: 'new' as const })),
    ...bestSeller.map(p => ({ ...p, badge: 'best' as const })),
    ...promo.map(p => ({ ...p, badge: 'promo' as const })),
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
            Produk Unggulan
          </h2>
          <p className="mt-3 text-gray-600 max-w-xl mx-auto">
            Produk pilihan dengan performa terbaik, paling diminati,
            dan siap dikirim hari ini.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {all.map(product => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            slug={product.slug}
            price={product.price}
            image={undefined}
            badge={product.badge}
          />
        ))}
        </div>
      </div>
    </section>
  );
}

