/**
 * FASE 5.1 — STEP 4: TRUST SECTION (AUTHORITY)
 * 
 * Prinsip:
 * - About ringkas (1-2 paragraf) - faktual, bukan klaim
 * - Contact jelas - alamat/email/telepon
 * - Kebijakan dasar - Privacy/Terms (link jika ada)
 * - Tidak ada testimonial/claim palsu
 * - Judul section jelas (H2)
 * - Whitespace lega, tone tenang & institusional
 * - Semua copy dari Website Settings
 * - Empty state tenang jika tidak ada data
 */

import Link from 'next/link';

interface TrustProps {
  aboutContent?: string | null;
  footerAbout?: string | null;
  footerAddress?: string | null;
  footerPhone?: string | null;
  footerEmail?: string | null;
  title?: string | null;
}

export default function Trust({
  aboutContent,
  footerAbout,
  footerAddress,
  footerPhone,
  footerEmail,
  title,
}: TrustProps) {
  // Gunakan aboutContent jika ada, fallback ke footerAbout
  const aboutText = aboutContent || footerAbout;
  
  // Cek apakah ada data yang cukup untuk ditampilkan
  const hasAbout = aboutText && aboutText.trim().length > 0;
  const hasContact = footerAddress || footerPhone || footerEmail;
  
  // Empty state tenang - tidak render jika tidak ada data
  if (!hasAbout && !hasContact) {
    return null;
  }

  const sectionTitle = title || 'Tentang Kami';

  // Split about text menjadi paragraf (maks 2 paragraf)
  const aboutParagraphs = aboutText
    ? aboutText
        .split(/\n\n|\n/)
        .filter((p) => p.trim().length > 0)
        .slice(0, 2)
    : [];

  return (
    <section className="bg-white py-10 sm:py-12 md:py-14 lg:py-16 border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-2.5xl md:text-3xl lg:text-3.5xl font-bold text-gray-900 mb-3 tracking-tight">
            {sectionTitle}
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 md:gap-8 lg:gap-10">
            {/* About Section */}
            {hasAbout && (
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-5">
                  Tentang
                </h3>
                <div className="space-y-4 text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                  {aboutParagraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Section */}
            {hasContact && (
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-4 sm:mb-5">
                  Kontak
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {footerAddress && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Alamat</p>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        {footerAddress}
                      </p>
                    </div>
                  )}
                  
                  {footerPhone && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Telepon</p>
                      <a
                        href={`tel:${footerPhone.replace(/\s/g, '')}`}
                        className="text-sm sm:text-base text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {footerPhone}
                      </a>
                    </div>
                  )}
                  
                  {footerEmail && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Email</p>
                      <a
                        href={`mailto:${footerEmail}`}
                        className="text-sm sm:text-base text-gray-600 hover:text-gray-900 transition-colors break-all"
                      >
                        {footerEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Kebijakan Dasar - Subtle, di bawah */}
          <div className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm text-gray-500 justify-center">
              {/* Privacy Policy - link jika halaman ada */}
              <Link 
                href="/privacy" 
                className="hover:text-gray-700 transition-colors"
              >
                Kebijakan Privasi
              </Link>
              <span className="hidden sm:inline text-gray-300">•</span>
              {/* Terms of Service - link jika halaman ada */}
              <Link 
                href="/terms" 
                className="hover:text-gray-700 transition-colors"
              >
                Syarat & Ketentuan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
