/**
 * PHASE 1.2: Enterprise UI Execution (READ-ONLY, SUPER FAST)
 * 
 * Pure Server Component with ISR
 * - No client-side logic
 * - No direct DB queries
 * - Single data source: /api/public/home
 * - ISR revalidate: 300 seconds (5 minutes)
 * 
 * Design Direction: Marketplace besar — isi dulu baru janji
 * Confidence lewat density, bukan dekorasi
 * 
 * Struktur Final (WAJIB IKUT):
 * 0. Header (Marketplace Header)
 * 1. Hero kecil (Context only)
 * 2. Produk Unggulan (DOMINAN)
 * 3. Kategori Produk (Quick Explore)
 * 4. Konten & Insight (Editorial, DOMINAN)
 * 5. Trust & Safety (Ringkas)
 * 6. Footer (Padat & Informatif)
 */

import { getPublicHome } from '@/lib/public-api';
import { getPublicSiteSettings } from '@/lib/site-settings';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/seo-helpers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Hero from '@/components/sections/Hero';
import ValueProps from '@/components/sections/ValueProps';
import Highlights from '@/components/sections/Highlights';
import FeaturedProducts from '@/components/sections/FeaturedProducts';
import ProductCategories from '@/components/sections/ProductCategories';
import LatestPosts from '@/components/sections/LatestPosts';
import Trust from '@/components/sections/Trust';
import Safety from '@/components/sections/Safety';
import CTA from '@/components/sections/CTA';

// This page fetches live data; do not prerender at build time.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // PHASE 3.3.1: Fetch site settings for Navbar, Hero, Footer
  let settings;
  try {
    settings = await getPublicSiteSettings();
  } catch (error: any) {
    console.error('[HomePage] Error fetching site settings:', error?.message || error);
    settings = null;
  }
  
  // Single data source: public API - READ-ONLY
  let data;
  try {
    data = await getPublicHome();
  } catch (error: any) {
    console.error('[HomePage] Error fetching home data:', error?.message || error);
    // Use default empty data
    data = {
      hero: { title: '', subtitle: '' },
      categories: [],
      featuredProducts: [],
      latestPosts: [],
    };
  }

  // FASE 5.1 STEP 1: Hero Authority - semua data dari Website Settings
  const heroTitle = settings?.heroTitle ?? null;
  const heroSubtitle = settings?.heroSubtitle ?? null;
  const heroCtaText = settings?.heroCtaText ?? null;
  // Default CTA link ke produk (netral)
  const heroCtaLink = '/produk';

  // FASE 5.1 STEP 2: Value Proposition - semua data dari Website Settings
  const valuePropsTitle = settings?.valuePropsTitle ?? null;
  const valueProps = settings?.valueProps ? (() => {
    try {
      return JSON.parse(settings.valueProps);
    } catch {
      return null;
    }
  })() : null;

  // FASE 5.1 STEP 3: Highlights - produk dan konten terkurasi (maks 6 item)
  // Data dari API (sudah filtered PUBLISHED only)
  const highlightsTitle = null; // Bisa dari Website Settings jika diperlukan

  // FASE 5.1 STEP 4: Trust Section - semua data dari Website Settings
  const trustTitle = null; // Bisa dari Website Settings jika diperlukan

  // FASE 6.1: Generate structured data (with error handling)
  let organizationSchema, websiteSchema;
  try {
    organizationSchema = await generateOrganizationSchema();
  } catch (error: any) {
    console.error('[HomePage] Error generating organization schema:', error?.message || error);
    organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Toko Tani Online',
      url: process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com',
    };
  }
  
  try {
    websiteSchema = await generateWebSiteSchema();
  } catch (error: any) {
    console.error('[HomePage] Error generating website schema:', error?.message || error);
    websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Toko Tani Online',
      url: process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com',
    };
  }

  return (
    <>
      {/* FASE 6.1: Structured Data - Organization & WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      
      <Navbar siteSettings={settings || undefined} />
      <Hero 
        title={heroTitle} 
        subtitle={heroSubtitle} 
        ctaText={heroCtaText}
        ctaLink={heroCtaLink}
        featuredProducts={data.featuredProducts.slice(0, 4)}
      />
      <ValueProps 
        title={valuePropsTitle}
        items={valueProps}
      />
      <Highlights 
        products={data.featuredProducts}
        posts={data.latestPosts}
        title={highlightsTitle}
      />
      <FeaturedProducts products={data.featuredProducts} />
      <ProductCategories categories={data.categories} />
      <LatestPosts posts={data.latestPosts} />
      <Trust
        aboutContent={settings?.aboutContent}
        footerAbout={settings?.footerAbout}
        footerAddress={settings?.footerAddress}
        footerPhone={settings?.footerPhone}
        footerEmail={settings?.footerEmail}
        title={trustTitle}
      />
      <Safety />
      <CTA />
      <Footer siteSettings={settings || undefined} />
    </>
  );
}

// FASE 6.1: SEO Authority - On-Page Hygiene
import { getSeoDefaults, truncateTitle, truncateMetaDescription } from '@/lib/seo-helpers';

export async function generateMetadata() {
  try {
    const defaults = await getSeoDefaults();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';
    
    return {
      title: truncateTitle(defaults.title, 60),
      description: truncateMetaDescription(defaults.description, 160),
      alternates: {
        canonical: baseUrl,
      },
      openGraph: {
        title: truncateTitle(defaults.title, 60),
        description: truncateMetaDescription(defaults.description, 160),
        type: 'website',
        locale: 'id_ID',
        url: baseUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title: truncateTitle(defaults.title, 60),
        description: truncateMetaDescription(defaults.description, 160),
      },
    };
  } catch (error: any) {
    // Fallback metadata jika error
    console.error('[generateMetadata] Error generating metadata:', error?.message || error);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';
    return {
      title: 'Toko Tani Online',
      description: 'Platform Pertanian Terpercaya',
      alternates: {
        canonical: baseUrl,
      },
      openGraph: {
        title: 'Toko Tani Online',
        description: 'Platform Pertanian Terpercaya',
        type: 'website',
        locale: 'id_ID',
        url: baseUrl,
      },
    };
  }
}
