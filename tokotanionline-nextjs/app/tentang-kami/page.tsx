import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AboutPageClient from '@/components/AboutPageClient';
import ProductSuggestion from '@/components/public/ProductSuggestion';
import { Metadata } from 'next';
import { getPublicSiteSettings } from '@/lib/site-settings';
import { getSeoDefaults, truncateTitle, truncateMetaDescription } from '@/lib/seo-helpers';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata(): Promise<Metadata> {
  const defaults = await getSeoDefaults();
  
  return {
    title: truncateTitle('Tentang Kami - TOKO TANI ONLINE', 60),
    description: truncateMetaDescription(
      'Tentang TOKO TANI ONLINE - Solusi pertanian terpercaya untuk kebutuhan pertanian Anda.',
      160
    ) || defaults.description,
    alternates: {
      canonical: `${baseUrl}/tentang-kami`,
    },
  };
}

export const dynamic = 'force-dynamic';

/**
 * PHASE 3.3.1 — STEP 4B-3: About Page (Dynamic)
 * 
 * Prinsip:
 * - Admin = single source of truth
 * - Render aboutContent dari SiteSettings
 * - Tidak styling berlebihan
 * - Tidak sanitize berlebihan (admin trusted)
 */
export default async function AboutPage() {
  // PHASE 3.3.1: Fetch site settings (defensive)
  const siteSettings = await getPublicSiteSettings();

  return (
    <>
      <Navbar siteSettings={siteSettings || undefined} />
      <AboutPageClient siteSettings={siteSettings || {}} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <ProductSuggestion />
      </div>
      <Footer siteSettings={siteSettings || undefined} />
    </>
  );
}
