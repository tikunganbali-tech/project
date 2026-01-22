/**
 * BlogArticle - Pure presentational component
 * 
 * Displays blog post article content
 * Server component only - no client logic
 * PHASE B2-L: Added FAQ and Related Products display
 */

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import BlogMeta from './BlogMeta';
import InquiryForm from './InquiryForm';
import CTAMatcher from '@/components/cta/CTAMatcher';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';
import WhatsAppCTAButton from './WhatsAppCTAButton';
import ConversionHints from './ConversionHints';

interface BlogArticleProps {
  title: string;
  content: string;
  contentMode?: 'TEXT' | 'HTML'; // M-07
  publishedAt: string | Date;
  slug?: string; // For contextId in inquiry form
  // PHASE B2-L: FAQ and related products
  faq?: Array<{ q: string; a: string }>;
  relatedProducts?: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    priceResolved: number;
  }>;
}

export default function BlogArticle({
  title,
  content,
  contentMode = 'HTML', // M-07: Default to HTML for backward compatibility
  publishedAt,
  slug,
  faq,
  relatedProducts,
}: BlogArticleProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
        {/* Back Button */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Kembali ke Daftar Artikel</span>
        </Link>

        <div className="max-w-4xl mx-auto">
          <article className="bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {title}
            </h1>

            {/* Meta */}
            <BlogMeta publishedAt={publishedAt} />

            {/* Content */}
            {/* M-07: Render based on contentMode (TEXT or HTML) */}
            <div className="prose prose-lg max-w-none">
              {contentMode === 'TEXT' ? (
                <div className="text-gray-700 whitespace-pre-wrap">
                  {content}
                </div>
              ) : (
                <div
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{ __html: content }}
                  data-content-hash={typeof window !== 'undefined' ? undefined : content} // Server-side hash marker
                />
              )}
              
              {/* PHASE F — F2: CTA after 2nd paragraph */}
              <div className="my-8 p-6 bg-green-50 border border-green-200 rounded-lg not-prose">
                <p className="text-gray-700 mb-4 font-medium">
                  Butuh produk pendukung? Lihat rekomendasi kami
                </p>
                <WhatsAppCTAButton
                  articleId={slug}
                  articleTitle={title}
                  label="Konsultasi via WhatsApp"
                  variant="primary"
                />
              </div>
              
              {/* PHASE F — F4: Track blog CTA view (light tracking) */}
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    (function() {
                      if (process.env.NODE_ENV === 'development') {
                        if (process.env.NODE_ENV === 'development') {
                        console.log('[PHASE-F] Event:', {
                          event: 'view_blog_cta',
                          articleId: '${slug || ''}',
                          articleTitle: '${title.replace(/'/g, "\\'")}',
                          location: 'after_2nd_paragraph',
                          timestamp: new Date().toISOString(),
                        });
                      }
                    })();
                  `,
                }}
              />
            </div>

            {/* PHASE F — F2: CTA End of Article */}
            <div className="mt-8 pt-6 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-gray-700 mb-4 font-medium">
                  Konsultasi gratis via WhatsApp
                </p>
                <div className="mb-4">
                  <ConversionHints type="blog" />
                </div>
                <WhatsAppCTAButton
                  articleId={slug}
                  articleTitle={title}
                  label="Hubungi Kami Sekarang"
                  variant="primary"
                />
              </div>
            </div>

            {/* FASE 5: CTA Display (existing) */}
            <div className="mt-4">
              <CTAMatcher
                contentType="blog"
                contentTitle={title}
                contentBody={content}
                pagePath={`/blog/${slug || ''}`}
                placement="inline"
              />
            </div>
          </article>

          {/* PHASE B2-L: FAQ Section */}
          {faq && faq.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
                Pertanyaan yang Sering Diajukan
              </h2>
              <div className="space-y-6">
                {faq.map((item, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      {item.q}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PHASE B2-L: Related Products Section */}
          {relatedProducts && relatedProducts.length > 0 ? (
            <div className="mt-8 bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
                Produk Terkait
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {relatedProducts.slice(0, 4).map((product) => (
                  <Link
                    key={product.id}
                    href={`/produk/${product.slug}`}
                    className="group bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="relative h-48 bg-gray-200">
                      {product.imageUrl ? (
                        <Image
                          src={normalizeImageSrc(product.imageUrl)}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span>No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-lg font-bold text-green-600">
                        Rp {product.priceResolved.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* LAST LOCK: Quality Indicator - Show badge if no related products */
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <span className="px-2 py-1 bg-yellow-200 text-yellow-900 rounded text-xs font-medium">
                  INFO
                </span>
                Artikel ini belum mendukung produk terkait
              </p>
            </div>
          )}

          {/* Inquiry Form Section */}
          <div className="mt-8">
            <InquiryForm
              context="BLOG"
              contextId={slug}
              title="Ada pertanyaan tentang artikel ini?"
              subtitle="Kirim pesan dan kami akan menghubungi Anda"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
