'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface ProductsClientProps {
  products: any[];
  categories: any[];
  selectedCategory?: string;
}

const trackEvent = (payload: any) => {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/tracking', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
  } else {
    fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }
};

export default function ProductsClient({
  products,
  categories,
  selectedCategory,
}: ProductsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || product.category?.slug === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, products]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Produk Kami</h1>
          <p className="text-sm sm:text-base md:text-lg text-green-100">
            Temukan produk pertanian berkualitas untuk kebutuhan Anda
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 sticky top-20">
              <h3 className="font-semibold text-lg mb-4">Filter Produk</h3>
              
              {/* Search */}
              <div className="mb-4 sm:mb-6">
                <label className="text-xs sm:text-sm font-medium mb-2 block">Cari Produk</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="text-xs sm:text-sm font-medium mb-3 block">Kategori</label>
                <div className="space-y-1.5 sm:space-y-2">
                  <Link
                    href="/produk"
                    className={`block w-full text-left px-4 py-2 rounded-lg transition ${
                      !selectedCategory
                        ? 'bg-green-700 text-white hover:bg-green-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Semua
                    <span className="ml-auto float-right bg-white/20 text-xs px-2 py-1 rounded">
                      {products.length}
                    </span>
                  </Link>
                  {categories.map((category) => {
                    const categoryCount = products.filter((p) => p.category?.slug === category.slug).length;
                    return (
                      <Link
                        key={category.id}
                        href={`/produk?category=${category.slug}`}
                        className={`block w-full text-left px-4 py-2 rounded-lg transition ${
                          selectedCategory === category.slug
                            ? 'bg-green-700 text-white hover:bg-green-800'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.name}
                        <span className="ml-auto float-right bg-white/20 text-xs px-2 py-1 rounded">
                          {categoryCount}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <p className="text-sm sm:text-base text-gray-600">
                Menampilkan <span className="font-semibold">{filteredProducts.length}</span> produk
              </p>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                {filteredProducts.map((product) => {
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
                    trackEvent({
                      eventType: 'CTA_Click',
                      productId: product.id,
                      metadata: { cta: 'whatsapp', source: 'listing' },
                    });
                  };

                  return (
                    <motion.div
                      key={product.id}
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 group hover:shadow-xl transition-all duration-300 h-full flex flex-col"
                    >
                      <Link href={`/produk/${product.slug}`} className="block">
                        <div className="relative overflow-hidden">
                          {product.imageUrl ? (
                            <div className="relative h-40 sm:h-44 md:h-48 lg:h-64 bg-gray-100">
                              <Image
                                src={normalizeImageSrc(product.imageUrl)}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                loading="lazy"
                                priority={false}
                              />
                            </div>
                          ) : (
                            <div className="h-48 sm:h-56 md:h-64 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                              Gambar Tidak Tersedia
                            </div>
                          )}
                          {discount > 0 && (
                            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-lg">
                              -{discount}%
                            </span>
                          )}
                          {product.badge && product.badge !== 'none' && (
                            <span className="absolute top-2 left-2 bg-green-700 text-white text-xs font-semibold px-3 py-1 rounded-lg">
                              {product.badge.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="p-2.5 sm:p-3 md:p-4 flex-1 flex flex-col">
                        <Link href={`/produk/${product.slug}`} className="group">
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium mb-1.5 sm:mb-2 inline-block">
                            {product.category.name}
                          </span>
                          <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 line-clamp-2 group-hover:text-green-700 transition">
                            {product.name}
                          </h3>
                        </Link>
                        
                        <div className="flex items-baseline space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2 flex-wrap">
                          {product.discountPrice ? (
                            <>
                              <span className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">
                                Rp {product.discountPrice.toLocaleString('id-ID')}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500 line-through">
                                Rp {product.price.toLocaleString('id-ID')}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">
                                Rp {product.price.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">
                          Stok: <span className="font-semibold">{product.stock} {product.unit}</span>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-auto pt-2 sm:pt-3 md:pt-4">
                          <button
                            className="flex-1 bg-green-700 hover:bg-green-800 text-white text-xs sm:text-sm rounded-lg text-center py-1.5 sm:py-2 md:py-2.5 flex items-center justify-center gap-1"
                            onClick={handleWhatsAppOrder}
                          >
                            <ShoppingBag className="h-3 w-3 sm:h-3.5 md:h-4 sm:w-3 md:w-4" />
                            Pesan
                          </button>
                          <Link href={`/produk/${product.slug}`} className="flex-1">
                            <button className="w-full bg-gray-100 text-gray-800 text-xs sm:text-sm rounded-lg text-center py-1.5 sm:py-2 md:py-2.5 flex items-center justify-center gap-1 hover:bg-gray-200">
                              <Eye className="h-3 w-3 sm:h-3.5 md:h-4 sm:w-3 md:w-4" />
                              Detail
                            </button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <p className="text-gray-700 font-medium text-lg">
                    Tidak ada produk yang ditemukan
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {searchQuery || selectedCategory
                      ? 'Coba ubah kata kunci pencarian atau pilih kategori lain. Jika Anda mencari produk spesifik, silakan hubungi kami untuk bantuan.'
                      : 'Belum ada produk yang tersedia. Silakan kembali lagi nanti.'}
                  </p>
                  {(searchQuery || selectedCategory) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        window.location.href = '/produk';
                      }}
                      className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



