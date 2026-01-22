/**
 * Use Cases / Audience Section
 * 
 * Minimal: Produsen, Distributor, Konten kreator, Tim internal
 */

interface UseCase {
  title: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    title: 'Produsen',
    description: 'Kelola produk pertanian Anda dengan sistem terpusat. Kontrol inventori, harga, dan distribusi dari satu platform.'
  },
  {
    title: 'Distributor',
    description: 'Sistem distribusi yang efisien dengan kontrol penuh atas alur produk dan manajemen pesanan yang terintegrasi.'
  },
  {
    title: 'Konten Kreator',
    description: 'Platform untuk membuat, mengelola, dan mendistribusikan konten pertanian dengan tools yang powerful dan terkontrol.'
  },
  {
    title: 'Tim Internal',
    description: 'Kolaborasi tim dengan sistem yang aman, teraudit, dan memberikan kontrol penuh kepada manajemen.'
  }
];

export default function UseCases() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Untuk Siapa Platform Ini?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Platform yang dirancang untuk berbagai kebutuhan operasi pertanian digital
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {useCases.map((useCase, index) => (
              <div 
                key={index}
                className="p-6 sm:p-8 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                  {useCase.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
