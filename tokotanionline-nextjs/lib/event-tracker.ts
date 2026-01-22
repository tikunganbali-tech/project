/**
 * STEP 14B — EVENT TRACKER (CENTRAL HELPER)
 * 
 * Single source of truth untuk semua event tracking
 * Fire-and-forget, silent, aman, tidak ganggu UX
 */

export type TrackEventPayload = {
  event: 'view_product' | 'click_cta'
  url?: string
  meta?: Record<string, any>
}

/**
 * Track event ke EventLog
 * Fire-and-forget, silent fail, tidak mengganggu UX
 */
export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  try {
    const url = payload.url || (typeof window !== 'undefined' ? window.location.pathname : '')
    
    await fetch('/api/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: payload.event,
        url,
        meta: payload.meta || {},
      }),
      keepalive: true, // penting: tidak dibatalkan saat navigasi
    })
  } catch {
    // SILENT FAIL — tracking tidak boleh merusak UX
  }
}
