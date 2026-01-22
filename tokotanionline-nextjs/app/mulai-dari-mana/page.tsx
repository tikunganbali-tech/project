/**
 * FASE 7.3: "Mulai dari Mana?" Guide Page (PUBLIC)
 * 
 * Pure Server Component dengan ISR
 * - Halaman orientasi untuk pengunjung baru
 * - Menjelaskan struktur website dan cara mulai menggunakan
 * - Sesuai FASE 7.3.3 - H4: Halaman "Mulai dari Mana?"
 * 
 * Tujuan:
 * - Membantu First-Time Explorer (T1) memahami struktur website
 * - Mengarahkan ke kategori yang sesuai dengan kebutuhan
 * - Non-manipulatif, edukatif, sesuai positioning FASE 7.1
 */

import { getPublicCategories } from '@/lib/public-api';
import { getSeoDefaults, truncateTitle, truncateMetaDescription, generateBreadcrumbSchema } from '@/lib/seo-helpers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tokotanionline.com';

// FASE 6.1: Generate Metadata dengan SEO Global fallback
export async function generateMetadata(): Promise<Metadata> {
  try {
    const defaults = await getSeoDefaults();
    const seoTitle = 'Mulai dari Mana? - Panduan Lengkap TOKO TANI ONLINE';
    const seoDescription = 'Panduan lengkap untuk memulai menggunakan website kami. Pelajari struktur konten, kategori, dan cara menemukan informasi yang Anda butuhkan.';

    return {
      title: truncateTitle(seoTitle, 60),
      description: truncateMetaDescription(seoDescription, 160),
      alternates: {
        canonical: `${baseUrl}/mulai-dari-mana`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for Mulai dari Mana page:', error);
    const defaults = await getSeoDefaults();
    return {
      title: truncateTitle(defaults.title, 60),
      description: truncateMetaDescription(defaults.description, 160),
      alternates: {
        canonical: `${baseUrl}/mulai-dari-mana`,
      },
    };
  }
}

export default async function MulaiDariManaPage() {
  // Fetch categories untuk ditampilkan
  let categories: any[] = [];
  try {
    const categoriesData = await getPublicCategories();
    categories = categoriesData.categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    categories = [];
  }

  // FASE 6.1: Generate breadcrumb structured data
  const breadcrumbs = [
    { name: 'Beranda', url: '/' },
    { name: 'Mulai dari Mana?', url: '/mulai-dari-mana' },
  ];
  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  return (
    <>
      {/* FASE 6.1: Structured Data - BreadcrumbList */}
      {Object.keys(breadcrumbSchema).length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}

      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-600 mb-6">
            <a href="/" className="hover:text-green-700">
              Beranda
            </a>
            {' / '}
            <span className="text-gray-900">Mulai dari Mana?</span>
          </nav>

          {/* Header */}
          <div className="mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Mulai dari Mana?
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed max-w-3xl">
              Panduan lengkap untuk membantu Anda menemukan informasi yang tepat sesuai kebutuhan Anda.
              Website ini dirancang untuk memberikan pemahaman mendalam sebelum mengambil keputusan.
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-8 sm:space-y-10">
            {/* Section 1: Understanding the Structure */}
            <section className="bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4">
                Memahami Struktur Website
              </h2>
              <p className="text-base sm:text-lg text-gray-700 mb-6 leading-relaxed">
                Website ini dibagi menjadi 4 kategori konten utama. Setiap kategori memiliki fungsi khusus
                untuk membantu Anda di tahap yang berbeda dalam proses belajar dan mengambil keputusan.
              </p>

              {/* Categories Overview */}
              {categories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="border border-gray-200 rounded-lg p-5 sm:p-6 hover:border-green-300 hover:shadow-md transition-all"
                    >
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                        <Link
                          href={`/kategori/${category.slug}`}
                          className="hover:text-green-700 transition"
                        >
                          {category.name}
                        </Link>
                      </h3>
                      {category.summary && (
                        <p className="text-sm sm:text-base text-gray-600 mb-3 leading-relaxed">
                          {category.summary}
                        </p>
                      )}
                      <Link
                        href={`/kategori/${category.slug}`}
                        className="text-sm text-green-700 font-medium hover:underline inline-flex items-center"
                      >
                        Jelajahi kategori →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Section 2: Journey Guide */}
            <section className="bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4">
                Perjalanan Anda di Website Ini
              </h2>
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="border-l-4 border-green-600 pl-5 sm:pl-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    1. Mulai dengan Panduan Dasar
                  </h3>
                  <p className="text-base text-gray-700 leading-relaxed mb-3">
                    Jika Anda baru mengenal topik ini atau ingin memahami konsep dasar,
                    mulai dari kategori{' '}
                    <Link href="/kategori/panduan-dasar" className="text-green-700 hover:underline font-medium">
                      Panduan Dasar
                    </Link>
                    . Di sini Anda akan menemukan pengantar topik, konsep penting, dan kesalahan umum yang harus dihindari.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="border-l-4 border-blue-600 pl-5 sm:pl-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    2. Pelajari Lebih Dalam dengan Analisis
                  </h3>
                  <p className="text-base text-gray-700 leading-relaxed mb-3">
                    Setelah memahami dasar, jelajahi kategori{' '}
                    <Link href="/kategori/pendalaman-analisis" className="text-green-700 hover:underline font-medium">
                      Pendalaman & Analisis
                    </Link>
                    . Artikel di sini berisi perbandingan, studi kasus, dan insight praktis yang membangun pemahaman mendalam.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="border-l-4 border-orange-600 pl-5 sm:pl-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    3. Pertimbangkan Solusi & Produk
                  </h3>
                  <p className="text-base text-gray-700 leading-relaxed mb-3">
                    Ketika Anda sudah memahami konteks dan siap mempertimbangkan solusi nyata,
                    kunjungi kategori{' '}
                    <Link href="/kategori/solusi-produk" className="text-green-700 hover:underline font-medium">
                      Solusi & Produk
                    </Link>
                    . Artikel di sini menjelaskan cara memilih solusi yang tepat, implementasi, dan use-case nyata.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="border-l-4 border-purple-600 pl-5 sm:pl-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    4. Kembali untuk Update & Referensi
                  </h3>
                  <p className="text-base text-gray-700 leading-relaxed mb-3">
                    Untuk update terbaru, FAQ, dan catatan teknis, cek kategori{' '}
                    <Link href="/kategori/referensi-update" className="text-green-700 hover:underline font-medium">
                      Referensi & Update
                    </Link>
                    . Kategori ini menjaga relevansi jangka panjang dan menjadi sumber rujukan.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Tips */}
            <section className="bg-white rounded-xl shadow-sm p-6 sm:p-8 md:p-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4">
                Tips untuk Pengalaman Terbaik
              </h2>
              <ul className="space-y-3 text-base text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-700 mr-2 font-bold">•</span>
                  <span>
                    Setiap kategori memiliki <strong>Cornerstone Articles</strong> — artikel lengkap yang menjadi rujukan utama. Mulailah dari artikel tersebut.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-700 mr-2 font-bold">•</span>
                  <span>
                    Artikel turunan selalu terhubung ke cornerstone-nya. Gunakan link internal untuk navigasi yang lebih mudah.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-700 mr-2 font-bold">•</span>
                  <span>
                    Tidak ada hard-selling di website ini. Produk ditampilkan sebagai opsi solusi setelah Anda memahami konteksnya.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-700 mr-2 font-bold">•</span>
                  <span>
                    Jika tidak yakin mulai dari mana, gunakan fitur pencarian atau jelajahi semua artikel di{' '}
                    <Link href="/blog" className="text-green-700 hover:underline font-medium">
                      halaman blog
                    </Link>
                    .
                  </span>
                </li>
              </ul>
            </section>

            {/* CTA Section (Non-manipulatif) */}
            <section className="bg-green-50 rounded-xl p-6 sm:p-8 md:p-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4">
                Siap Memulai?
              </h2>
              <p className="text-base sm:text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
                Pilih kategori yang sesuai dengan kebutuhan Anda, atau jelajahi semua artikel yang tersedia.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/blog"
                  className="px-6 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors"
                >
                  Jelajahi Semua Artikel
                </Link>
                <Link
                  href="/kategori/panduan-dasar"
                  className="px-6 py-3 bg-white text-green-700 border-2 border-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"
                >
                  Mulai dari Panduan Dasar
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
