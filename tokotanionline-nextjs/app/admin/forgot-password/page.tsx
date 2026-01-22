'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';

type FormState = 'idle' | 'submitting' | 'submitted';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [mounted, setMounted] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true);
    
    // Hide admin layout elements if they exist
    const hideAdminElements = () => {
      const sidebar = document.querySelector('aside') as HTMLElement | null;
      const mainContent = document.querySelector('main') as HTMLElement | null;
      const adminLayout = document.querySelector('.admin-layout') as HTMLElement | null;
      
      if (sidebar) sidebar.style.display = 'none';
      if (mainContent) mainContent.style.display = 'none';
      if (adminLayout) adminLayout.style.display = 'none';
    };
    
    // Hide immediately and on any DOM changes
    hideAdminElements();
    const observer = new MutationObserver(hideAdminElements);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic email format validation only
    if (!email || !email.includes('@')) {
      return;
    }

    setFormState('submitting');

    try {
      const response = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        console.error('[forgot-password] Response not OK:', response.status, response.statusText);
        // Even on error, show success (security - don't leak user existence)
        setFormState('submitted');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setFormState('submitted');
      } else {
        // Even on error, show success (security - don't leak user existence)
        setFormState('submitted');
      }
    } catch (error: any) {
      console.error('[forgot-password] Fetch error:', error?.message || error);
      // Even on error, show success (security)
      setFormState('submitted');
    }
  };

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 99999,
          backgroundColor: '#f9fafb'
        }}
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <ShoppingBag className="h-12 w-12 text-green-600 animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-50"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 99999,
        backgroundColor: '#f9fafb'
      }}
    >
      <div className="max-w-md w-full mx-4 bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          {/* Logo & Branding - Above Form */}
          <div className="flex justify-center mb-6">
            {!logoError ? (
              <img
                src="/logo.svg"
                alt="TOKO TANI ONLINE"
                className="h-16 w-16 object-contain"
                loading="eager"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="h-16 flex items-center justify-center">
                <span className="text-lg font-semibold text-green-700">TOKO TANI ONLINE</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Lupa Password</h1>
          <p className="text-gray-600 mt-2">Masukkan email untuk reset password</p>
        </div>

        {formState === 'submitted' ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">Permintaan berhasil dikirim</p>
              <p className="text-sm mt-1">
                Jika email terdaftar, kami akan mengirimkan link reset.
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Kembali ke Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={formState === 'submitting'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="nama@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={formState === 'submitting'}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formState === 'submitting' ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/admin/login')}
                className="text-sm font-medium text-green-700 hover:text-green-800"
              >
                Kembali ke Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

