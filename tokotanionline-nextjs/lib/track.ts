/**
 * STEP 1 - Event Tracking Helper
 * Minimal helper untuk kirim event ke /api/track
 */

export type EventType = 'page_view' | 'click_cta';

export interface TrackEventPayload {
  event: EventType;
  url: string;
}

/**
 * Kirim event ke API
 * Tidak ada debounce, langsung kirim
 */
export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  try {
    // Gunakan sendBeacon jika tersedia (untuk page unload)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      navigator.sendBeacon('/api/track', blob);
    } else {
      // Fallback ke fetch
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (error) {
    // Silent fail - jangan break user experience
    console.warn('Event tracking failed:', error);
  }
}

/**
 * Track page view saat page load
 */
export function trackPageView(): void {
  if (typeof window === 'undefined') return;
  
  trackEvent({
    event: 'page_view',
    url: window.location.pathname,
  });
}

/**
 * Track CTA click
 */
export function trackCtaClick(url?: string, type?: string): void {
  if (typeof window === 'undefined') return;
  
  trackEvent({
    event: 'click_cta',
    url: url || window.location.pathname,
  });
}


