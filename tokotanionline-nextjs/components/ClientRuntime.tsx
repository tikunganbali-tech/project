/**
 * ClientRuntime - Client-side runtime gate
 * 
 * SOLUSI FINAL: Pisahkan total antara Server Layout dan Client Runtime
 * 
 * Semua yang 'use client' masuk ke sini
 * Tidak ada komponen client di luar file ini
 */

'use client';

import { ReactNode, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Providers } from '@/app/providers';

// Lazy load components to prevent initialization errors from blocking error boundaries
const MarketingPixels = dynamic(() => import('@/components/MarketingPixels'), { ssr: false });
const PageViewTracker = dynamic(() => import('@/components/analytics/PageViewTracker'), { ssr: false });
const SocialProofOverlay = dynamic(() => import('@/components/SocialProofOverlay'), { ssr: false });
const BackToTop = dynamic(() => import('@/components/BackToTop'), { ssr: false });
const WhatsAppFloating = dynamic(() => import('@/components/WhatsAppFloating'), { ssr: false });

export default function ClientRuntime({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <Suspense fallback={null}>
        <MarketingPixels />
      </Suspense>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
      {/* R2-3: Social Proof Overlay - conditional mount, component handles its own enabled state */}
      <Suspense fallback={null}>
        <SocialProofOverlay />
      </Suspense>
      {/* F7-D: Back-to-Top Button - global */}
      <Suspense fallback={null}>
        <BackToTop />
      </Suspense>
      {/* PHASE F — F1: WhatsApp Floating Button */}
      <Suspense fallback={null}>
        <WhatsAppFloating />
      </Suspense>
    </Providers>
  );
}
