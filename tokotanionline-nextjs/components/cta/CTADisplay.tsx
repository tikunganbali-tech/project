/**
 * FASE 5 — CTA Display Component
 * 
 * Lightweight, server-rendered preferred.
 * Renders CTA based on server-side match.
 */

'use client';

import { useEffect, useState } from 'react';
import { trackCtaClick } from '@/lib/cta-tracker';

interface CTA {
  id: string;
  type: 'whatsapp' | 'checkout' | 'link';
  label: string;
  targetUrl: string;
  placement: 'inline' | 'sidebar' | 'footer';
}

interface CTADisplayProps {
  cta: CTA | null;
  pagePath: string;
  pageType?: string;
  placement?: 'inline' | 'sidebar' | 'footer';
}

export default function CTADisplay({
  cta,
  pagePath,
  pageType,
  placement = 'inline',
}: CTADisplayProps) {
  // Only render if CTA matches placement
  if (!cta || cta.placement !== placement) {
    return null;
  }

  const handleClick = () => {
    // Track click
    trackCtaClick(cta.id, pagePath, pageType);

    // Handle different CTA types
    if (cta.type === 'whatsapp') {
      // WhatsApp: open in new tab
      window.open(cta.targetUrl, '_blank');
    } else if (cta.type === 'checkout') {
      // Checkout: navigate to checkout
      window.location.href = cta.targetUrl;
    } else {
      // Link: open in new tab
      window.open(cta.targetUrl, '_blank');
    }
  };

  // Styling based on type
  const getButtonClass = () => {
    const base = 'inline-block px-6 py-3 rounded-lg font-semibold transition-colors';
    if (cta.type === 'whatsapp') {
      return `${base} bg-green-600 text-white hover:bg-green-700`;
    } else if (cta.type === 'checkout') {
      return `${base} bg-blue-600 text-white hover:bg-blue-700`;
    } else {
      return `${base} bg-gray-800 text-white hover:bg-gray-900`;
    }
  };

  return (
    <button onClick={handleClick} className={getButtonClass()}>
      {cta.label}
    </button>
  );
}
