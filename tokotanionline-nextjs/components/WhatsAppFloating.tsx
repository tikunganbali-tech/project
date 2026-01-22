'use client';

/**
 * PHASE F — F1: WhatsApp Floating Button
 * 
 * Prinsip:
 * - Muncul setelah scroll 30-40% ATAU delay 5-7 detik
 * - Bisa ditutup oleh user (session-based)
 * - Nomor dari backend settings (tidak hardcode)
 * - Tidak mengganggu UX utama
 * - Posisi kanan bawah, tidak menutupi CTA utama
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function WhatsAppFloating() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);
  // Next.js types can mark pathname as nullable
  const pathname = usePathname() ?? '';
  const scrollThreshold = useRef(false);
  const delayTriggered = useRef(false);

  // Hide WhatsApp overlay on admin and login pages
  const isAdminOrLogin = pathname?.startsWith('/admin') || pathname?.startsWith('/login');
  
  if (isAdminOrLogin) {
    return null;
  }

  // Check if closed in this session
  useEffect(() => {
    const closed = sessionStorage.getItem('wa-floating-closed');
    if (closed === 'true') {
      setIsClosed(true);
      setLoading(false);
    }
  }, []);

  // Fetch WhatsApp number from backend
  useEffect(() => {
    if (isClosed) {
      setLoading(false);
      return;
    }

    fetch('/api/whatsapp/rotate')
      .then((res) => res.json())
      .then((data) => {
        if (data.phone) {
          setWhatsappNumber(data.phone);
        } else {
          setWhatsappNumber('6281234567890'); // Fallback
        }
        setLoading(false);
      })
      .catch(() => {
        setWhatsappNumber('6281234567890'); // Fallback
        setLoading(false);
      });
  }, [isClosed, pathname]);

  // Handle scroll trigger (30-40% scroll)
  useEffect(() => {
    if (isClosed || loading) return;

    const handleScroll = () => {
      if (scrollThreshold.current) return;

      const scrollPercent =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

      if (scrollPercent >= 30 && scrollPercent <= 40) {
        scrollThreshold.current = true;
        setIsVisible(true);
        
        // Track view
        console.log('[PHASE-F] WhatsApp floating appeared (scroll trigger)');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isClosed, loading]);

  // Handle delay trigger (5-7 detik)
  useEffect(() => {
    if (isClosed || loading || delayTriggered.current) return;

    const delay = 5000 + Math.random() * 2000; // 5-7 seconds
    const timer = setTimeout(() => {
      if (!scrollThreshold.current) {
        delayTriggered.current = true;
        setIsVisible(true);
        
        // Track view
        console.log('[PHASE-F] WhatsApp floating appeared (delay trigger)');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isClosed, loading]);

  // Reset on route change
  useEffect(() => {
    scrollThreshold.current = false;
    delayTriggered.current = false;
    setIsVisible(false);
  }, [pathname]);

  const handleClose = () => {
    setIsVisible(false);
    setIsClosed(true);
    sessionStorage.setItem('wa-floating-closed', 'true');
    
    // Track close
    console.log('[PHASE-F] WhatsApp floating closed by user');
  };

  const handleClick = () => {
    const message = 'Halo, saya ingin berkonsultasi tentang produk pertanian. Bisa minta informasi lebih lanjut?';
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // PHASE F — F4: Light Event Tracking
    const eventData = {
      event: 'click_whatsapp_floating',
      phone: whatsappNumber,
      path: pathname,
      timestamp: new Date().toISOString(),
    };
    
    console.log('[PHASE-F] Event:', eventData);
    
    // Optional: Send to internal tracking endpoint (non-blocking)
    fetch('/api/public/sales/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'whatsapp_floating_clicked',
        metadata: {
          phone: whatsappNumber,
          path: pathname,
        },
      }),
    }).catch(() => {}); // Non-blocking
  };

  if (isClosed || !isVisible || loading) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-900 transition-colors shadow-lg z-10"
          aria-label="Tutup"
        >
          <X className="h-3 w-3" />
        </button>

        {/* WhatsApp Button */}
        <button
          onClick={handleClick}
          className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Hubungi via WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
