'use client';

import Link from 'next/link';
import { trackCtaClick } from '@/lib/track';

type ProductCardProps = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  badge?: 'new' | 'best' | 'promo';
  shopeeUrl?: string;
  tokopediaUrl?: string;
};

const badgeMap = {
  new: 'Terbaru',
  best: 'Terlaris',
  promo: 'Promo',
};

export default function ProductCard(props: ProductCardProps) {
  const {
    name,
    slug,
    price,
    image,
    badge,
    shopeeUrl,
    tokopediaUrl,
  } = props;

  const handleTrack = (type: string) => {
    trackCtaClick(`/products/${slug}`, type);
  };

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition bg-white">
      <div className="relative">
        <img
          src={image || '/placeholder-product.jpg'}
          alt={name}
          className="w-full h-48 object-cover"
        />
        {badge && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
            {badgeMap[badge]}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 leading-tight">
          {name}
        </h3>

        <p className="text-green-700 text-lg font-extrabold">
          Rp {price.toLocaleString('id-ID')}
        </p>

        <p className="text-xs text-gray-500">
          Stok terbatas • Respon cepat
        </p>

        <div className="grid grid-cols-1 gap-2 text-sm pt-2">
          {/* WhatsApp */}
          <button
            onClick={() => handleTrack('whatsapp')}
            className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
          >
            💬 WhatsApp Sekarang
          </button>

          {/* Marketplace */}
          {(shopeeUrl || tokopediaUrl) && (
            <a
              href={shopeeUrl || tokopediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleTrack('marketplace')}
              className="border border-orange-500 text-orange-600 py-2 rounded-lg text-center hover:bg-orange-50 font-medium"
            >
              🛒 Beli di Marketplace
            </a>
          )}

          {/* Detail */}
          <Link
            href={`/products/${slug}`}
            onClick={() => handleTrack('detail')}
            className="border border-gray-300 py-2 rounded-lg text-center hover:bg-gray-100"
          >
            Lihat Detail Produk
          </Link>
        </div>
      </div>
    </div>
  );
}

