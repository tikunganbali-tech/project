/**
 * Safety & Control Section
 * 
 * Ini pembeda utama dari website lain.
 * Tampilkan: Manual control, No auto execute, Deterministic system, Owner in charge
 * Visualisasi dengan tenang & meyakinkan.
 */

const safetyFeatures = [
  {
    title: 'Manual Control',
    description: 'Setiap operasi penting memerlukan persetujuan manual dari owner. Tidak ada eksekusi otomatis yang berisiko.'
  },
  {
    title: 'No Auto Execute',
    description: 'Sistem tidak akan menjalankan operasi kritis secara otomatis. Anda selalu memiliki kontrol penuh.'
  },
  {
    title: 'Deterministic System',
    description: 'Setiap operasi dapat diprediksi dan diaudit. Tidak ada perilaku acak atau tidak terkontrol.'
  },
  {
    title: 'Owner in Charge',
    description: 'Anda adalah pengambil keputusan utama. Sistem hanya membantu, tidak menggantikan keputusan Anda.'
  }
];

export default function Safety() {
  // Hanya 3 poin inti - ringkas & tenang
  const corePoints = safetyFeatures.slice(0, 3);

  return (
    <section className="bg-gray-50 py-10 sm:py-12 md:py-14 border-y border-gray-200">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        {/* Section Header - Visual Rhythm */}
        <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-2.5xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
            Keamanan & Kontrol
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Platform yang memberikan kontrol penuh kepada Anda
          </p>
        </div>

        {/* 3 Poin Inti - Consistent grid */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 md:gap-7">
            {corePoints.map((feature, index) => (
              <div 
                key={index}
                className="p-5 sm:p-6 bg-white border border-gray-200 rounded-lg"
              >
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
