'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface StickyCTAProps {
  productId?: string;
  blogId?: string;
}

export default function StickyCTA({ productId, blogId }: StickyCTAProps) {
  const handleClick = () => {
    // Track CTA click
    if ((window as any).trackCTAClick) {
      (window as any).trackCTAClick();
    }

    // Get WhatsApp number
    const whatsappNumber = '6281234567890'; // Replace with actual number
    const message = productId
      ? 'Halo, saya tertarik dengan produk ini. Bisa info lebih lanjut?'
      : 'Halo, saya ingin konsultasi tentang pertanian. Bisa bantu?';
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleClick}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all"
        aria-label="Konsultasi WhatsApp"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium">Konsultasi Gratis</span>
      </button>
    </div>
  );
}












