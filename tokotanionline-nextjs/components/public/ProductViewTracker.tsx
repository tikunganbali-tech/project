'use client';

/**
 * PHASE F — F4: Product View Tracking (Light)
 * 
 * Track product view events (console/log internal)
 */

import { useEffect } from 'react';

interface ProductViewTrackerProps {
  productId: string;
  productName: string;
  slug: string;
}

export default function ProductViewTracker({
  productId,
  productName,
  slug,
}: ProductViewTrackerProps) {
  useEffect(() => {
    // PHASE F — F4: Light Event Tracking
    const eventData = {
      event: 'view_product',
      productId,
      productName,
      slug,
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
        event: 'product_viewed',
        productId,
        metadata: {
          productName,
          slug,
        },
      }),
    }).catch(() => {}); // Non-blocking
  }, [productId, productName, slug]);

  return null; // This component doesn't render anything
}
