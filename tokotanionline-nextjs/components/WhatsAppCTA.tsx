'use client';

import { trackEvent } from '@/lib/event-tracker';

interface WhatsAppCTAProps {
  productName: string;
  productPrice: number;
  currentUrl: string;
  productId?: string;
}

export default function WhatsAppCTA({
  productName,
  productPrice,
  currentUrl,
  productId,
}: WhatsAppCTAProps) {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6281234567890';

  const handleClick = () => {
    // STEP 14B: Track click_cta event
    if (productId) {
      trackEvent({
        event: 'click_cta',
        meta: {
          productId: productId,
          cta_type: 'whatsapp',
          location: 'product_detail',
        },
      });
    }

    // Use actual current URL from window if available, otherwise use prop
    const url = typeof window !== 'undefined' ? window.location.href : currentUrl;

    // Format WhatsApp message
    const message = `Halo, saya tertarik dengan produk:
Nama: ${productName}
Harga: Rp ${productPrice.toLocaleString('id-ID')}
Link: ${url}`;

    // Build WhatsApp URL
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    // Open in new tab
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
    >
      Hubungi via WhatsApp
    </button>
  );
}

