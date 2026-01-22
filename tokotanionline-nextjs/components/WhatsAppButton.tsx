'use client';

import { useState, useEffect, Suspense } from 'react';
import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/event-tracker';

interface WhatsAppButtonProps {
  productId?: string;
  productName?: string;
  articleId?: string;
  articleTitle?: string;
}

function WhatsAppButtonContent({
  productId,
  productName,
  articleId,
  articleTitle,
}: WhatsAppButtonProps) {
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  // Next.js types can mark pathname as nullable
  const pathname = usePathname() ?? '';

  useEffect(() => {
    // Build context-aware message
    let message = 'Halo, saya tertarik dengan ';
    
    if (productName) {
      message += `produk ${productName}`;
    } else if (articleTitle) {
      message += `artikel tentang ${articleTitle}`;
    } else {
      message += 'produk Anda';
    }
    
    message += '. Bisa minta informasi lebih lanjut?';

    // Fetch rotating WhatsApp number with context
    const params = new URLSearchParams();
    if (productId) params.set('productId', productId);
    if (articleId) params.set('articleId', articleId);
    
    fetch(`/api/whatsapp/rotate?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.phone) {
          setWhatsappNumber(data.phone);
        }
      })
      .catch(() => {
        // Fallback
        setWhatsappNumber('6281234567890');
      });
  }, [productId, productName, articleId, articleTitle]);

  const handleClick = async () => {
    // STEP 14B: Track click_cta event (only for products)
    if (productId) {
      trackEvent({
        event: 'click_cta',
        meta: {
          productId: productId,
          cta_type: 'whatsapp',
          location: 'sticky',
        },
      });
    }

    let message = 'Halo, saya tertarik dengan ';
    
    if (productName) {
      message += `produk ${productName}`;
    } else if (articleTitle) {
      message += `artikel tentang ${articleTitle}`;
    } else {
      message += 'produk Anda';
    }
    
    message += '. Bisa minta informasi lebih lanjut?';

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    // Track CTA click to analytics (legacy)
    await fetch('/api/analytics/cta-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageType: productId ? 'product' : articleId ? 'blog' : 'home',
        pageId: productId || articleId || null,
        ctaType: 'whatsapp',
        ctaLabel: 'Konsultasi via WhatsApp',
        ctaPosition: 'sticky',
        metadata: {
          phone: whatsappNumber,
          context: productName || articleTitle || 'general',
          path: pathname,
        },
      }),
    }).catch(() => {}); // Non-blocking

    // Also track to legacy endpoint
    fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'WhatsAppClick',
        productId: productId || null,
        blogId: articleId || null,
        metadata: {
          phone: whatsappNumber,
          context: productName || articleTitle || 'general',
          path: pathname,
        },
      }),
    }).catch(() => {});
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg z-50 transition-all hover:scale-110"
      aria-label="WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}

export default function WhatsAppButton(props: WhatsAppButtonProps) {
  return (
    <Suspense fallback={
      <button
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg z-50 transition-all opacity-50"
        disabled
        aria-label="Loading WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    }>
      <WhatsAppButtonContent {...props} />
    </Suspense>
  );
}
