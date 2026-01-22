'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

function trackBehavior(event: string, data?: any) {
  console.log('[Tracking]:', event, data);
}

interface BehaviorLoopProps {
  pageType: 'blog' | 'product' | 'home';
  pageId?: string;
  categoryId?: string;
  primaryKeyword?: string;
}

interface ScrollLink {
  text: string;
  url: string;
  type: 'internal' | 'product' | 'article';
}

interface ScrollCTA {
  type: 'whatsapp' | 'product' | 'article';
  title: string;
  description?: string;
  url?: string;
  productId?: string;
}

export default function BehaviorLoop({
  pageType,
  pageId,
  categoryId,
  primaryKeyword,
}: BehaviorLoopProps) {
  const [showInternalLinks, setShowInternalLinks] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [internalLinks, setInternalLinks] = useState<ScrollLink[]>([]);
  const [ctaData, setCtaData] = useState<ScrollCTA | null>(null);
  const scroll40Tracked = useRef(false);
  const scroll70Tracked = useRef(false);

  // Fetch internal links and CTA data
  useEffect(() => {
    const fetchScrollData = async () => {
      if (!pageId) return;

      try {
        // Fetch internal links for 40% scroll
        const linksResponse = await fetch(
          `/api/behavior/scroll-links?pageType=${pageType}&pageId=${pageId}&scrollDepth=40${categoryId ? `&categoryId=${categoryId}` : ''}${primaryKeyword ? `&keyword=${encodeURIComponent(primaryKeyword)}` : ''}`
        );
        if (linksResponse.ok) {
          const linksData = await linksResponse.json();
          if (linksData.links && linksData.links.length > 0) {
            setInternalLinks(linksData.links);
          }
        }

        // Fetch CTA for 70% scroll
        const ctaResponse = await fetch(
          `/api/behavior/scroll-cta?pageType=${pageType}&pageId=${pageId}${categoryId ? `&categoryId=${categoryId}` : ''}`
        );
        if (ctaResponse.ok) {
          const ctaData = await ctaResponse.json();
          if (ctaData.cta) {
            setCtaData(ctaData.cta);
          }
        }
      } catch (error) {
        console.error('Error fetching scroll data:', error);
      }
    };

    fetchScrollData();
  }, [pageType, pageId, categoryId, primaryKeyword]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent =
        ((window.scrollY + window.innerHeight) / document.body.scrollHeight) * 100;

      // 40% scroll → Show internal links
      if (scrollPercent >= 40 && !scroll40Tracked.current) {
        scroll40Tracked.current = true;
        setShowInternalLinks(true);
        trackBehavior('scroll_depth_40', {
          pageType,
          pageId,
          action: 'internal_links_shown',
        });
      }

      // 70% scroll → Show CTA
      if (scrollPercent >= 70 && !scroll70Tracked.current) {
        scroll70Tracked.current = true;
        setShowCTA(true);
        trackBehavior('scroll_depth_70', {
          pageType,
          pageId,
          action: 'cta_shown',
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pageType, pageId]);

  // Track CTA click
  const handleCTAClick = (ctaType: string, url?: string) => {
    trackBehavior('cta_click', {
      pageType,
      pageId,
      ctaType,
      url,
    });
  };

  // Track internal link click
  const handleLinkClick = (url: string, type: string) => {
    trackBehavior('internal_link_click', {
      pageType,
      pageId,
      url,
      linkType: type,
    });
  };

  return (
    <>
      {/* 40% Scroll: Internal Links */}
      {showInternalLinks && internalLinks.length > 0 && (
        <div className="my-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">📖 Artikel Terkait</h3>
          <div className="space-y-2">
            {internalLinks.slice(0, 3).map((link, index) => (
              <Link
                key={index}
                href={link.url}
                onClick={() => handleLinkClick(link.url, link.type)}
                className="block text-blue-700 hover:text-blue-900 hover:underline text-sm font-medium"
              >
                → {link.text}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 70% Scroll: CTA */}
      {showCTA && ctaData && (
        <div className="my-8 p-6 bg-green-50 border-2 border-green-500 rounded-lg text-center">
          <h3 className="text-xl font-bold text-green-900 mb-2">{ctaData.title}</h3>
          {ctaData.description && (
            <p className="text-green-800 mb-4">{ctaData.description}</p>
          )}
          {ctaData.type === 'whatsapp' && (
            <a
              href={`https://wa.me/6281234567890?text=${encodeURIComponent('Halo, saya tertarik dengan produk ini')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleCTAClick('whatsapp')}
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg"
            >
              Hubungi via WhatsApp
            </a>
          )}
          {ctaData.type === 'product' && ctaData.url && (
            <Link
              href={ctaData.url}
              onClick={() => handleCTAClick('product', ctaData.url)}
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg"
            >
              Lihat Produk
            </Link>
          )}
          {ctaData.type === 'article' && ctaData.url && (
            <Link
              href={ctaData.url}
              onClick={() => handleCTAClick('article', ctaData.url)}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg"
            >
              Baca Artikel
            </Link>
          )}
        </div>
      )}
    </>
  );
}












