'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingBag, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/lib/event-tracker';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    discountPrice?: number | null;
    stock: number;
    unit: string;
    shopeeUrl?: string | null;
    tokopediaUrl?: string | null;
    shortDescription?: string | null;
    packagingVariants?: string | null;
    category?: { name: string } | null;
  };
  onTrack?: (platform: 'whatsapp' | 'shopee' | 'tokopedia') => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  product,
  onTrack,
}: CheckoutModalProps) {
  const [salesEnabled, setSalesEnabled] = useState(true);
  const [loadingSalesStatus, setLoadingSalesStatus] = useState(true);

  // Fetch salesEnabled status (F5-B)
  useEffect(() => {
    if (isOpen) {
      fetch('/api/public/sales-status')
        .then(res => res.json())
        .then(data => {
          setSalesEnabled(data.salesEnabled ?? true);
          setLoadingSalesStatus(false);
        })
        .catch(() => {
          setSalesEnabled(true); // Fail-safe: default to enabled
          setLoadingSalesStatus(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const generateWhatsAppMessage = () => {
    const finalPrice = product.discountPrice || product.price;
    const discount = product.discountPrice
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : 0;

    // Parse packaging variants if available
    let packagingInfo = '';
    if (product.packagingVariants) {
      try {
        const variants = typeof product.packagingVariants === 'string'
          ? JSON.parse(product.packagingVariants)
          : product.packagingVariants;
        if (Array.isArray(variants) && variants.length > 0) {
          packagingInfo = `\nUkuran/Kemasan: ${variants.join(', ')}`;
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    // Add unit info if available
    const unitInfo = product.unit && product.unit !== 'pcs' ? `\nUnit: ${product.unit}` : '';
    const stockInfo = `\nStok: ${product.stock} ${product.unit}`;
    const categoryInfo = product.category ? `\nKategori: ${product.category.name}` : '';

    let message = `Halo, saya ingin memesan produk:\n\n`;
    message += `*${product.name}*\n`;
    message += `Harga: Rp ${finalPrice.toLocaleString('id-ID')}`;
    if (discount > 0) {
      message += ` (Diskon ${discount}%)`;
    }
    message += packagingInfo;
    message += unitInfo;
    message += stockInfo;
    message += categoryInfo;
    message += `\n\nApakah produk ini tersedia? Saya tertarik untuk memesan.`;

    return message;
  };

  const handleWhatsApp = async () => {
    // STEP 14B: Track click_cta event
    trackEvent({
      event: 'click_cta',
      meta: {
        productId: product.id,
        cta_type: 'whatsapp',
        location: 'checkout_modal',
      },
    });

    const message = generateWhatsAppMessage();
    
    try {
      // Try to use WhatsApp rotation API
      const res = await fetch(
        `/api/whatsapp/rotate?productId=${product.id}&productName=${encodeURIComponent(product.name)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      const phone = data.phone || '6281234567890';
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
      // Fallback to hardcoded numbers
      const whatsappNumbers = [
        '6281234567890',
        '6281234567891',
        '6281234567892'
      ];
      const randomNumber = whatsappNumbers[Math.floor(Math.random() * whatsappNumbers.length)];
      window.open(`https://wa.me/${randomNumber}?text=${encodeURIComponent(message)}`, '_blank');
    }
    
    onTrack?.('whatsapp');
    onClose();
  };

  const handleShopee = () => {
    if (product.shopeeUrl) {
      // STEP 14B: Track click_cta event
      trackEvent({
        event: 'click_cta',
        meta: {
          productId: product.id,
          cta_type: 'checkout',
          location: 'checkout_modal',
        },
      });
      window.open(product.shopeeUrl, '_blank');
      onTrack?.('shopee');
      onClose();
    }
  };

  const handleTokopedia = () => {
    if (product.tokopediaUrl) {
      // STEP 14B: Track click_cta event
      trackEvent({
        event: 'click_cta',
        meta: {
          productId: product.id,
          cta_type: 'checkout',
          location: 'checkout_modal',
        },
      });
      window.open(product.tokopediaUrl, '_blank');
      onTrack?.('tokopedia');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Pilih Cara Pembelian Anda</h3>
          <p className="text-sm text-gray-600">
            Belanja dengan cara yang paling Anda percaya
          </p>
        </div>

        {/* Options - HealthStore Style */}
        <div className="space-y-4 mb-6">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-full bg-green-50 hover:bg-green-100 border-2 border-green-500 text-gray-900 font-semibold px-6 py-4 rounded-lg flex items-center gap-4 transition-all hover:shadow-md"
          >
            <div className="flex-shrink-0">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-lg">WhatsApp</div>
              <div className="text-sm text-gray-600">Chat langsung dengan admin</div>
            </div>
          </button>

          {/* Shopee */}
          {product.shopeeUrl && (
            <button
              onClick={handleShopee}
              disabled={!salesEnabled || loadingSalesStatus}
              className={`w-full border-2 font-semibold px-6 py-4 rounded-lg flex items-center gap-4 transition-all ${
                salesEnabled && !loadingSalesStatus
                  ? 'bg-orange-50 hover:bg-orange-100 border-orange-500 text-gray-900 hover:shadow-md'
                  : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
              title={!salesEnabled ? 'Penjualan sedang dinonaktifkan' : undefined}
            >
              <div className="flex-shrink-0">
                <ShoppingBag className={`h-8 w-8 ${salesEnabled && !loadingSalesStatus ? 'text-orange-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-lg">Shopee</div>
                <div className="text-sm text-gray-600">Official Store</div>
              </div>
            </button>
          )}

          {/* Tokopedia */}
          {product.tokopediaUrl && (
            <button
              onClick={handleTokopedia}
              disabled={!salesEnabled || loadingSalesStatus}
              className={`w-full border-2 font-semibold px-6 py-4 rounded-lg flex items-center gap-4 transition-all ${
                salesEnabled && !loadingSalesStatus
                  ? 'bg-green-50 hover:bg-green-100 border-green-500 text-gray-900 hover:shadow-md'
                  : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
              title={!salesEnabled ? 'Penjualan sedang dinonaktifkan' : undefined}
            >
              <div className="flex-shrink-0">
                <ShoppingBag className={`h-8 w-8 ${salesEnabled && !loadingSalesStatus ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-lg">Tokopedia</div>
                <div className="text-sm text-gray-600">Official Store</div>
              </div>
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 text-center mb-4">
          Kami tidak memaksa satu platform. Pilih yang paling Anda percaya.
        </p>

        {/* View Product Details Button */}
        <button
          onClick={onClose}
          className="w-full bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Lihat Detail Produk
        </button>

        {/* F6-B: Sales Disabled Message - Human-readable */}
        {!salesEnabled && !loadingSalesStatus && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              Pemesanan sedang tidak tersedia. Silakan kembali lagi nanti.
            </p>
          </div>
        )}

        {/* Fallback jika tidak ada marketplace */}
        {!product.shopeeUrl && !product.tokopediaUrl && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Link marketplace belum tersedia. Silakan gunakan WhatsApp untuk pemesanan.
          </p>
        )}
      </div>
    </div>
  );
}

