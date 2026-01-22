/**
 * How It Works Section
 * 
 * 3 langkah saja: Kelola, Produksi, Kendalikan
 * No diagram ribet, hanya teks jelas.
 */

const steps = [
  {
    number: '01',
    title: 'Kelola',
    description: 'Kelola produk, kategori, konten, dan seluruh aset digital dari satu dashboard terpusat.'
  },
  {
    number: '02',
    title: 'Produksi',
    description: 'Sistem membantu proses produksi konten dan manajemen produk dengan efisiensi tinggi.'
  },
  {
    number: '03',
    title: 'Kendalikan',
    description: 'Setiap operasi memerlukan persetujuan Anda. Tidak ada eksekusi otomatis tanpa kontrol.'
  }
];

export default function HowItWorks() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Cara Kerja
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Tiga langkah sederhana untuk mengelola operasi pertanian digital Anda
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-200 mb-4">
                  {step.number}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
