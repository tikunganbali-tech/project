/**
 * Core Capabilities Section
 * 
 * Bukan fitur, tapi kemampuan sistem.
 * 3-5 item dengan judul tegas dan 1 kalimat penjelasan.
 */

interface Capability {
  title: string;
  description: string;
}

const capabilities: Capability[] = [
  {
    title: 'Content Intelligence',
    description: 'Sistem cerdas untuk mengelola, mengoptimalkan, dan mendistribusikan konten pertanian dengan presisi tinggi.'
  },
  {
    title: 'Product Management',
    description: 'Manajemen produk terpusat dengan kontrol inventori, harga, dan distribusi yang terintegrasi penuh.'
  },
  {
    title: 'Engine-Controlled Automation',
    description: 'Otomasi yang dapat dikendalikan sepenuhnya oleh owner, tanpa eksekusi otomatis yang tidak terkontrol.'
  },
  {
    title: 'Marketing & SEO Readiness',
    description: 'Platform siap untuk strategi marketing dan SEO dengan infrastruktur yang mendukung skalabilitas.'
  },
  {
    title: 'Audit & Safety',
    description: 'Setiap operasi tercatat, dapat diaudit, dan memerlukan persetujuan manual untuk keamanan maksimal.'
  }
];

export default function Capabilities() {
  return (
    <section className="bg-white py-16 sm:py-20 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Kemampuan Sistem
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Platform yang dirancang untuk menangani kompleksitas operasi pertanian digital
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {capabilities.map((capability, index) => (
              <div 
                key={index}
                className="p-6 sm:p-8 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                  {capability.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
