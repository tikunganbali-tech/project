'use client';

export default function CTA() {
  const handleWhatsAppContact = () => {
    const message = 'Halo, saya ingin berkonsultasi tentang produk pertanian';
    const whatsappNumbers = [
      '6281234567890',
      '6281234567891',
      '6281234567892'
    ];
    const randomNumber = whatsappNumbers[Math.floor(Math.random() * whatsappNumbers.length)];
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <section className="py-10 sm:py-12 md:py-14 lg:py-16 bg-green-700 text-white">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-2.5xl md:text-3xl lg:text-3.5xl font-bold mb-3 sm:mb-4">Butuh Konsultasi?</h2>
        <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 md:mb-10 text-green-100 max-w-2xl mx-auto">
          Tim ahli kami siap membantu Anda memilih produk yang tepat untuk pertanian Anda
        </p>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleWhatsAppContact();
          }}
          className="inline-block bg-white text-green-700 px-6 py-3 sm:px-7 sm:py-3.5 md:px-8 md:py-4 rounded-lg font-semibold hover:bg-green-50 transition-colors text-sm sm:text-base"
        >
          Chat WhatsApp Sekarang
        </a>
      </div>
    </section>
  );
}
