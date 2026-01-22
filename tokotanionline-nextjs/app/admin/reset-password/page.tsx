'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';

type FormState = 'idle' | 'submitting' | 'success' | 'invalid' | 'loading';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formState, setFormState] = useState<FormState>('loading');
  const [mounted, setMounted] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

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

  // Validate token on mount
  useEffect(() => {
    if (mounted) {
      if (!token || token.trim() === '') {
        setFormState('invalid');
        setErrorMessage('Link reset tidak valid. Token tidak ditemukan.');
      } else {
        setFormState('idle');
      }
    }
  }, [mounted, token]);

  // Validate password match on change
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // UI validation: Check password match
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    // Basic password length validation
    if (!password || password.length < 6) {
      setErrorMessage('Password minimal 6 karakter');
      return;
    }

    if (!token) {
      setFormState('invalid');
      setErrorMessage('Link reset tidak valid. Token tidak ditemukan.');
      return;
    }

    setFormState('submitting');
    setPasswordMismatch(false);
    setErrorMessage('');

    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (data.success) {
        setFormState('success');
      } else {
        setFormState('invalid');
        setErrorMessage(data.message || 'Link reset tidak valid atau telah kedaluwarsa.');
      }
    } catch (error: any) {
      setFormState('invalid');
      setErrorMessage('Terjadi kesalahan. Silakan coba lagi atau minta link reset baru.');
    }
  };

  // Show loading state until mounted
  if (!mounted || formState === 'loading') {
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

  // Show invalid/expired state
  if (formState === 'invalid') {
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
            {/* Logo & Branding */}
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
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">{errorMessage || 'Link reset tidak valid atau telah kedaluwarsa.'}</p>
            </div>
            <button
              onClick={() => router.push('/admin/forgot-password')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Minta Link Reset Baru
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
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (formState === 'success') {
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
            {/* Logo & Branding */}
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
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">Password berhasil diperbarui. Silakan login.</p>
            </div>
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Masuk ke Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show form (idle or submitting)
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
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">Masukkan password baru Anda</p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password Baru
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={formState === 'submitting'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Minimal 6 karakter"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Konfirmasi Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={formState === 'submitting'}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                passwordMismatch && confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="Ulangi password baru"
            />
            {passwordMismatch && confirmPassword && (
              <p className="mt-1 text-sm text-red-600">Password tidak cocok</p>
            )}
          </div>

          <button
            type="submit"
            disabled={formState === 'submitting' || !password || !confirmPassword || passwordMismatch}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formState === 'submitting' ? 'Memproses...' : 'Set Password'}
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
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
