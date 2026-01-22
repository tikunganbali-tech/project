'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface BrandEntitySetupClientProps {
  brand: any | null;
}

export default function BrandEntitySetupClient({ brand }: BrandEntitySetupClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCompleteSetup = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/brand-entity/setup', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        router.push('/admin/brand-entity');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error completing setup');
    } finally {
      setIsProcessing(false);
    }
  };

  if (brand) {
    return (
      <div className="p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                Brand Entity Sudah Terinisialisasi!
              </h2>
              <p className="text-green-700 mb-4">
                Brand entity <strong>{brand.brandName}</strong> sudah dibuat dan siap digunakan.
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-green-600">
                  <strong>Status:</strong> {brand.entityStrength === 'dominant' ? 'Dominant' : brand.entityStrength === 'growing' ? 'Growing' : 'Weak'}
                </p>
                <p className="text-sm text-green-600">
                  <strong>Mentions:</strong> {brand.mentionCount}
                </p>
                <p className="text-sm text-green-600">
                  <strong>Schema Coverage:</strong> {brand.schemaCoverage}%
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/brand-entity')}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Lihat Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Brand Entity Setup</h1>
              <p className="text-gray-600">Inisialisasi brand entity untuk Google Knowledge Graph</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  Brand entity belum ditemukan. Klik tombol di bawah untuk membuat brand entity secara otomatis.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCompleteSetup}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5" />
                Setup Brand Entity
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}






