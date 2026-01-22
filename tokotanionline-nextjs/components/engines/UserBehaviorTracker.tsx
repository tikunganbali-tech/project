'use client';

import { useEffect, useRef } from 'react';

interface UserBehaviorTrackerProps {
  pageType: 'blog' | 'product';
  pageId: string;
  sessionId: string;
}

export default function UserBehaviorTracker({ pageType, pageId, sessionId }: UserBehaviorTrackerProps) {
  const scrollTracked = useRef(false);
  const timeTracked = useRef(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Track scroll depth
    const handleScroll = () => {
      const scrollPercent = Math.round(
        ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
      );

      // Track at 40% and 60%
      if (scrollPercent >= 40 && !scrollTracked.current) {
        scrollTracked.current = true;
        trackEvent('scroll', scrollPercent);
      }
    };

    // Track time on page
    const timeInterval = setInterval(() => {
      const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
      if (timeSpent >= 30 && !timeTracked.current) {
        timeTracked.current = true;
        trackEvent('time', timeSpent);
      }
    }, 5000);

    // Track exit intent
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        trackEvent('exit_intent', true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearInterval(timeInterval);
    };
  }, []);

  const trackEvent = async (eventType: string, value: number | boolean) => {
    try {
      await fetch('/api/engines/behavior/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          pageType,
          pageId,
          eventType,
          value,
        }),
      });
    } catch (error) {
      // Silent fail - tracking should not break the app
    }
  };

  const trackCTAClick = () => {
    trackEvent('cta_click', 1);
  };

  // Expose CTA click tracking via global
  useEffect(() => {
    (window as any).trackCTAClick = trackCTAClick;
    return () => {
      delete (window as any).trackCTAClick;
    };
  }, []);

  return null; // This component doesn't render anything
}












