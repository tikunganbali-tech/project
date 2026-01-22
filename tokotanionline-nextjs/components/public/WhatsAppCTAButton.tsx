'use client';

/**
 * PHASE F — F2: WhatsApp CTA Button (Reusable)
 * 
 * Prinsip:
 * - Nomor dari backend (tidak hardcode)
 * - Pesan template ramah
 * - Light tracking (console/log)
 */

import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppCTAButtonProps {
  productId?: string;
  productName?: string;
  articleId?: string;
  articleTitle?: string;
  label?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export default function WhatsAppCTAButton({
  productId,
  productName,
  articleId,
  articleTitle,
  label = 'Pesan via WhatsApp',
  variant = 'primary',
  className = '',
}: WhatsAppCTAButtonProps) {
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (productId) params.set('productId', productId);
    if (articleId) params.set('articleId', articleId);

    fetch(`/api/whatsapp/rotate?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setWhatsappNumber(data.phone || '6281234567890');
        setLoading(false);
      })
      .catch(() => {
        setWhatsappNumber('6281234567890');
        setLoading(false);
      });
  }, [productId, articleId]);

  const handleClick = () => {
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

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    // PHASE F — F4: Light Event Tracking
    const eventData = {
      event: 'click_whatsapp_cta',
      productId: productId || null,
      articleId: articleId || null,
      phone: whatsappNumber,
      label,
      variant,
      timestamp: new Date().toISOString(),
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[PHASE-F] Event:', eventData);
    }
    
    // Optional: Send to internal tracking endpoint (non-blocking)
    fetch('/api/public/sales/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'whatsapp_cta_clicked',
        productId: productId || null,
        blogId: articleId || null,
        metadata: {
          label,
          variant,
          phone: whatsappNumber,
        },
      }),
    }).catch(() => {}); // Non-blocking
  };

  const baseClasses = variant === 'primary'
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300';

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${baseClasses} ${className}`}
    >
      <MessageCircle className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}
