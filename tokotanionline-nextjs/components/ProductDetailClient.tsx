'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, CheckCircle, ShieldCheck, Leaf, Sparkles, ChevronRight, Share2, MessageCircle, Eye, Users, Target } from 'lucide-react';
import MarketplaceButtons from './MarketplaceButtons';
import WhatsAppButton from './WhatsAppButton';
import CheckoutModal from './CheckoutModal';
import ExitIntentHandler from './ExitIntentHandler';
import { useEffect, useState, useRef } from 'react';
import { trackEvent } from '@/lib/event-tracker';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

const trackEventLegacy = (payload: any) => {
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

interface ProductDetailClientProps {
  product: any;
  relatedProducts: any[];
  relatedBlogs?: any[];
}

export default function ProductDetailClient({
  product,
  relatedProducts,
  relatedBlogs = [],
}: ProductDetailClientProps) {
  const [salesEnabled, setSalesEnabled] = useState(true);
  const [loadingSalesStatus, setLoadingSalesStatus] = useState(true);

  // Fetch salesEnabled status (F5-B)
  useEffect(() => {
    fetch('/api/public/sales-status')
      .then(res => res.json())
      .then(data => {
        setSalesEnabled(data.salesEnabled ?? true);
        setLoadingSalesStatus(false);
      })
      .catch(() => {
        setSalesEnabled(true); // Fail-safe: default to enabled
        setLoadingSalesStatus(false);
      });
  }, []);

  const features = product.features
    ? typeof product.features === 'string'
      ? JSON.parse(product.features)
      : product.features
    : [];
  const pestTargets = product.pestTargets
    ? typeof product.pestTargets === 'string'
      ? JSON.parse(product.pestTargets)
      : product.pestTargets
    : [];
  const activeIngredients = product.activeIngredients
    ? typeof product.activeIngredients === 'string'
      ? JSON.parse(product.activeIngredients)
      : product.activeIngredients
    : [];
  const packagingVariants = product.packagingVariants
    ? typeof product.packagingVariants === 'string'
      ? JSON.parse(product.packagingVariants)
      : product.packagingVariants
    : [];
  const benefits = features.length
    ? features
    : ['Meningkatkan hasil panen', 'Memperkuat ketahanan tanaman', 'Aplikasi mudah dan efisien'];
  
  // Top 3 benefits for summary
  const top3Benefits = benefits.slice(0, 3);

  const gallery = product.images
    ? typeof product.images === 'string'
      ? JSON.parse(product.images)
      : product.images
    : [];

  const [mainImage, setMainImage] = useState<string>(product.imageUrl || (gallery[0] ?? ''));
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    product: any;
  }>({ isOpen: false, product: null });
  const ctaVisibilityRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [scrollAfterCTA, setScrollAfterCTA] = useState(0);

  const openWhatsApp = async (name: string, productId: string, position: string = 'inline') => {
    try {
      // STEP 14B: Track click_cta event
      trackEvent({
        event: 'click_cta',
        meta: {
          productId: productId,
          cta_type: 'whatsapp',
          location: position,
        },
      });

      // Track CTA click (legacy)
      await fetch('/api/analytics/cta-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'product',
          pageId: productId,
          ctaType: 'whatsapp',
          ctaLabel: `Pesan ${name}`,
          ctaPosition: position,
          metadata: { productName: name },
        }),
      }).catch(() => {}); // Non-blocking

      const res = await fetch(
        `/api/whatsapp/rotate?productId=${productId}&productName=${encodeURIComponent(name)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      const phone = data.phone || '6281234567890';
      const message = `Halo, saya ingin pesan ${name}. Link produk: ${window.location.href}`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      trackEventLegacy({ eventType: 'CTA_Click', productId, metadata: { cta: 'whatsapp', source: 'product_detail_primary' } });
      window.open(url, '_blank');
    } catch {
      const url = `https://wa.me/6281234567890?text=Halo, saya ingin pesan ${encodeURIComponent(name)}`;
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    // STEP 14B: Track view_product event
    trackEvent({
      event: 'view_product',
      meta: {
        productId: product.id,
        slug: product.slug,
        category: product.category?.name || product.categoryId || '',
      },
    });

    // Legacy tracking (keep for backward compatibility)
    trackEventLegacy({
      eventType: 'ProductView',
      productId: product.id,
      metadata: { source: 'product_detail' },
    });

    const marks = [25, 50, 75, 100];
    const fired = new Set<number>();
    const onScroll = () => {
      const pos = window.scrollY + window.innerHeight;
      const h = document.body.scrollHeight;
      const pct = Math.min(100, Math.round((pos / h) * 100));
      marks.forEach((m) => {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          trackEventLegacy({
            eventType: 'ScrollDepth',
            productId: product.id,
            metadata: { depth: m, source: 'product_detail' },
          });
        }
      });

      // Track scroll depth after CTA visibility
      if (ctaVisible && pct > scrollAfterCTA) {
        setScrollAfterCTA(pct);
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'ScrollAfterCTA',
            pageType: 'product',
            pageId: product.id,
            scrollDepth: pct,
            metadata: { ctaPosition: 'inline' },
          }),
        }).catch(() => {});
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [product.id, product.slug, product.category, ctaVisible, scrollAfterCTA]);

  // Track CTA visibility using IntersectionObserver
  useEffect(() => {
    if (!ctaVisibilityRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !ctaVisible) {
            setCtaVisible(true);
            // Track CTA visibility
            fetch('/api/analytics/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventType: 'CTAVisibility',
                pageType: 'product',
                pageId: product.id,
                metadata: { ctaPosition: 'inline', visible: true },
              }),
            }).catch(() => {});
            setScrollAfterCTA(Math.round(((window.scrollY + window.innerHeight) / document.body.scrollHeight) * 100));
          }
        });
      },
      { threshold: 0.5 } // 50% visible
    );

    observer.observe(ctaVisibilityRef.current);
    return () => observer.disconnect();
  }, [product.id, ctaVisible]);

  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-3 sm:py-3.5 md:py-4">
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm">
            <Link href="/" className="text-gray-600 hover:text-green-700">
              Beranda
            </Link>
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <Link href="/produk" className="text-gray-600 hover:text-green-700">
              Produk
            </Link>
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-5 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 mb-6 sm:mb-8 md:mb-12">
          {/* Product Image */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
            <div className="relative">
              {mainImage ? (
                <img
                  src={normalizeImageSrc(mainImage)}
                  alt={product.name}
                  className="w-full h-56 sm:h-64 md:h-72 lg:h-96 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-56 sm:h-64 md:h-72 lg:h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                  Gambar Tidak Tersedia
                </div>
              )}
              {discount > 0 && (
                <span className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 bg-red-500 text-white text-sm sm:text-base md:text-lg px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-lg">
                  -{discount}%
                </span>
              )}
              {product.badge && product.badge !== 'none' && (
                <span className="absolute top-2 sm:top-3 md:top-4 left-2 sm:left-3 md:left-4 bg-green-700 text-white text-sm sm:text-base md:text-lg px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-lg">
                  {product.badge.replace('_', ' ')}
                </span>
              )}
            </div>
            {gallery.length > 0 && (
              <div className="flex gap-1.5 sm:gap-2 mt-2.5 sm:mt-3 md:mt-4 overflow-x-auto pb-2 scrollbar-hide">
                {gallery.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    className={`relative w-14 h-14 sm:w-16 md:w-18 lg:w-20 sm:h-16 md:h-18 lg:h-20 bg-gray-100 rounded overflow-hidden border-2 flex-shrink-0 ${
                      mainImage === img ? 'border-green-600' : 'border-transparent'
                    }`}
                    onClick={() => setMainImage(img)}
                  >
                    <Image 
                      src={normalizeImageSrc(img)} 
                      alt={`${product.name} ${idx + 1}`} 
                      fill 
                      className="object-cover" 
                      sizes="(max-width: 640px) 56px, (max-width: 1024px) 64px, 80px"
                      loading="lazy" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
            <span className="px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-lg text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5 md:mb-3 inline-block">
              {product.category.name}
            </span>
            <h1 className="text-xl sm:text-2xl md:text-2.5xl lg:text-3xl font-bold mb-2.5 sm:mb-3 md:mb-4">{product.name}</h1>

            <div className="mb-3 sm:mb-4 md:mb-6 space-y-2 sm:space-y-3">
              {product.discountPrice ? (
                <div>
                  <div className="text-2xl sm:text-3xl md:text-3.5xl lg:text-4xl font-bold text-green-600 mb-0.5 sm:mb-1">
                    Rp {product.discountPrice.toLocaleString('id-ID')}
                  </div>
                  <div className="text-base sm:text-lg md:text-xl text-gray-400 line-through">
                    Rp {product.price.toLocaleString('id-ID')}
                  </div>
                </div>
              ) : (
                <div className="text-2xl sm:text-3xl md:text-3.5xl lg:text-4xl font-bold text-green-600">
                  Rp {product.price.toLocaleString('id-ID')}
                </div>
              )}

              {/* WhatsApp CTA ABOVE FOLD */}
              <div ref={ctaVisibilityRef}>
                <button
                  onClick={() => openWhatsApp(product.name, product.id, 'inline')}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold px-3.5 sm:px-4 md:px-6 py-3 sm:py-3.5 md:py-4 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg shadow-lg"
                >
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
                  Pesan via WhatsApp
                </button>
              </div>

              {/* 3-Bullet Benefit Summary */}
              {top3Benefits.length > 0 && (
                <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-100">
                  <ul className="space-y-2">
                    {top3Benefits.map((benefit: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-700 flex-shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm md:text-base text-gray-800 font-medium">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: product.name,
                      text: product.description,
                      url: window.location.href
                    });
                  }
                }}
                className="w-full px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
              >
                <Share2 className="h-3.5 w-3.5 sm:h-4 md:h-5 sm:w-4 md:w-5" />
              </button>
            </div>

            <div className="border-t border-gray-200 my-4 sm:my-6"></div>

            {/* Untuk Siapa Produk Ini? */}
            {product.cropType && (
              <div className="mb-4 sm:mb-5 md:mb-6 bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-100">
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-900 mb-1 sm:mb-2">Untuk Siapa Produk Ini?</h3>
                    <p className="text-xs sm:text-sm md:text-base text-gray-700">
                      Produk ini cocok untuk petani yang menanam <strong>{product.cropType}</strong>
                      {product.usageStage && ` pada tahap ${product.usageStage}`}.
                      {pestTargets.length > 0 && ` Ideal untuk mengatasi masalah ${pestTargets.slice(0, 2).join(' dan ')}.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Internal Links to Related Problems (Blogs) */}
            {relatedBlogs.length > 0 && (
              <div className="mb-4 sm:mb-5 md:mb-6">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                  <h3 className="font-semibold text-sm sm:text-base md:text-lg">Pelajari Masalah yang Diselesaikan:</h3>
                </div>
                <div className="space-y-2">
                  {relatedBlogs.slice(0, 3).map((blog) => (
                    <Link
                      key={blog.id}
                      href={`/blog/${blog.slug}`}
                      className="block p-2 sm:p-3 bg-gray-50 hover:bg-green-50 rounded-lg border border-gray-200 hover:border-green-300 transition"
                    >
                      <p className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-1">{blog.title}</p>
                      {blog.excerpt && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{blog.excerpt}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-5 md:mb-6">
              <h3 className="font-semibold text-sm sm:text-base md:text-lg">Belanja di Marketplace:</h3>
              <div className="flex gap-2 sm:gap-2.5 md:gap-3">
                {product.shopeeUrl && (
                  <a
                    href={product.shopeeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                    onClick={async () => {
                      await fetch('/api/analytics/cta-click', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          pageType: 'product',
                          pageId: product.id,
                          ctaType: 'shopee',
                          ctaLabel: 'Shopee',
                          ctaPosition: 'inline',
                          metadata: { productName: product.name },
                        }),
                      }).catch(() => {});
                    }}
                  >
                    <button className="w-full border border-orange-500 text-orange-500 hover:bg-orange-50 font-semibold px-3 sm:px-3.5 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm md:text-base">
                      Shopee
                    </button>
                  </a>
                )}
                {product.tokopediaUrl && (
                  <a
                    href={product.tokopediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                    onClick={async () => {
                      await fetch('/api/analytics/cta-click', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          pageType: 'product',
                          pageId: product.id,
                          ctaType: 'tokopedia',
                          ctaLabel: 'Tokopedia',
                          ctaPosition: 'inline',
                          metadata: { productName: product.name },
                        }),
                      }).catch(() => {});
                    }}
                  >
                    <button className="w-full border border-emerald-500 text-emerald-500 hover:bg-emerald-50 font-semibold px-3 sm:px-3.5 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm md:text-base">
                      Tokopedia
                    </button>
                  </a>
                )}
              </div>
            </div>

            {benefits.length > 0 && (
              <div className="mb-4 sm:mb-5 md:mb-6">
                <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-2 sm:mb-2.5 md:mb-3">Semua Keunggulan Produk:</h3>
                <ul className="space-y-1.5 sm:space-y-2">
                  {benefits.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start space-x-1.5 sm:space-x-2">
                      <CheckCircle className="h-4 w-4 sm:h-4.5 md:h-5 sm:w-4 md:w-5 text-green-700 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm md:text-base text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4 sm:mb-5 md:mb-6">
              <p className="text-xs sm:text-sm md:text-base text-gray-700 flex items-center gap-1.5 sm:gap-2">
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 md:h-4 sm:w-4 md:w-4 text-green-600" />
                <span>
                  Stok: {product.stock} {product.unit}
                </span>
              </p>
              {product.cropType && (
                <p className="text-xs sm:text-sm md:text-base text-gray-700 flex items-center gap-1.5 sm:gap-2 mt-1">
                  <Leaf className="h-3.5 w-3.5 sm:h-4 md:h-4 sm:w-4 md:w-4 text-green-600" />
                  <span>Tanaman: {product.cropType}</span>
                </p>
              )}
              {product.usageStage && (
                <p className="text-xs sm:text-sm md:text-base text-gray-700 flex items-center gap-1.5 sm:gap-2 mt-1">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 md:h-4 sm:w-4 md:w-4 text-green-600" />
                  <span>Tahap: {product.usageStage}</span>
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Benefits */}
        <div className="mt-5 sm:mt-6 md:mt-8 bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 space-y-2.5 sm:space-y-3 md:space-y-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Manfaat Utama</h2>
          <ul className="space-y-1.5 sm:space-y-2">
            {benefits.map((b: string, idx: number) => (
              <li key={idx} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base text-gray-800">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 md:h-5 sm:w-4 md:w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Structured info */}
        <div className="mt-5 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 space-y-2.5 sm:space-y-3">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold">Detail Teknis</h3>
            {product.problemSolution && (
              <div>
                <p className="font-semibold text-sm sm:text-base text-gray-900">Masalah & Solusi</p>
                <p className="text-xs sm:text-sm md:text-base text-gray-700">{product.problemSolution}</p>
              </div>
            )}
            {pestTargets.length > 0 && (
              <div>
                <p className="font-semibold text-gray-900">Target Hama/Penyakit</p>
                <p className="text-gray-700 text-sm">{pestTargets.join(', ')}</p>
              </div>
            )}
            {activeIngredients.length > 0 && (
              <div>
                <p className="font-semibold text-gray-900">Bahan Aktif</p>
                <p className="text-gray-700 text-sm">{activeIngredients.join(', ')}</p>
              </div>
            )}
            {packagingVariants.length > 0 && (
              <div>
                <p className="font-semibold text-gray-900">Varian Kemasan</p>
                <p className="text-gray-700 text-sm">{packagingVariants.join(', ')}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-3">
            <h3 className="text-lg sm:text-xl font-semibold">Aplikasi & Keamanan</h3>
            {product.applicationMethod && (
              <div>
                <p className="font-semibold text-gray-900">Cara Aplikasi</p>
                <p className="text-gray-700">{product.applicationMethod}</p>
              </div>
            )}
            {product.dosage && (
              <div>
                <p className="font-semibold text-gray-900">Dosis & Frekuensi</p>
                <p className="text-gray-700">{product.dosage}</p>
              </div>
            )}
            {product.safetyNotes && (
              <div>
                <p className="font-semibold text-gray-900">Catatan Keamanan</p>
                <p className="text-gray-700">{product.safetyNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Full Description */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Deskripsi Produk</h2>
          <div
            className="prose prose-sm sm:prose-base max-w-none text-sm sm:text-base"
            dangerouslySetInnerHTML={{ __html: (product.description || '').replace(/\n/g, '<br>') }}
          />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Produk Terkait</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {relatedProducts.map((related) => {
                const discount = related.discountPrice
                  ? Math.round(((related.price - related.discountPrice) / related.price) * 100)
                  : 0;

                const handleRelatedCheckoutClick = () => {
                  setCheckoutModal({ isOpen: true, product: related });
                };

                return (
                  <div
                    key={related.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition group h-full flex flex-col"
                  >
                    <Link href={`/produk/${related.slug}`} className="block">
                      <div className="relative overflow-hidden">
                        {related.imageUrl ? (
                          <div className="relative h-48 bg-gray-100">
                            <Image
                              src={related.imageUrl}
                              alt={related.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                            Gambar Tidak Tersedia
                          </div>
                        )}
                        {discount > 0 && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-lg">
                            -{discount}%
                          </span>
                        )}
                        {related.badge && related.badge !== 'none' && (
                          <span className="absolute top-2 left-2 bg-green-700 text-white text-xs font-semibold px-3 py-1 rounded-lg">
                            {related.badge.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
                      <Link href={`/produk/${related.slug}`} className="group">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium mb-2 inline-block">
                          {related.category?.name || 'Produk'}
                        </span>
                        <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-green-700 transition">
                          {related.name}
                        </h3>
                      </Link>
                      
                      <div className="flex items-baseline space-x-2 mb-2 flex-wrap">
                        {related.discountPrice ? (
                          <>
                            <span className="text-xl sm:text-2xl font-bold text-green-700">
                              Rp {related.discountPrice.toLocaleString('id-ID')}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500 line-through">
                              Rp {related.price.toLocaleString('id-ID')}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl sm:text-2xl font-bold text-green-700">
                            Rp {related.price.toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2 flex-1">
                        {related.shortDescription || (related.description || '').substring(0, 100)}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-3 sm:pt-4">
                        <button
                          className="flex-1 bg-green-700 hover:bg-green-800 text-white text-xs sm:text-sm rounded-lg text-center py-2 sm:py-2.5 flex items-center justify-center gap-1 relative"
                          onClick={handleRelatedCheckoutClick}
                        >
                          <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>Pesan</span>
                          {/* Icons kecil di dalam button */}
                          <div className="absolute right-1.5 sm:right-2 flex items-center gap-0.5 sm:gap-1">
                            {related.shopeeUrl && (
                              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-orange-500 rounded-full flex items-center justify-center">
                                <span className="text-[6px] sm:text-[7px] font-bold text-white">S</span>
                              </div>
                            )}
                            {related.tokopediaUrl && (
                              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                                <span className="text-[6px] sm:text-[7px] font-bold text-white">T</span>
                              </div>
                            )}
                            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                              <MessageCircle className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" />
                            </div>
                          </div>
                        </button>
                        <Link href={`/produk/${related.slug}`} className="flex-1">
                          <button className="w-full bg-gray-100 text-gray-800 text-xs sm:text-sm rounded-lg text-center py-2 sm:py-2.5 hover:bg-gray-200 flex items-center justify-center gap-1">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            Detail
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Related Blogs */}
        {relatedBlogs.length > 0 && (
          <div className="mt-8 sm:mt-12 bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Artikel Edukasi Terkait</h2>
            <div className="space-y-2 sm:space-y-3">
              {relatedBlogs.map((b) => (
                <Link
                  key={b.id}
                  href={`/blog/${b.slug}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex-1">
                    <p className="text-sm text-green-600 font-semibold">{b.category?.name || 'Blog'}</p>
                    <p className="text-base font-semibold text-gray-900">{b.title}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{b.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sticky CTA mobile */}
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
          <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-3 flex flex-col gap-2 max-w-md mx-auto">
            <button
              onClick={() => openWhatsApp(product.name, product.id, 'sticky')}
              className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 text-sm"
            >
              Konsultasi & Pesan via WhatsApp
            </button>
            <div className="grid grid-cols-2 gap-2">
              {product.shopeeUrl && (
                <button
                  onClick={async (e) => {
                    if (!salesEnabled || loadingSalesStatus) {
                      e.preventDefault();
                      return;
                    }
                    // STEP 14B: Track click_cta event
                    trackEvent({
                      event: 'click_cta',
                      meta: {
                        productId: product.id,
                        cta_type: 'checkout', // Shopee is a checkout type
                        location: 'product_detail_sticky',
                      },
                    });
                    trackEventLegacy({
                      eventType: 'CTA_Click',
                      productId: product.id,
                      metadata: { cta: 'shopee', source: 'product_detail_sticky' },
                    });
                    await fetch('/api/analytics/cta-click', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        pageType: 'product',
                        pageId: product.id,
                        ctaType: 'shopee',
                        ctaLabel: 'Shopee',
                        ctaPosition: 'sticky',
                        metadata: { productName: product.name },
                      }),
                    }).catch(() => {});
                    
                    if (salesEnabled && !loadingSalesStatus) {
                      window.open(product.shopeeUrl, '_blank');
                    }
                  }}
                  disabled={!salesEnabled || loadingSalesStatus}
                  className={`w-full px-4 py-2 text-white text-sm font-semibold rounded-lg text-center ${
                    salesEnabled && !loadingSalesStatus
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  title={!salesEnabled ? 'Penjualan sedang dinonaktifkan' : undefined}
                >
                  Shopee
                </button>
              )}
              {product.tokopediaUrl && (
                <button
                  onClick={async (e) => {
                    if (!salesEnabled || loadingSalesStatus) {
                      e.preventDefault();
                      return;
                    }
                    // STEP 14B: Track click_cta event
                    trackEvent({
                      event: 'click_cta',
                      meta: {
                        productId: product.id,
                        cta_type: 'checkout', // Tokopedia is a checkout type
                        location: 'product_detail_sticky',
                      },
                    });
                    trackEventLegacy({
                      eventType: 'CTA_Click',
                      productId: product.id,
                      metadata: { cta: 'tokopedia', source: 'product_detail_sticky' },
                    });
                    await fetch('/api/analytics/cta-click', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        pageType: 'product',
                        pageId: product.id,
                        ctaType: 'tokopedia',
                        ctaLabel: 'Tokopedia',
                        ctaPosition: 'sticky',
                        metadata: { productName: product.name },
                      }),
                    }).catch(() => {});
                    
                    if (salesEnabled && !loadingSalesStatus) {
                      window.open(product.tokopediaUrl, '_blank');
                    }
                  }}
                  disabled={!salesEnabled || loadingSalesStatus}
                  className={`w-full px-4 py-2 text-white text-sm font-semibold rounded-lg text-center ${
                    salesEnabled && !loadingSalesStatus
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  title={!salesEnabled ? 'Penjualan sedang dinonaktifkan' : undefined}
                >
                  Tokopedia
                </button>
              )}
              {!salesEnabled && !loadingSalesStatus && (product.shopeeUrl || product.tokopediaUrl) && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  Pemesanan sedang tidak tersedia. Silakan kembali lagi nanti.
                </p>
              )}
            </div>
          </div>
        </div>

        <WhatsAppButton productId={product.id} productName={product.name} />

        {/* Exit Intent Handler */}
        <ExitIntentHandler
          pageType="product"
          pageId={product.id}
          suggestion={{
            title: 'Butuh Bantuan?',
            message: `Masih punya pertanyaan tentang ${product.name}? Konsultasi langsung dengan tim kami.`,
            ctaText: 'Konsultasi via WhatsApp',
            ctaUrl: `https://wa.me/6281234567890?text=Halo, saya tertarik dengan ${encodeURIComponent(product.name)}. Bisa minta informasi lebih lanjut?`,
            ctaType: 'whatsapp',
          }}
        />

        {/* Checkout Modal for Related Products */}
        {checkoutModal.isOpen && checkoutModal.product && (
          <CheckoutModal
            isOpen={checkoutModal.isOpen}
            onClose={() => setCheckoutModal({ isOpen: false, product: null })}
            product={checkoutModal.product}
            onTrack={(platform) => {
              trackEvent({
                event: 'click_cta',
                meta: { productId: checkoutModal.product.id, cta: platform, source: 'related_products' },
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

