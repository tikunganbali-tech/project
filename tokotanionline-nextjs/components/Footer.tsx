import Link from 'next/link';
import { ShoppingCart, Mail, Phone, MapPin, Facebook, Instagram, Youtube } from 'lucide-react';

interface FooterProps {
  siteSettings?: {
    siteTitle?: string | null;
    tagline?: string | null;
    footerAbout?: string | null;
    footerAddress?: string | null;
    footerPhone?: string | null;
    footerEmail?: string | null;
    footerText?: string | null;
  };
}

export default function Footer({ siteSettings }: FooterProps = {}) {
  // Semua data dari Website Settings dengan fallback yang sesuai
  const siteTitle = siteSettings?.siteTitle || 'TOKOTANIONLINE';
  const footerAbout = siteSettings?.footerAbout || 'Toko pertanian online terpercaya. Menyediakan benih, pupuk, pestisida berkualitas untuk pertanian Indonesia.';
  const footerAddress = siteSettings?.footerAddress || 'Jl. Pertanian No. 123, Jakarta, Indonesia';
  const footerPhone = siteSettings?.footerPhone || '+62 812-3456-7890';
  const footerEmail = siteSettings?.footerEmail || 'info@tokotanionline.com';
  const footerText = siteSettings?.footerText || null;

  return (
    <footer className="bg-white border-t border-gray-200 text-gray-700">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-10 sm:py-12 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 md:gap-12">
          {/* Company Info - HealthStore Style */}
          <div>
            <div className="mb-4">
              <span className="font-bold text-xl text-gray-900">{siteTitle}</span>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              {footerAbout || 'Platform terpercaya untuk informasi kesehatan dan produk wellness berkualitas.'}
            </p>
            <div className="flex gap-3">
              <a href="#" className="hover:text-blue-600 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Produk Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-base">Produk</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/produk?category=Suplemen" className="hover:text-blue-600 transition-colors text-gray-600">
                  Suplemen
                </Link>
              </li>
              <li>
                <Link href="/produk?category=Vitamin" className="hover:text-blue-600 transition-colors text-gray-600">
                  Vitamin
                </Link>
              </li>
              <li>
                <Link href="/produk?category=Wellness" className="hover:text-blue-600 transition-colors text-gray-600">
                  Wellness
                </Link>
              </li>
            </ul>
          </div>

          {/* Informasi Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-base">Informasi</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/blog" className="hover:text-blue-600 transition-colors text-gray-600">
                  Artikel
                </Link>
              </li>
              <li>
                <Link href="/tentang-kami" className="hover:text-blue-600 transition-colors text-gray-600">
                  Tentang Kami
                </Link>
              </li>
              <li>
                <Link href="/kontak" className="hover:text-blue-600 transition-colors text-gray-600">
                  Kontak
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 text-base">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/kebijakan-privasi" className="hover:text-blue-600 transition-colors text-gray-600">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link href="/syarat-ketentuan" className="hover:text-blue-600 transition-colors text-gray-600">
                  Syarat & Ketentuan
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 sm:mt-10 pt-6 sm:pt-8 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} {siteTitle}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
