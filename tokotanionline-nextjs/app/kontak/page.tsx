import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContactPageClient from '@/components/ContactPageClient';
import ProductSuggestion from '@/components/public/ProductSuggestion';
import { Metadata } from 'next';
import { getPublicSiteSettings } from '@/lib/site-settings';
import { getSeoDefaults, truncateTitle, truncateMetaDescription } from '@/lib/seo-helpers';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata(): Promise<Metadata> {
  const defaults = await getSeoDefaults();
  
  return {
    title: truncateTitle('Kontak - TOKO TANI ONLINE', 60),
    description: truncateMetaDescription(
      'Hubungi TOKO TANI ONLINE untuk konsultasi dan informasi produk pertanian.',
      160
    ) || defaults.description,
    alternates: {
      canonical: `${baseUrl}/kontak`,
    },
  };
}

export const dynamic = 'force-dynamic';

/**
 * PHASE 3.3.1 — STEP 4B-4: Contact Page (Dynamic)
 * 
 * Prinsip:
 * - Admin = single source of truth
 * - Render contactContent dari SiteSettings
 * - Sinkron penuh dengan admin
 */
export default async function ContactPage() {
  // PHASE 3.3.1: Fetch site settings (defensive)
  const siteSettings = await getPublicSiteSettings();

  return (
    <>
      <Navbar siteSettings={siteSettings || undefined} />
      <ContactPageClient siteSettings={siteSettings || {}} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <ProductSuggestion />
      </div>
      <Footer siteSettings={siteSettings || undefined} />
    </>
  );
}
