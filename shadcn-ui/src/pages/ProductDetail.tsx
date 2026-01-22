import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, Share2, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ProductCard from '@/components/ProductCard';
import { products } from '@/lib/data';

export default function ProductDetail() {
  const { slug } = useParams();
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Produk tidak ditemukan</h1>
          <Link to="/produk">
            <Button>Kembali ke Produk</Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const handleWhatsAppOrder = () => {
    const message = `Halo, saya ingin memesan:\n\n*${product.name}*\nHarga: Rp ${(product.discountPrice || product.price).toLocaleString('id-ID')}\nJumlah: 1 ${product.unit}\n\nApakah produk ini tersedia?`;
    const whatsappNumbers = [
      '6281234567890',
      '6281234567891',
      '6281234567892'
    ];
    const randomNumber = whatsappNumbers[Math.floor(Math.random() * whatsappNumbers.length)];
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-600 hover:text-green-700">
              Beranda
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link to="/produk" className="text-gray-600 hover:text-green-700">
              Produk
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="relative">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
              {discount > 0 && (
                <Badge className="absolute top-4 right-4 bg-red-500 text-lg px-3 py-1">
                  -{discount}%
                </Badge>
              )}
              {product.isFeatured && (
                <Badge className="absolute top-4 left-4 bg-green-700 text-lg px-3 py-1">
                  Unggulan
                </Badge>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <Badge className="mb-3">{product.category}</Badge>
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

            <div className="flex items-baseline space-x-3 mb-4">
              {product.discountPrice ? (
                <>
                  <span className="text-4xl font-bold text-green-700">
                    Rp {product.discountPrice.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xl text-gray-500 line-through">
                    Rp {product.price.toLocaleString('id-ID')}
                  </span>
                </>
              ) : (
                <span className="text-4xl font-bold text-green-700">
                  Rp {product.price.toLocaleString('id-ID')}
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-6">{product.description}</p>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                Stok: <span className="font-semibold text-green-700">{product.stock} {product.unit}</span>
              </p>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Keunggulan Produk:</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Check className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 bg-green-700 hover:bg-green-800"
                onClick={handleWhatsAppOrder}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Pesan via WhatsApp
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Belanja di Marketplace:</h3>
              <div className="flex gap-3">
                <a
                  href="https://shopee.co.id/tokotanionline"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-50">
                    Shopee
                  </Button>
                </a>
                <a
                  href="https://www.tokopedia.com/tokotanionline"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50">
                    Tokopedia
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Produk Terkait</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}