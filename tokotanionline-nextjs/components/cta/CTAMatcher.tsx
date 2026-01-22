/**
 * FASE 5 — CTA Matcher Component
 * 
 * Server-side preferred, but can be client-side if needed.
 * Fetches matching CTA from API.
 */

'use client';

import { useEffect, useState } from 'react';
import CTADisplay from './CTADisplay';

interface CTAMatcherProps {
  contentType: 'blog' | 'product' | 'home' | 'other';
  contentTitle?: string;
  contentBody?: string;
  keywords?: string[];
  pagePath: string;
  placement?: 'inline' | 'sidebar' | 'footer';
}

export default function CTAMatcher({
  contentType,
  contentTitle,
  contentBody,
  keywords,
  pagePath,
  placement = 'inline',
}: CTAMatcherProps) {
  const [cta, setCta] = useState<{
    id: string;
    type: 'whatsapp' | 'checkout' | 'link';
    label: string;
    targetUrl: string;
    placement: 'inline' | 'sidebar' | 'footer';
  } | null>(null);

  useEffect(() => {
    // Fetch matching CTA
    const fetchCta = async () => {
      try {
        const response = await fetch('/api/cta/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contentType,
            contentTitle,
            contentBody,
            keywords,
            pagePath,
          }),
        });

        const data = await response.json();
        if (data.cta) {
          setCta(data.cta);
        }
      } catch (error) {
        // Silent fail - no CTA is acceptable
        console.error('[CTA-MATCHER] Error:', error);
      }
    };

    fetchCta();
  }, [contentType, contentTitle, contentBody, keywords, pagePath]);

  if (!cta) {
    return null;
  }

  return (
    <CTADisplay
      cta={cta}
      pagePath={pagePath}
      pageType={contentType}
      placement={placement}
    />
  );
}
