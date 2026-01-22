'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/event-tracker';

interface ProductViewTrackerProps {
  productId: string;
  slug: string;
  category?: string;
}

export default function ProductViewTracker({
  productId,
  slug,
  category,
}: ProductViewTrackerProps) {
  useEffect(() => {
    // STEP 14B: Track view_product event
    trackEvent({
      event: 'view_product',
      meta: {
        productId,
        slug,
        category: category || '',
      },
    });
  }, [productId, slug, category]);

  return null; // This component doesn't render anything
}
