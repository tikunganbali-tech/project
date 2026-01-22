/**
 * FASE 5 — CTA Click Tracker
 * 
 * Client-side tracking helper (non-invasive).
 */

export async function trackCtaClick(
  ctaId: string,
  pagePath: string,
  pageType?: string
): Promise<void> {
  try {
    await fetch('/api/cta/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ctaId,
        pagePath,
        pageType,
      }),
    });
  } catch (error) {
    // Silent fail - tracking is non-critical
    console.error('[CTA-TRACKER] Error:', error);
  }
}
