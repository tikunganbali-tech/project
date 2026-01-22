/**
 * Exit Intent Handler
 * Shows ONE helpful suggestion when user tries to leave (not popup spam)
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { X, MessageCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ExitIntentHandlerProps {
  pageType: 'product' | 'blog';
  pageId?: string;
  suggestion?: {
    title: string;
    message: string;
    ctaText: string;
    ctaUrl: string;
    ctaType?: 'whatsapp' | 'link';
  };
}

export default function ExitIntentHandler({ pageType, pageId, suggestion }: ExitIntentHandlerProps) {
  const [show, setShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    // Only show once per page visit
    if (hasShown || triggeredRef.current) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves to top (exit intent)
      if (e.clientY <= 10 && !triggeredRef.current) {
        triggeredRef.current = true;
        setHasShown(true);
        setShow(true);

        // Track exit intent
        if (pageId) {
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'ExitIntent',
              pageType,
              pageId,
              metadata: { shown: true },
            }),
          }).catch(() => {});
        }
      }
    };

    // Only track on desktop (mobile doesn't have mouse)
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      document.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        document.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pageType, pageId, hasShown]);

  if (!show || !suggestion) return null;

  const handleCTAClick = () => {
    if (suggestion.ctaType === 'whatsapp') {
      // WhatsApp CTA will be handled by the link
      // Track click
      if (pageId) {
        fetch('/api/analytics/cta-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageType,
            pageId,
            ctaType: 'whatsapp',
            ctaLabel: suggestion.ctaText,
            ctaPosition: 'exit_intent',
            metadata: { suggestionTitle: suggestion.title },
          }),
        }).catch(() => {});
      }
    } else {
      // Regular link
      if (pageId) {
        fetch('/api/analytics/cta-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageType,
            pageId,
            ctaType: 'link',
            ctaLabel: suggestion.ctaText,
            ctaPosition: 'exit_intent',
            metadata: { suggestionTitle: suggestion.title },
          }),
        }).catch(() => {});
      }
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-50 transition-opacity"
        onClick={() => setShow(false)}
      />

      {/* Suggestion Card */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200">
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{suggestion.title}</h3>
            <p className="text-sm text-gray-600">{suggestion.message}</p>
          </div>

          <Link
            href={suggestion.ctaUrl}
            onClick={handleCTAClick}
            className="block w-full"
          >
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition">
              {suggestion.ctaType === 'whatsapp' ? (
                <MessageCircle className="h-5 w-5" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
              {suggestion.ctaText}
            </button>
          </Link>

          <button
            onClick={() => setShow(false)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
          >
            Tidak, terima kasih
          </button>
        </div>
      </div>
    </>
  );
}











