'use client';

/**
 * FASE F — F1: BUY FLOW CORE (CLIENT COMPONENT)
 * F6-B — BUY FLOW UX FINAL (EDGE CASE CLEAN)
 * 
 * BuyButton - Client component dengan popup pilihan channel
 * - Trigger UI only (semua logic di backend)
 * - Popup dengan pilihan: WhatsApp, Shopee, Tokopedia
 * - Human-readable messages when salesEnabled=OFF
 */

import { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Store, X } from 'lucide-react';

interface BuyButtonProps {
  productId: string;
  productName: string;
  productPrice: number;
  shopeeUrl?: string | null;
  tokopediaUrl?: string | null;
}

export default function BuyButton({ productId, productName, productPrice, shopeeUrl, tokopediaUrl }: BuyButtonProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isMarketplacePopupOpen, setIsMarketplacePopupOpen] = useState(false);
  const [marketplacePlatform, setMarketplacePlatform] = useState<'Shopee' | 'Tokopedia' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesEnabled, setSalesEnabled] = useState(true);
  const [loadingSalesStatus, setLoadingSalesStatus] = useState(true);

  // Fetch salesEnabled status (F6-B)
  useEffect(() => {
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
  }, []);

  const handleBuyClick = async () => {
    // Log buy button click (F6-C)
    fetch('/api/public/sales/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'buy_button_clicked',
        productId,
        metadata: { productName },
      }),
    }).catch(() => {}); // Non-blocking

    if (!salesEnabled) {
      // Log blocked attempt (F6-C)
      fetch('/api/public/sales/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'sales_disabled_blocked',
          productId,
          metadata: { productName },
        }),
      }).catch(() => {}); // Non-blocking
      return;
    }
    setIsPopupOpen(true);
    setError(null);
  };

  const handleChannelClick = async (channel: 'WA' | 'Shopee' | 'Tokopedia') => {
    if (!salesEnabled) {
      return;
    }

    // PHASE C1: Guard Marketplace - Check if URL is null or '#'
    if (channel === 'Shopee' && (!shopeeUrl || shopeeUrl === '#')) {
      setMarketplacePlatform('Shopee');
      setIsMarketplacePopupOpen(true);
      return;
    }

    if (channel === 'Tokopedia' && (!tokopediaUrl || tokopediaUrl === '#')) {
      setMarketplacePlatform('Tokopedia');
      setIsMarketplacePopupOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Log channel selection (F6-C)
      fetch('/api/public/sales/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'sales_channel_selected',
          productId,
          metadata: { productName, channel },
        }),
      }).catch(() => {}); // Non-blocking

      // Call backend API to resolve channel & generate link/message
      const response = await fetch(
        `/api/sales/resolve?productId=${encodeURIComponent(productId)}&channel=${channel}`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `Failed to resolve ${channel} channel`);
      }

      const data = await response.json();

      if (data.link) {
        // Open link in new tab/window
        window.open(data.link, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No link received from server');
      }

      // Close popup after successful navigation
      setIsPopupOpen(false);
    } catch (err: any) {
      console.error('[BuyButton] Error:', err);
      setError(err.message || 'Failed to open channel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setIsPopupOpen(false);
      setError(null);
    }
  };

  return (
    <>
      {/* Buy Button */}
      <button
        onClick={handleBuyClick}
        disabled={!salesEnabled || loadingSalesStatus}
        className={`w-full text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
          salesEnabled && !loadingSalesStatus
            ? 'bg-green-700 hover:bg-green-800'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        <ShoppingCart className="h-5 w-5" />
        <span>Beli Sekarang</span>
      </button>

      {/* F6-B: Human-readable message when sales disabled */}
      {!salesEnabled && !loadingSalesStatus && (
        <p className="mt-3 text-sm text-gray-600 text-center">
          Pemesanan sedang tidak tersedia. Silakan kembali lagi nanti.
        </p>
      )}

      {/* Popup Modal */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={loading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pilih Channel Pembelian</h2>
            <p className="text-sm text-gray-600 mb-6">
              Pilih channel yang ingin Anda gunakan untuk membeli produk ini
            </p>

            {/* F6-B: Sales disabled message */}
            {!salesEnabled && !loadingSalesStatus && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 text-center">
                  Pemesanan sedang tidak tersedia. Silakan kembali lagi nanti.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Channel Options */}
            <div className="space-y-3">
              {/* WhatsApp */}
              <button
                onClick={() => handleChannelClick('WA')}
                disabled={loading}
                className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-green-700" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">WhatsApp</div>
                  <div className="text-sm text-gray-600">Hubungi via WhatsApp</div>
                </div>
                {loading && (
                  <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
                )}
              </button>

              {/* Shopee */}
              <button
                onClick={() => handleChannelClick('Shopee')}
                disabled={!salesEnabled || loading || loadingSalesStatus}
                className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Store className="h-6 w-6 text-orange-700" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">Shopee</div>
                  <div className="text-sm text-gray-600">Beli via Shopee</div>
                </div>
                {loading && (
                  <div className="animate-spin h-5 w-5 border-2 border-orange-600 border-t-transparent rounded-full"></div>
                )}
              </button>

              {/* Tokopedia */}
              <button
                onClick={() => handleChannelClick('Tokopedia')}
                disabled={!salesEnabled || loading || loadingSalesStatus}
                className="w-full flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <Store className="h-6 w-6 text-green-700" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">Tokopedia</div>
                  <div className="text-sm text-gray-600">Beli via Tokopedia</div>
                </div>
                {loading && (
                  <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
                )}
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleClose}
              disabled={loading}
              className="mt-4 w-full text-gray-600 hover:text-gray-800 font-medium py-2 disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* PHASE C1: Marketplace Guard Popup */}
      {isMarketplacePopupOpen && marketplacePlatform && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsMarketplacePopupOpen(false);
                setMarketplacePlatform(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Produk Tidak Tersedia di {marketplacePlatform}
            </h2>
            
            {/* Message */}
            <p className="text-gray-700 mb-6">
              Produk ini tidak tersedia di {marketplacePlatform} karena membutuhkan ekspedisi khusus.
              Silakan pesan langsung via WhatsApp.
            </p>

            {/* WhatsApp Button */}
            <button
              onClick={() => {
                setIsMarketplacePopupOpen(false);
                setMarketplacePlatform(null);
                handleChannelClick('WA');
              }}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Pesan via WhatsApp</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                setIsMarketplacePopupOpen(false);
                setMarketplacePlatform(null);
              }}
              className="mt-3 w-full text-gray-600 hover:text-gray-800 font-medium py-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
