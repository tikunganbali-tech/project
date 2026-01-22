'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, ChevronRight, Share2, MessageCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import ExitIntentHandler from './ExitIntentHandler';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

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

interface BlogDetailClientProps {
  blog: any;
  relatedBlogs: any[];
  suggestedProducts: any[];
}

export default function BlogDetailClient({
  blog,
  relatedBlogs,
  suggestedProducts,
}: BlogDetailClientProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog.title,
        text: blog.excerpt,
        url: window.location.href
      });
    }
  };

  // M-07: Render content based on contentMode
  // No auto-formatting - respect the mode
  const contentMode = blog.contentMode || 'HTML'; // Default to HTML for backward compatibility
  const [showProductSuggestion, setShowProductSuggestion] = useState(false);
  const [showSoftCTA, setShowSoftCTA] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const productSuggestionShown = useRef(false);
  const softCTAShown = useRef(false);

  // Track scroll depth and show inline elements
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const currentScroll = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);
      
      setScrollPercent(currentScroll);

      // Show product suggestion at 30% scroll (only once)
      if (currentScroll >= 30 && !productSuggestionShown.current && suggestedProducts.length > 0) {
        setShowProductSuggestion(true);
        productSuggestionShown.current = true;
      }

      // Show soft CTA at 60% scroll (only once)
      if (currentScroll >= 60 && !softCTAShown.current) {
        setShowSoftCTA(true);
        softCTAShown.current = true;
      }

      // Track scroll milestones
      const milestones = [25, 50, 75, 100];
      milestones.forEach((m) => {
        if (currentScroll >= m) {
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'ScrollDepth',
              pageType: 'blog',
              pageId: blog.id,
              metadata: { depth: m, source: 'blog_detail' },
            }),
          }).catch(() => {});
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [blog.id, suggestedProducts.length]);

  const openWhatsApp = async (message: string, position: string = 'inline') => {
    try {
      const res = await fetch('/api/whatsapp/rotate', { cache: 'no-store' });
      const data = await res.json();
      const phone = data.phone || '6281234567890';
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      
      // Track CTA click
      await fetch('/api/analytics/cta-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'blog',
          pageId: blog.id,
          ctaType: 'whatsapp',
          ctaLabel: 'Konsultasi',
          ctaPosition: position,
          metadata: { blogTitle: blog.title },
        }),
      }).catch(() => {});
      
      window.open(url, '_blank');
    } catch {
      const url = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm overflow-x-auto scrollbar-hide">
            <Link href="/" className="text-gray-600 hover:text-green-700 whitespace-nowrap">
              Beranda
            </Link>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <Link href="/blog" className="text-gray-600 hover:text-green-700 whitespace-nowrap">
              Blog
            </Link>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-900 font-medium line-clamp-1 truncate">{blog.title}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/blog">
            <button className="mb-4 sm:mb-6 px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 hover:text-green-700 hover:bg-gray-50 rounded-lg transition">
              <ArrowLeft className="inline h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Kembali ke Blog
            </button>
          </Link>

          {/* Article Header */}
          <article className="bg-white rounded-lg shadow-md overflow-hidden mb-6 sm:mb-8">
            {/* M-04: Hero Image - Above title, full width, priority loading */}
            {blog.imageUrl && (
              <div className="relative h-48 sm:h-64 md:h-96 bg-gray-100 w-full">
                <Image
                  src={normalizeImageSrc(blog.imageUrl)}
                  alt={blog.title || 'Hero image'}
                  fill
                  className="object-cover"
                  priority={true}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                />
              </div>
            )}

            <div className="p-4 sm:p-6 md:p-8">
              <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs sm:text-sm font-semibold mb-3 sm:mb-4 inline-block">
                {blog.category?.name || 'Artikel'}
              </span>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">{blog.title}</h1>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{blog.publishedAt ? formatDate(blog.publishedAt) : 'Baru'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{blog.author || 'Admin'}</span>
                </div>
                <button onClick={handleShare} className="px-2 sm:px-3 py-1 text-gray-600 hover:text-green-700 hover:bg-gray-50 rounded-lg transition">
                  <Share2 className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Bagikan
                </button>
              </div>

              <div className="border-t border-gray-200 my-6"></div>

              {/* Article Content */}
              {/* M-07: Render based on contentMode */}
              {contentMode === 'TEXT' ? (
                <div
                  ref={contentRef}
                  className="blog-content prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-700 whitespace-pre-wrap"
                >
                  {blog.content || ''}
                </div>
              ) : (
                <div
                  ref={contentRef}
                  className="blog-content prose prose-sm sm:prose-base lg:prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: blog.content || '' }}
                />
              )}

              {/* Product Suggestion at 30% scroll */}
              {showProductSuggestion && suggestedProducts && suggestedProducts.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 sm:p-5 md:p-6 mt-6 sm:mt-8 border border-green-200 transition-all duration-500 ease-in-out">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Produk Rekomendasi</h3>
                  <p className="text-sm sm:text-base text-gray-700 mb-4">Produk-produk berikut bisa membantu Anda:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {suggestedProducts.slice(0, 3).map((prod: any) => (
                      <div
                        key={prod.id}
                        className="bg-white rounded-lg p-3 sm:p-4 hover:shadow-md transition flex flex-col border border-gray-200"
                      >
                        {prod.imageUrl && (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-28 sm:h-32 object-cover rounded mb-2 sm:mb-3"
                          />
                        )}
                        <h4 className="font-semibold text-xs sm:text-sm mb-2 line-clamp-2 flex-1">
                          {prod.name}
                        </h4>
                        <p className="text-green-700 font-bold text-sm sm:text-base mb-3">
                          Rp {(prod.discountPrice || prod.price).toLocaleString('id-ID')}
                        </p>
                        <Link href={`/produk/${prod.slug}`}>
                          <button className="w-full bg-green-700 hover:bg-green-800 text-white text-xs sm:text-sm font-medium py-2 rounded-lg transition-colors">
                            Lihat Detail
                          </button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Soft CTA at 60% scroll */}
              {showSoftCTA && (
                <div className="bg-blue-50 rounded-lg p-4 sm:p-5 md:p-6 mt-6 sm:mt-8 border-l-4 border-blue-500 transition-all duration-500 ease-in-out">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 text-gray-900">Butuh Bantuan?</h3>
                      <p className="text-sm sm:text-base text-gray-700 mb-4">
                        Masih punya pertanyaan tentang topik ini? Tim kami siap membantu Anda.
                      </p>
                      <button
                        onClick={() => openWhatsApp(`Halo, saya membaca artikel tentang ${blog.title}. Bisa minta informasi lebih lanjut?`, 'inline_60pct')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg flex items-center gap-2 transition"
                      >
                        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        Konsultasi via WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 my-8"></div>

              {/* Clear NEXT STEP at end */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 sm:p-8 text-white">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Langkah Selanjutnya</h3>
                <p className="text-base sm:text-lg mb-6 text-green-50">
                  Siap menerapkan pengetahuan ini? Konsultasikan kebutuhan Anda dengan tim kami untuk solusi terbaik.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => openWhatsApp(`Halo, setelah membaca artikel "${blog.title}", saya ingin konsultasi tentang produk yang sesuai.`, 'next_step')}
                    className="flex-1 bg-white text-green-700 hover:bg-green-50 font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Konsultasi Gratis
                  </button>
                  {suggestedProducts && suggestedProducts.length > 0 && (
                    <Link href={`/produk/${suggestedProducts[0].slug}`} className="flex-1">
                      <button className="w-full bg-green-800 hover:bg-green-900 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition">
                        <ShoppingBag className="h-5 w-5" />
                        Lihat Produk Terkait
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </article>

          {/* Related Articles */}
          {relatedBlogs.length > 0 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Artikel Terkait</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {relatedBlogs.map((related) => (
                  <Link key={related.id} href={`/blog/${related.slug}`} className="group">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                      {related.imageUrl && (
                        <div className="relative h-48 bg-gray-100 overflow-hidden">
                          <Image
                            src={related.imageUrl}
                            alt={related.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {related.publishedAt ? formatDate(related.publishedAt) : 'Baru'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{related.author || 'Admin'}</span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-green-700 transition">
                          {related.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
                          {related.excerpt}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exit Intent Handler */}
      <ExitIntentHandler
        pageType="blog"
        pageId={blog.id}
        suggestion={{
          title: 'Tertarik dengan Topik Ini?',
          message: `Konsultasi langsung dengan tim kami untuk mendapatkan solusi terbaik terkait ${blog.title}.`,
          ctaText: 'Konsultasi via WhatsApp',
          ctaUrl: `https://wa.me/6281234567890?text=Halo, saya membaca artikel tentang ${encodeURIComponent(blog.title)}. Bisa minta informasi lebih lanjut?`,
          ctaType: 'whatsapp',
        }}
      />
    </div>
  );
}

