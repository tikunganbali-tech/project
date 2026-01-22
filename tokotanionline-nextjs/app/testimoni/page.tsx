import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Metadata } from 'next';
// DISABLED: db-helpers module not available
// import { getSiteSettings } from '@/lib/db-helpers';

export const metadata: Metadata = {
  title: 'Testimoni - TOKO TANI ONLINE',
  description: 'Testimoni dari pelanggan TOKO TANI ONLINE tentang produk dan layanan kami.',
};

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  // const siteSettings = await getSiteSettings();
  const siteSettings = null;

  const testimonials = [
    {
      name: 'Budi Santoso',
      location: 'Petani dari Jawa Barat',
      rating: 5,
      text: 'Produk berkualitas tinggi dan layanan yang sangat membantu. Hasil panen saya meningkat signifikan setelah menggunakan produk dari TOKO TANI ONLINE.',
    },
    {
      name: 'Siti Nurhaliza',
      location: 'Petani dari Jawa Tengah',
      rating: 5,
      text: 'Benih yang saya beli sangat berkualitas, pertumbuhan tanaman lebih cepat dan hasil panen lebih banyak. Terima kasih TOKOTANIONLINE!',
    },
    {
      name: 'Ahmad Hidayat',
      location: 'Petani dari Jawa Timur',
      rating: 5,
      text: 'Fungisida yang direkomendasikan sangat efektif mengatasi masalah penyakit tanaman saya. Pelayanan cepat dan ramah.',
    },
    {
      name: 'Maya Sari',
      location: 'Petani dari Sumatera Utara',
      rating: 5,
      text: 'Pengiriman cepat dan produk sampai dalam kondisi baik. Konsultasi gratis juga sangat membantu untuk pemilihan produk yang tepat.',
    },
    {
      name: 'Rudi Hartono',
      location: 'Petani dari Kalimantan',
      rating: 5,
      text: 'Harga kompetitif dengan kualitas premium. Saya sudah menjadi pelanggan setia sejak 2021 dan selalu puas dengan produknya.',
    },
    {
      name: 'Dewi Lestari',
      location: 'Petani dari Sulawesi',
      rating: 5,
      text: 'Tim support sangat responsif dan membantu. Produk pupuk yang saya gunakan membuat tanaman lebih subur dan produktif.',
    },
  ];

  return (
    <>
      <Navbar siteSettings={siteSettings || undefined} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-green-700 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Testimoni Pelanggan</h1>
            <p className="text-green-100 text-lg">
              Apa kata pelanggan kami tentang produk dan layanan TOKOTANIONLINE
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <span key={j} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">
                  "{testimonial.text}"
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer siteSettings={siteSettings || undefined} />
    </>
  );
}
