/**
 * ProductDetail - Pure presentational component
 * 
 * Main product detail layout component
 * Server component only - no client logic
 */

import Link from 'next/link';
import ProductGallery from './ProductGallery';
import ProductPrice from './ProductPrice';
import ProductDescription from './ProductDescription';
import ProductAdditionalInfo from './ProductAdditionalInfo';
import BuyButton from './BuyButton';
import SocialProof from '@/components/SocialProof';
import CTAMatcher from '@/components/cta/CTAMatcher';
import WhatsAppCTAButton from './WhatsAppCTAButton';
import ConversionHints from './ConversionHints';
import ProductViewTracker from './ProductViewTracker';
import RelatedArticles from './RelatedArticles';
// import InquiryForm from './InquiryForm'; // TEMPORARILY DISABLED FOR DEBUGGING
import { ArrowLeft } from 'lucide-react';

interface ProductDetailProps {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageGallery: string[];
  priceResolved: number;
  shopeeUrl: string | null;
  tokopediaUrl: string | null;
  category: {
    name: string;
    slug: string;
  };
  additionalInfo: {
    problemSolution: string | null;
    applicationMethod: string | null;
    dosage: string | null;
    advantages: string | null;
    safetyNotes: string | null;
  };
}

export default function ProductDetail({
  id,
  name,
  slug,
  description,
  imageGallery,
  priceResolved,
  shopeeUrl,
  tokopediaUrl,
  category,
  additionalInfo,
}: ProductDetailProps) {
  return (
    <>
      {/* PHASE F — F4: Product View Tracking */}
      <ProductViewTracker productId={id} productName={name} slug={slug} />
      
      <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
        {/* Back Button */}
        <Link
          href="/produk"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Kembali ke Daftar Produk</span>
        </Link>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10">
            {/* Left Column - Images */}
            <div>
              <ProductGallery images={imageGallery} productName={name} />
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Category Badge */}
              <div>
                <Link
                  href={`/produk?category=${category.slug}`}
                  className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {category.name}
                </Link>
              </div>

              {/* Product Name */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                {name}
              </h1>

              {/* Price */}
              <ProductPrice price={priceResolved} />

              {/* Description */}
              <ProductDescription description={description} />

              {/* Additional Information - Defensive rendering */}
              {additionalInfo && (
                <ProductAdditionalInfo additionalInfo={additionalInfo} />
              )}

              {/* PHASE F — F3: Conversion Hints */}
              <div className="pt-4 border-t">
                <ConversionHints type="product" />
              </div>

              {/* CTA Section - PHASE F: Strategic CTA */}
              <div className="pt-6 border-t">
                <p className="text-sm text-gray-600 mb-4">
                  Tertarik dengan produk ini? Pilih channel pembelian di bawah ini.
                </p>
                
                {/* PHASE F — F2: Primary CTA - Pesan via WhatsApp */}
                <div className="mb-3">
                  <WhatsAppCTAButton
                    productId={id}
                    productName={name}
                    label="Pesan via WhatsApp"
                    variant="primary"
                    className="w-full"
                  />
                </div>

                {/* Secondary CTA - Lihat Produk Lain */}
                <div className="mb-4">
                  <Link
                    href="/produk"
                    className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg font-semibold bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 transition-colors"
                  >
                    <span>Lihat Produk Lain</span>
                  </Link>
                </div>

                {/* Buy Button (existing) */}
                <BuyButton
                  productId={id}
                  productName={name}
                  productPrice={priceResolved}
                  shopeeUrl={shopeeUrl}
                  tokopediaUrl={tokopediaUrl}
                />
              </div>

              {/* FASE 5: CTA Display */}
              <div className="mt-4">
                <CTAMatcher
                  contentType="product"
                  contentTitle={name}
                  contentBody={description}
                  keywords={[category.name]}
                  pagePath={`/produk/${slug}`}
                  placement="inline"
                />
              </div>
            </div>
          </div>

          {/* F6-A: Social Proof */}
          <SocialProof productId={id} productName={name} />

          {/* EKSEKUSI 2: Related Articles */}
          <RelatedArticles productSlug={slug} />

          {/* Inquiry Form Section - TEMPORARILY DISABLED FOR DEBUGGING SSR 500 ERROR */}
          {/* <div className="mt-8 lg:mt-12">
            <InquiryForm
              context="PRODUCT"
              contextId={id}
              title="Tanya tentang produk ini"
              subtitle="Isi form di bawah dan kami akan menghubungi Anda segera"
            />
          </div> */}
        </div>
      </div>
    </div>
    </>
  );
}
