import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import ProductViewTracker from '@/components/ProductViewTracker';
import { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await prisma.catalogProduct.findUnique({
    where: { slug: params.slug },
  });

  if (!product || !product.published) {
    return {
      title: 'Produk Tidak Ditemukan',
    };
  }

  return {
    title: `${product.name} - TOKO TANI ONLINE`,
    description: product.description.substring(0, 160),
    alternates: {
      canonical: `${baseUrl}/products/${product.slug}`,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await prisma.catalogProduct.findUnique({
    where: { slug: params.slug },
  });

  if (!product || !product.published) {
    notFound();
  }

  // DISABLED: db-helpers module not available
  // const { getSiteSettings } = await import('@/lib/db-helpers');
  // const siteSettings = await getSiteSettings();
  const siteSettings = null;

  return (
    <>
      <ProductViewTracker
        productId={product.id}
        slug={product.slug}
        category="" // CatalogProduct doesn't have category in this schema
      />
      <Navbar siteSettings={siteSettings || undefined} />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
            
            <div className="mb-6">
              <p className="text-3xl font-bold text-green-600 mb-4">
                Rp {product.price.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="prose prose-lg max-w-none mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Deskripsi</h2>
              <div className="text-gray-700 whitespace-pre-wrap">
                {product.description}
              </div>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm text-gray-500 mb-4">
                Tertarik dengan produk ini? Hubungi kami melalui WhatsApp untuk informasi lebih lanjut.
              </p>
              <WhatsAppCTA
                productName={product.name}
                productPrice={product.price}
                currentUrl={`${baseUrl}/products/${product.slug}`}
                productId={product.id}
              />
            </div>
          </div>
        </div>
      </div>
      <Footer siteSettings={siteSettings || undefined} />
    </>
  );
}

