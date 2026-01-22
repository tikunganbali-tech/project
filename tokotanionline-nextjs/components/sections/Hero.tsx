/**
 * Hero Section - HealthStore Style
 * 
 * Layout 2 kolom:
 * - Left: Content dengan badge, headline, subtitle, CTA, stats
 * - Right: Product showcase card (translucent white dengan 2x2 grid)
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Star } from 'lucide-react';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface Product {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  priceResolved: number;
}

interface HeroProps {
  title?: string | null;
  subtitle?: string | null;
  ctaText?: string | null;
  ctaLink?: string;
  featuredProducts?: Product[];
}

export default function Hero({ 
  title,
  subtitle,
  ctaText,
  ctaLink = '/produk',
  featuredProducts = []
}: HeroProps) {
  // Display products (max 4 untuk 2x2 grid)
  const displayProducts = featuredProducts.slice(0, 4);

  return (
    <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white flex items-center min-h-[600px] md:min-h-[700px] overflow-hidden">
      {/* Background Pattern - Dots (scattered) */}
      <div className="absolute inset-0 opacity-15">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />
      </div>

      {/* Blurred Background Image Overlay - Right side */}
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-blue-500/30 via-blue-400/20 to-transparent blur-2xl" />
      </div>
      
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 w-full relative z-10 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content Block */}
          <div className="space-y-6 md:space-y-8">
            {/* Trust Badge dengan Trophy Icon */}
            <div className="inline-flex items-center gap-2 bg-yellow-400/25 backdrop-blur-sm border border-yellow-300/40 rounded-lg px-4 py-2.5 shadow-lg">
              <Trophy className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-semibold text-yellow-200">Platform Kesehatan Terpercaya #1</span>
            </div>

            {/* Main Headline dengan Highlight Yellow */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Belanja dengan Cara yang{' '}
              <span className="text-yellow-400">Paling Anda Percaya</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-blue-100 leading-relaxed max-w-xl">
              Kami hadir di platform yang sudah Anda kenal. Pilih WhatsApp, Shopee, atau Tokopedia sesuai kenyamanan Anda.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={ctaLink || '/produk'}
                className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-3.5 rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
              >
                {ctaText || 'Jelajahi Produk'}
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white px-6 py-3.5 rounded-lg font-semibold transition backdrop-blur-sm"
              >
                Baca Artikel
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div>
                <div className="text-3xl md:text-4xl font-bold mb-1">1000+</div>
                <div className="text-sm md:text-base text-blue-100">Produk Tersedia</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold mb-1">50K+</div>
                <div className="text-sm md:text-base text-blue-100">Pelanggan Puas</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold mb-1 flex items-center gap-1">
                  4.9<Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="text-sm md:text-base text-blue-100">Rating Rata-rata</div>
              </div>
            </div>
          </div>

          {/* Right Content Block - Product Showcase Card */}
          {displayProducts.length > 0 && (
            <div className="lg:flex justify-end hidden">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 w-full max-w-md">
                <div className="grid grid-cols-2 gap-4">
                  {displayProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/produk/${product.slug}`}
                      className="group bg-white/80 rounded-xl p-3 hover:bg-white hover:shadow-lg transition-all border border-gray-100"
                    >
                      {product.imageUrl ? (
                        <div className="relative h-28 mb-2 bg-gray-50 rounded-lg overflow-hidden">
                          <Image
                            src={normalizeImageSrc(product.imageUrl)}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 50vw, 200px"
                          />
                        </div>
                      ) : (
                        <div className="h-28 mb-2 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-400">No Image</span>
                        </div>
                      )}
                      <h3 className="font-semibold text-xs text-gray-900 mb-1.5 line-clamp-2 group-hover:text-blue-600 transition leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-sm font-bold text-blue-600">
                        Rp {(product.priceResolved / 1000).toFixed(0)}K
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
