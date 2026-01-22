import { Link } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { Product } from '@/lib/data';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const handleWhatsAppOrder = () => {
    const message = `Halo, saya tertarik dengan produk:\n\n*${product.name}*\nHarga: Rp ${(product.discountPrice || product.price).toLocaleString('id-ID')}\n\nApakah produk ini tersedia?`;
    const whatsappNumbers = [
      '6281234567890',
      '6281234567891',
      '6281234567892'
    ];
    const randomNumber = whatsappNumbers[Math.floor(Math.random() * whatsappNumbers.length)];
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300">
      <Link to={`/produk/${product.slug}`}>
        <div className="relative overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {discount > 0 && (
            <Badge className="absolute top-2 right-2 bg-red-500">
              -{discount}%
            </Badge>
          )}
          {product.isFeatured && (
            <Badge className="absolute top-2 left-2 bg-green-700">
              Unggulan
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <Link to={`/produk/${product.slug}`}>
          <Badge variant="outline" className="mb-2">
            {product.category}
          </Badge>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-green-700 transition">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-baseline space-x-2 mb-2">
          {product.discountPrice ? (
            <>
              <span className="text-2xl font-bold text-green-700">
                Rp {product.discountPrice.toLocaleString('id-ID')}
              </span>
              <span className="text-sm text-gray-500 line-through">
                Rp {product.price.toLocaleString('id-ID')}
              </span>
            </>
          ) : (
            <span className="text-2xl font-bold text-green-700">
              Rp {product.price.toLocaleString('id-ID')}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-2">
          Stok: <span className="font-semibold">{product.stock} {product.unit}</span>
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          className="flex-1 bg-green-700 hover:bg-green-800"
          onClick={handleWhatsAppOrder}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Pesan
        </Button>
        <Link to={`/produk/${product.slug}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            Detail
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}