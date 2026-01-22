'use client';

/**
 * Social Proof Overlay - Frontend User Only
 * 
 * Prinsip:
 * - Hanya muncul di frontend user (bukan admin/login)
 * - Check admin toggle terlebih dahulu (early return)
 * - Rate-limit & jitter untuk tidak mengganggu
 * - Lightweight, tidak ada geolocation yang berat
 * - Pesan human-like: "Petani dari [lokasi] baru saja membeli [produk]"
 */

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

interface SocialProofMessage {
  text: string;
  location?: string;
  productId?: string;
  productName?: string;
  timestamp?: string;
}

export default function SocialProofOverlay() {
  // ALL HOOKS MUST BE CALLED FIRST (Rules of Hooks)
  const [enabled, setEnabled] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const [message, setMessage] = useState<SocialProofMessage | null>(null);
  const [visible, setVisible] = useState(false);
  // Next.js types can mark pathname as nullable
  const pathname = usePathname() ?? '';
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<SocialProofMessage[]>([]);

  // Hide on admin and login pages
  const isAdminOrLogin = pathname.startsWith('/admin') || pathname.startsWith('/login');

  // Check admin toggle status FIRST (before any side-effects)
  useEffect(() => {
    if (isAdminOrLogin) return;
    
    fetch('/api/public/social-proof-status')
      .then(res => res.json())
      .then(data => {
        const isEnabled = data.enabled ?? false;
        setEnabled(isEnabled);
        setStatusChecked(true);
      })
      .catch(() => {
        // Fail-safe: default to disabled
        setEnabled(false);
        setStatusChecked(true);
      });
  }, [isAdminOrLogin]);

  // Fetch social proof messages (only once, cached)
  useEffect(() => {
    if (isAdminOrLogin || !enabled || messagesRef.current.length > 0) return;

    fetch('/api/testimonials')
      .then(res => res.json())
      .then(data => {
        if (data.messages && Array.isArray(data.messages)) {
          messagesRef.current = data.messages;
        }
      })
      .catch(() => {
        // Fail-safe: use empty array
        messagesRef.current = [];
      });
  }, [enabled, isAdminOrLogin]);

  // Show messages with rate-limit & jitter
  useEffect(() => {
    if (isAdminOrLogin || !enabled || messagesRef.current.length === 0) return;

    const showMessage = () => {
      // Random message from pool
      const randomMessage = messagesRef.current[
        Math.floor(Math.random() * messagesRef.current.length)
      ];
      
      if (randomMessage) {
        setMessage(randomMessage);
        setVisible(true);

        // Auto-hide after 6-8 seconds (with jitter)
        const hideDelay = 6000 + Math.random() * 2000;
        timeoutRef.current = setTimeout(() => {
          setVisible(false);
          // Clear message after fade out
          setTimeout(() => setMessage(null), 300);
        }, hideDelay);
      }
    };

    // Initial delay: 5-7 seconds (with jitter)
    const initialDelay = 5000 + Math.random() * 2000;
    timeoutRef.current = setTimeout(() => {
      showMessage();
      
      // Schedule next message with rate-limit & jitter (15-30 seconds)
      const scheduleNext = () => {
        const nextInterval = 15000 + Math.random() * 15000; // 15-30 seconds
        intervalRef.current = setTimeout(() => {
          // 70% probability to show (rate-limit)
          if (Math.random() < 0.7) {
            showMessage();
          }
          scheduleNext();
        }, nextInterval);
      };
      
      scheduleNext();
    }, initialDelay);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, isAdminOrLogin]);

  // Reset on route change
  useEffect(() => {
    if (isAdminOrLogin) return;
    setVisible(false);
    setMessage(null);
  }, [pathname, isAdminOrLogin]);

  // NOW we can do conditional returns (after all hooks)
  if (isAdminOrLogin) {
    return null;
  }

  if (!statusChecked || !enabled) {
    return null;
  }

  if (!message || !visible) {
    return null;
  }

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setMessage(null), 300);
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 animate-in fade-in slide-in-from-left-4 duration-300 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Message */}
        <div className="pr-6">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5 animate-pulse" />
            <p className="text-sm text-gray-700 leading-relaxed">
              {message.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
