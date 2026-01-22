'use client';

import { Target, Users, Award, Heart } from 'lucide-react';
import WhatsAppCTAButton from '@/components/public/WhatsAppCTAButton';

interface AboutPageClientProps {
  siteSettings: any;
}

/**
 * PHASE 3.3.1 — STEP 4B-3: About Page Client (Dynamic)
 * 
 * Prinsip:
 * - Admin = single source of truth
 * - Render aboutContent (HTML) dari SiteSettings
 * - Tidak styling berlebihan
 * - Tidak sanitize berlebihan (admin trusted)
 */
export default function AboutPageClient({ siteSettings }: AboutPageClientProps) {
  const aboutTitle = siteSettings?.aboutTitle || 'Tentang Kami';
  const aboutSubtitle = siteSettings?.aboutSubtitle || 'Mitra terpercaya petani Indonesia sejak 2020';
  // PHASE 3.3.1: Use aboutContent (HTML) from SiteSettings as primary source
  const aboutContent = siteSettings?.aboutContent || '';
  const aboutStory = siteSettings?.aboutStory || '';
  const aboutValues = siteSettings?.aboutValues ? JSON.parse(siteSettings.aboutValues) : [];
  const aboutStats = siteSettings?.aboutStats ? JSON.parse(siteSettings.aboutStats) : [];
  const aboutMission = siteSettings?.aboutMission || '';

  const defaultStory = `
    <p>TOKOTANIONLINE lahir dari kepedulian kami terhadap petani Indonesia yang sering kesulitan mendapatkan sarana produksi pertanian (saprotan) berkualitas dengan harga terjangkau. Sejak 2020, kami berkomitmen untuk menjadi jembatan antara petani dengan produk-produk pertanian terbaik.</p>
    <p>Kami memahami bahwa kesuksesan panen dimulai dari pemilihan input yang tepat. Oleh karena itu, kami hanya menyediakan produk-produk berkualitas tinggi dari brand terpercaya, mulai dari benih unggul, fungisida efektif, pupuk bernutrisi, hingga alat pertanian modern.</p>
    <p>Dengan pengalaman lebih dari 4 tahun melayani ribuan petani di seluruh Indonesia, kami terus berinovasi untuk memberikan pelayanan terbaik. Tidak hanya menjual produk, kami juga menyediakan konsultasi gratis dan edukasi pertanian melalui artikel-artikel berkualitas di blog kami.</p>
  `;

  const defaultValues = [
    { title: 'Kualitas Terjamin', description: 'Semua produk dijamin original dan berkualitas tinggi dari distributor resmi', icon: 'Target' },
    { title: 'Fokus Pelanggan', description: 'Kepuasan dan kesuksesan petani adalah prioritas utama kami', icon: 'Users' },
    { title: 'Profesional', description: 'Tim ahli yang berpengalaman siap memberikan konsultasi terbaik', icon: 'Award' },
    { title: 'Kepercayaan', description: 'Membangun hubungan jangka panjang berdasarkan kepercayaan', icon: 'Heart' },
  ];

  const defaultStats = [
    { value: '4+', label: 'Tahun Berpengalaman' },
    { value: '5000+', label: 'Petani Terlayani' },
    { value: '100+', label: 'Produk Berkualitas' },
    { value: '98%', label: 'Kepuasan Pelanggan' },
  ];

  const values = aboutValues.length > 0 ? aboutValues : defaultValues;
  const stats = aboutStats.length > 0 ? aboutStats : defaultStats;

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      Target,
      Users,
      Award,
      Heart,
    };
    return icons[iconName] || Target;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{aboutTitle}</h1>
          <p className="text-sm sm:text-base md:text-lg text-green-100">
            {aboutSubtitle}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Image */}
        <div className="mb-8 sm:mb-12">
          <div className="w-full h-64 sm:h-80 md:h-96 bg-gray-200 rounded-lg shadow-lg flex items-center justify-center">
            <span className="text-gray-400 text-sm sm:text-lg">Gambar Tim TOKOTANIONLINE</span>
          </div>
        </div>

        {/* PHASE 3.3.1: Main Content from aboutContent (HTML) */}
        {aboutContent && (
          <div className="max-w-4xl mx-auto mb-12 sm:mb-16">
            <div 
              className="prose prose-sm sm:prose-lg max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ 
                __html: aboutContent 
              }}
            />
          </div>
        )}

        {/* Story (fallback if aboutContent is empty) */}
        {!aboutContent && (
          <div className="max-w-4xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Cerita Kami</h2>
            <div 
              className="prose prose-sm sm:prose-lg max-w-none text-gray-700 space-y-4"
              dangerouslySetInnerHTML={{ 
                __html: aboutStory || defaultStory 
              }}
            />
          </div>
        )}

        {/* Values */}
        {values.length > 0 && (
          <div className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Nilai-Nilai Kami</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {values.map((value: any, index: number) => {
                const IconComponent = getIcon(value.icon);
                return (
                  <div key={index} className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 text-green-700" />
                    </div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2">{value.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        {stats.length > 0 && (
          <div className="bg-green-700 text-white rounded-lg shadow-lg p-6 sm:p-8 mb-12 sm:mb-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
              {stats.map((stat: any, index: number) => (
                <div key={index}>
                  <div className="text-3xl sm:text-4xl font-bold mb-2">{stat.value}</div>
                  <div className="text-sm sm:text-base text-green-100">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mission */}
        {aboutMission && (
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Misi Kami</h2>
            <p className="text-lg sm:text-xl text-gray-700 mb-6 sm:mb-8">
              "{aboutMission}"
            </p>
          </div>
        )}

        {/* PHASE F — F2: CTA Section */}
        <div className="max-w-4xl mx-auto mt-12 sm:mt-16">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 sm:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Hubungi Kami Sekarang
            </h2>
            <p className="text-gray-700 mb-6">
              Tertarik dengan produk kami? Mari diskusikan kebutuhan pertanian Anda bersama tim ahli kami.
            </p>
            <WhatsAppCTAButton
              label="Hubungi Kami Sekarang"
              variant="primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

















