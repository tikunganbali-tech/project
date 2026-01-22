/**
 * PHASE 7A: Brand Selector Component
 * 
 * Allows admin to:
 * - View current active brand
 * - Switch between brands (if super_admin or assigned to multiple brands)
 * - See brand context in admin UI
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronDown, Building2 } from 'lucide-react';

interface Brand {
  id: string;
  brandName: string;
  brandSlug: string;
  brandStatus: string;
}

interface BrandSelectorProps {
  currentBrandId?: string;
  onBrandChange?: (brandId: string) => void;
}

export default function BrandSelector({ currentBrandId, onBrandChange }: BrandSelectorProps) {
  const { data: session } = useSession();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (currentBrandId && brands.length > 0) {
      const brand = brands.find(b => b.id === currentBrandId);
      if (brand) {
        setCurrentBrand(brand);
      }
    }
  }, [currentBrandId, brands]);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/admin/brands');
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || []);
        
        // Set current brand from session or first active brand
        if (data.currentBrandId) {
          const brand = data.brands.find((b: Brand) => b.id === data.currentBrandId);
          if (brand) {
            setCurrentBrand(brand);
          }
        } else if (data.brands.length > 0) {
          setCurrentBrand(data.brands[0]);
        }
      }
    } catch (error) {
      console.error('[Brand Selector] Failed to load brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSwitch = async (brandId: string) => {
    try {
      const response = await fetch('/api/admin/brands/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      });

      if (response.ok) {
        const data = await response.json();
        const brand = brands.find(b => b.id === brandId);
        if (brand) {
          setCurrentBrand(brand);
          setIsOpen(false);
          if (onBrandChange) {
            onBrandChange(brandId);
          }
          // Reload page to apply brand context
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('[Brand Selector] Failed to switch brand:', error);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-2 text-sm text-gray-500">
        Loading brands...
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-gray-500">
        No brands available
      </div>
    );
  }

  // Filter brands based on admin role
  // Super admin can see all brands, regular admin only sees assigned brand
  const availableBrands = brands.filter(b => b.brandStatus === 'ACTIVE');

  if (availableBrands.length === 1) {
    // Only one brand - show as read-only
    return (
      <div className="px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2 text-sm">
          <Building2 size={16} className="text-gray-500" />
          <span className="font-medium text-gray-700">{currentBrand?.brandName || availableBrands[0].brandName}</span>
          <span className="text-xs text-gray-500">(Active Brand)</span>
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
        <Building2 size={16} className="text-gray-500" />
        <span className="font-medium text-gray-700 flex-1">
          {currentBrand?.brandName || 'Select Brand'}
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
            {availableBrands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => handleBrandSwitch(brand.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                  currentBrand?.id === brand.id ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{brand.brandName}</span>
                  {currentBrand?.id === brand.id && (
                    <span className="text-xs text-green-600">✓ Active</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{brand.brandSlug}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
