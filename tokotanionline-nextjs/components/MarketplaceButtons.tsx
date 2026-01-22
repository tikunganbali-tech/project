'use client';

import { useState, useEffect } from 'react';

interface MarketplaceButtonsProps {
  shopeeUrl?: string | null;
  tokopediaUrl?: string | null;
  productId: string;
  productName: string;
}

export default function MarketplaceButtons({
  shopeeUrl,
  tokopediaUrl,
  productId,
  productName,
}: MarketplaceButtonsProps) {
  const [salesEnabled, setSalesEnabled] = useState(true);
  const [loadingSalesStatus, setLoadingSalesStatus] = useState(true);

  // Fetch salesEnabled status (F5-B)
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
  const handleClick = async (platform: 'shopee' | 'tokopedia', url: string) => {
    // Track CTA click to analytics
    await fetch('/api/analytics/cta-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageType: 'product',
        pageId: productId,
        ctaType: platform,
        ctaLabel: `Beli di ${platform === 'shopee' ? 'Shopee' : 'Tokopedia'}`,
        ctaPosition: 'inline',
        metadata: { productName, platform },
      }),
    }).catch(() => {}); // Non-blocking

    // Also track to legacy endpoint
    fetch('/api/marketplace/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        productId,
        productName,
      }),
    }).catch(() => {});

    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-3">
      {shopeeUrl && (
        <button
          onClick={() => handleClick('shopee', shopeeUrl)}
          disabled={!salesEnabled || loadingSalesStatus}
          className={`text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            salesEnabled && !loadingSalesStatus
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          title={!salesEnabled ? 'Penjualan sedang dinonaktifkan' : undefined}
        >
          <span>Beli di Shopee</span>
        </button>
      )}
      {tokopediaUrl && (
        <button
          onClick={() => handleClick('tokopedia', tokopediaUrl)}
          disabled={!salesEnabled || loadingSalesStatus}
          className={`text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            salesEnabled && !loadingSalesStatus
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          title={!salesEnabled ? 'Penjualan sedang dinonaktifkan' : undefined}
        >
          <span>Beli di Tokopedia</span>
        </button>
      )}
      {!shopeeUrl && !tokopediaUrl && (
        <p className="text-gray-600 text-sm">Link marketplace akan segera tersedia</p>
      )}
      {!salesEnabled && !loadingSalesStatus && (shopeeUrl || tokopediaUrl) && (
        <p className="text-sm text-gray-600 text-center mt-2">
          Pemesanan sedang tidak tersedia. Silakan kembali lagi nanti.
        </p>
      )}
    </div>
  );
}
