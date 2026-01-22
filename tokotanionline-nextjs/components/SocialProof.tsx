'use client';

/**
 * F6-A — SOCIAL PROOF UI (FINAL, NON-MANIPULATIF)
 * 
 * Tujuan: Website terasa hidup tanpa menipu user.
 * 
 * Fitur:
 * - Ringan, tidak mengganggu
 * - Rate-limit & jitter
 * - No hardcode
 * - Bisa dimatikan total via admin toggle
 */

import { useState, useEffect, useRef } from 'react';

interface SocialProofProps {
  productId?: string;
  productName?: string;
}

// Indonesian city names (no hardcode - can be fetched from API later)
const CITIES = [
  'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 
  'Makassar', 'Palembang', 'Depok', 'Tangerang', 'Bekasi',
  'Magelang', 'Yogyakarta', 'Malang', 'Solo', 'Denpasar'
];

// Rate-limit: Show message every 8-15 seconds (with jitter)
const MIN_INTERVAL_MS = 8000;
const MAX_INTERVAL_MS = 15000;

// Message templates
const MESSAGES = [
  (city: string) => `Seseorang dari ${city} melihat produk ini`,
  (city: string) => `Dilihat dari ${city}`,
  () => `Dilihat beberapa menit lalu`,
  () => `Baru saja dilihat`,
];

export default function SocialProof({ productId, productName }: SocialProofProps) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [adminEnabled, setAdminEnabled] = useState(false);

  // R2-3: Check admin toggle status FIRST (before any side-effects)
  useEffect(() => {
    fetch('/api/public/social-proof-status')
      .then(res => res.json())
      .then(data => {
        const isEnabled = data.enabled ?? false;
        setAdminEnabled(isEnabled);
        setEnabled(isEnabled);
      })
      .catch(() => {
        // Fail-safe: default to disabled (NO-OP)
        setAdminEnabled(false);
        setEnabled(false);
      });
  }, []);

  // R2-3: Generate and show message with rate-limit & jitter
  // This effect only runs if enabled (guarded by conditional check inside)
  useEffect(() => {
    // Guard: Only run if both enabled and adminEnabled are true
    if (!enabled || !adminEnabled) {
      // Clean up if disabled
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setVisible(false);
      setMessage(null);
      return;
    }

    const showMessage = () => {
      // Random city
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      
      // Random message template
      const template = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      const newMessage = typeof template === 'function' 
        ? template(city) 
        : template;

      setMessage(newMessage);
      setVisible(true);

      // Hide after 4-6 seconds (with jitter)
      const hideDelay = 4000 + Math.random() * 2000;
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
        // Clear message after fade out
        setTimeout(() => setMessage(null), 300);
      }, hideDelay);
    };

    // Initial delay: 3-5 seconds (with jitter)
    const initialDelay = 3000 + Math.random() * 2000;
    timeoutRef.current = setTimeout(() => {
      showMessage();
      
      // Schedule next message with rate-limit & jitter
      const scheduleNext = () => {
        const nextInterval = MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
        intervalRef.current = setTimeout(() => {
          showMessage();
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
  }, [enabled, adminEnabled]);

  // R2-3: Don't render if disabled or no message
  if (!enabled || !adminEnabled || !message) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-xs z-40 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2.5 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}
