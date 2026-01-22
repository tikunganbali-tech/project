'use client';

import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import WhatsAppCTAButton from '@/components/public/WhatsAppCTAButton';

interface ContactPageClientProps {
  siteSettings: any;
}

/**
 * PHASE 3.3.1 — STEP 4B-4: Contact Page Client (Dynamic)
 * 
 * Prinsip:
 * - Admin = single source of truth
 * - Render contactContent (HTML) dari SiteSettings
 * - Sinkron penuh dengan admin
 */
export default function ContactPageClient({ siteSettings }: ContactPageClientProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const contactTitle = siteSettings?.contactTitle || 'Hubungi Kami';
  const contactSubtitle = siteSettings?.contactSubtitle || 'Kami siap membantu kebutuhan pertanian Anda';
  // PHASE 3.3.1: Use contactContent (HTML) from SiteSettings as primary source
  const contactContent = siteSettings?.contactContent || '';
  const contactAddress = siteSettings?.contactAddress || 'Jl. Pertanian No. 123, Jakarta';
  const contactPhone = siteSettings?.contactPhone || '+62 812-3456-7890';
  const contactEmail = siteSettings?.contactEmail || 'info@tokotanionline.com';
  const contactHours = siteSettings?.contactHours || 'Senin - Jumat: 08.00 - 17.00 WIB\nSabtu: 08.00 - 14.00 WIB\nMinggu: Tutup';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Halo, saya ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nSubjek: ${formData.subject}\n\nPesan:\n${formData.message}`;
    const whatsappNumbers = [
      '6281234567890',
      '6281234567891',
      '6281234567892'
    ];
    const randomNumber = whatsappNumbers[Math.floor(Math.random() * whatsappNumbers.length)];
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleWhatsAppContact = () => {
    const message = 'Halo, saya ingin bertanya tentang produk TOKOTANIONLINE';
    const whatsappNumbers = [
      '6281234567890',
      '6281234567891',
      '6281234567892'
    ];
    const randomNumber = whatsappNumbers[Math.floor(Math.random() * whatsappNumbers.length)];
    window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{contactTitle}</h1>
          <p className="text-sm sm:text-base md:text-lg text-green-100">
            {contactSubtitle}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* PHASE 3.3.1: Main Content from contactContent (HTML) */}
        {contactContent && (
          <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
            <div 
              className="prose prose-sm sm:prose-lg max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ 
                __html: contactContent 
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Contact Form */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Kirim Pesan</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan nama Anda"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Subjek
                  </label>
                  <input
                    type="text"
                    placeholder="Subjek pesan"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Pesan
                  </label>
                  <textarea
                    placeholder="Tulis pesan Anda di sini..."
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Kirim Pesan via WhatsApp
                </button>
              </form>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 sm:space-y-6">
            {/* Warehouse Image */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="w-full h-48 sm:h-64 bg-gray-200 flex items-center justify-center">
                <span className="text-xs sm:text-sm text-gray-400">Gambar Gudang TOKOTANIONLINE</span>
              </div>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold mb-2">Gudang & Kantor Kami</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Kunjungi kami untuk konsultasi langsung dan lihat produk secara langsung
                </p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-1">Alamat</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {contactAddress.split('\n').map((line: string, i: number) => (
                      <span key={i}>{line}<br /></span>
                    ))}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-1">Telepon / WhatsApp</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {contactPhone.split('\n').map((line: string, i: number) => (
                      <span key={i}>{line}<br /></span>
                    ))}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-1">Email</h3>
                  <p className="text-xs sm:text-sm text-gray-600 break-all">
                    {contactEmail.split('\n').map((line: string, i: number) => (
                      <span key={i}>{line}<br /></span>
                    ))}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-1">Jam Operasional</h3>
                  <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-line">
                    {contactHours}
                  </p>
                </div>
              </div>
            </div>

            {/* PHASE F — F2: Quick Contact CTA */}
            <div className="bg-green-700 text-white rounded-lg shadow-md p-4 sm:p-6 text-center">
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">
                Butuh Bantuan Segera?
              </h3>
              <p className="mb-3 sm:mb-4 text-sm sm:text-base text-green-100">
                Hubungi kami langsung via WhatsApp untuk respon cepat
              </p>
              <WhatsAppCTAButton
                label="Hubungi Kami Sekarang"
                variant="secondary"
                className="bg-white text-green-700 hover:bg-gray-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



