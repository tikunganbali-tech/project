import Link from 'next/link';
import SafeImage from './SafeImage';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface Product {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceResolved: number;
  category?: {
    name: string;
    slug: string;
  } | null;
}

interface ProductCardProps {
  product: Product;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/produk/${product.slug}`}
      className="group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:border-green-500/30 hover:shadow-md transition-all duration-150"
    >
      {product.imageUrl ? (
        <div className="overflow-hidden group-hover:scale-105 transition-transform duration-200">
          <SafeImage 
            src={normalizeImageSrc(product.imageUrl)} 
            alt={product.name} 
            height={220}
          />
        </div>
      ) : (
        <div className="w-full h-[220px] flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-sm">No Image</span>
        </div>
      )}
      
      <div className="p-4">
        {product.category && (
          <p className="text-xs text-gray-500 mb-1 truncate">
            {product.category.name}
          </p>
        )}
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors">
          {product.name}
        </h3>
        <p className="font-bold text-gray-900">
          {formatPrice(product.priceResolved)}
        </p>
      </div>
    </Link>
  );
}
