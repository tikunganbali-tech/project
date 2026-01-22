/**
 * PHASE 7B: Language Selector Component
 * 
 * Allows admin to:
 * - View current active locale
 * - Switch between locales for current brand
 * - See locale context in admin UI
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronDown, Globe } from 'lucide-react';

interface Locale {
  id: string;
  localeCode: string;
  languageName: string;
  isDefault: boolean;
  isActive: boolean;
}

interface LanguageSelectorProps {
  currentBrandId?: string;
  currentLocaleId?: string;
  onLocaleChange?: (localeId: string) => void;
}

export default function LanguageSelector({ 
  currentBrandId, 
  currentLocaleId, 
  onLocaleChange 
}: LanguageSelectorProps) {
  const { data: session } = useSession();
  const [locales, setLocales] = useState<Locale[]>([]);
  const [currentLocale, setCurrentLocale] = useState<Locale | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentBrandId) {
      loadLocales();
    }
  }, [currentBrandId]);

  useEffect(() => {
    if (currentLocaleId && locales.length > 0) {
      const locale = locales.find(l => l.id === currentLocaleId);
      if (locale) {
        setCurrentLocale(locale);
      }
    }
  }, [currentLocaleId, locales]);

  const loadLocales = async () => {
    if (!currentBrandId) return;
    
    try {
      const response = await fetch(`/api/admin/locales?brandId=${currentBrandId}`);
      if (response.ok) {
        const data = await response.json();
        setLocales(data.locales || []);
        
        // Set current locale from response or first active locale
        if (data.currentLocaleId) {
          const locale = data.locales.find((l: Locale) => l.id === data.currentLocaleId);
          if (locale) {
            setCurrentLocale(locale);
          }
        } else if (data.locales.length > 0) {
          const defaultLocale = data.locales.find((l: Locale) => l.isDefault) || data.locales[0];
          setCurrentLocale(defaultLocale);
        }
      }
    } catch (error) {
      console.error('[Language Selector] Failed to load locales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocaleSwitch = async (localeId: string) => {
    try {
      const response = await fetch('/api/admin/locales/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localeId, brandId: currentBrandId }),
      });

      if (response.ok) {
        const data = await response.json();
        const locale = locales.find(l => l.id === localeId);
        if (locale) {
          setCurrentLocale(locale);
          setIsOpen(false);
          if (onLocaleChange) {
            onLocaleChange(localeId);
          }
          // Reload page to apply locale context
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('[Language Selector] Failed to switch locale:', error);
    }
  };

  if (!currentBrandId) {
    return null; // Don't show if no brand selected
  }

  if (loading) {
    return (
      <div className="px-4 py-2 text-sm text-gray-500">
        Loading languages...
      </div>
    );
  }

  if (locales.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-gray-500">
        No languages available
      </div>
    );
  }

  // Filter active locales
  const availableLocales = locales.filter(l => l.isActive);

  if (availableLocales.length === 1) {
    // Only one locale - show as read-only
    return (
      <div className="px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2 text-sm">
          <Globe size={16} className="text-gray-500" />
          <span className="font-medium text-gray-700">
            {currentLocale?.languageName || availableLocales[0].languageName}
          </span>
          <span className="text-xs text-gray-500">
            ({currentLocale?.localeCode || availableLocales[0].localeCode})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-b bg-gray-50 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left hover:bg-gray-100 rounded px-2 py-1.5 transition"
      >
        <Globe size={16} className="text-gray-500" />
        <span className="font-medium text-gray-700 flex-1">
          {currentLocale?.languageName || 'Select Language'}
        </span>
        <span className="text-xs text-gray-500">
          {currentLocale?.localeCode}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
            {availableLocales.map((locale) => (
              <button
                key={locale.id}
                onClick={() => handleLocaleSwitch(locale.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                  currentLocale?.id === locale.id ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span>{locale.languageName}</span>
                    {locale.isDefault && (
                      <span className="ml-2 text-xs text-blue-600">(Default)</span>
                    )}
                  </div>
                  {currentLocale?.id === locale.id && (
                    <span className="text-xs text-green-600">✓ Active</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{locale.localeCode}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
