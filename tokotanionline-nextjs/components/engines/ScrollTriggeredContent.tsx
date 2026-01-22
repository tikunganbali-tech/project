'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ScrollTriggeredContentProps {
  blogId?: string;
  productId?: string;
}

export default function ScrollTriggeredContent({ blogId, productId }: ScrollTriggeredContentProps) {
  const [showBacaJuga, setShowBacaJuga] = useState(false);
  const [showRelatedProducts, setShowRelatedProducts] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

      if (scrollPercent >= 40 && !showBacaJuga) {
        setShowBacaJuga(true);
      }

      if (scrollPercent >= 60 && !showRelatedProducts) {
        setShowRelatedProducts(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showBacaJuga, showRelatedProducts]);

  if (!showBacaJuga && !showRelatedProducts) {
    return null;
  }

  return (
    <div className="space-y-6 my-8">
      {showBacaJuga && blogId && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">📖 Baca Juga</h3>
          <p className="text-sm text-blue-800">
            Artikel terkait yang mungkin menarik untuk Anda.
          </p>
          <Link href="/blog" className="text-blue-600 hover:underline text-sm font-medium">
            Lihat Semua Artikel →
          </Link>
        </div>
      )}

      {showRelatedProducts && productId && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <h3 className="font-semibold text-green-900 mb-2">🛒 Produk Terkait</h3>
          <p className="text-sm text-green-800">
            Produk lain yang mungkin Anda butuhkan.
          </p>
          <Link href="/produk" className="text-green-600 hover:underline text-sm font-medium">
            Lihat Semua Produk →
          </Link>
        </div>
      )}
    </div>
  );
}












