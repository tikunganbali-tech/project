/**
 * EKSEKUSI 1 - AI BLOG CONTROL PANEL
 * 
 * Control panel untuk mengendalikan AI blog generation:
 * - Generate (manual)
 * - Regenerate
 * - Lock / Unlock artikel
 * - Display: Mode, Category, Related Products, Intent Type, Keyword Tree
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  RefreshCw, 
  Lock, 
  Unlock, 
  ChevronDown, 
  ChevronRight,
  Package,
  Search,
  FileText,
  AlertCircle
} from 'lucide-react';

interface BlogMetadata {
  id: string;
  title: string;
  mode: 'PRODUCT_AWARE' | 'CATEGORY_ONLY' | null;
  category: {
    id: string;
    name: string;
    path: string; // Full category tree path
  } | null;
  relatedProductIds: string[] | null;
  relatedProducts: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  intentType: string | null;
  keywordTree: {
    primary: string;
    secondary: string[];
    longTail: string[];
  } | null;
  isLocked?: boolean;
}

interface AIBlogControlPanelProps {
  blogId: string;
  initialMetadata?: BlogMetadata;
  categoryId?: string;
  intentType?: string;
  onConfirmationChange?: (confirmed: boolean) => void;
}

export default function AIBlogControlPanel({
  blogId,
  initialMetadata,
  categoryId,
  intentType,
  onConfirmationChange,
}: AIBlogControlPanelProps) {
  const [metadata, setMetadata] = useState<BlogMetadata | null>(initialMetadata || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['mode', 'category']));
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  // LAST LOCK: Confirmation checkbox state
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  // Notify parent when confirmation changes
  useEffect(() => {
    if (onConfirmationChange) {
      onConfirmationChange(confirmationChecked);
    }
  }, [confirmationChecked, onConfirmationChange]);

  // Fetch metadata on mount
  useEffect(() => {
    if (!initialMetadata) {
      fetchMetadata();
    }
  }, [blogId]);

  const fetchMetadata = async () => {
    try {
      const response = await fetch(`/api/admin/blog/posts/${blogId}/metadata`);
      if (response.ok) {
        const data = await response.json();
        setMetadata(data);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleGenerate = async () => {
    if (!confirm('Generate artikel baru? Artikel yang ada akan diganti.')) {
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // This will be handled by the parent form component
      // For now, just show a message
      setSuccess('Klik tombol "Generate dengan AI" di form untuk generate artikel baru.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Gagal generate artikel');
      setTimeout(() => setError(null), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate artikel ini? Konten yang ada akan diganti.')) {
      return;
    }

    setRegenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/blog/posts/${blogId}/regenerate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal regenerate artikel');
      }

      setSuccess('Artikel berhasil di-regenerate. Refresh halaman untuk melihat hasil.');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal regenerate artikel');
      setTimeout(() => setError(null), 5000);
    } finally {
      setRegenerating(false);
    }
  };

  const handleLockToggle = async () => {
    const newLockState = !metadata?.isLocked;
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/blog/posts/${blogId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: newLockState }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal update lock status');
      }

      setMetadata((prev) => prev ? { ...prev, isLocked: newLockState } : null);
      setSuccess(newLockState ? 'Artikel dikunci' : 'Artikel dibuka');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal update lock status');
      setTimeout(() => setError(null), 5000);
    }
  };

  if (!metadata) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <p className="text-gray-500">Loading metadata...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">AI Blog Control Panel</h3>
          <div className="flex items-center gap-2">
            {metadata.isLocked && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                🔒 LOCKED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* LAST LOCK: Pre-Generate Summary */}
      {categoryId && intentType && (
        <div className="p-4 border-b bg-blue-50">
          <h4 className="font-semibold text-gray-900 mb-3">Ringkasan Sebelum Generate</h4>
          <div className="space-y-2 text-sm">
            {metadata?.category && (
              <div>
                <span className="font-medium text-gray-700">Category Path:</span>{' '}
                <span className="text-gray-900">{metadata.category.path}</span>
              </div>
            )}
            {intentType && (
              <div>
                <span className="font-medium text-gray-700">Intent Type:</span>{' '}
                <span className="text-gray-900">{intentType}</span>
              </div>
            )}
            {metadata?.relatedProducts && metadata.relatedProducts.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Produk Pendukung:</span>{' '}
                <span className="text-gray-900">
                  {metadata.relatedProducts.map((p) => p.name).join(', ')}
                </span>
              </div>
            )}
            {metadata?.keywordTree?.primary && (
              <div>
                <span className="font-medium text-gray-700">Primary Keyword:</span>{' '}
                <span className="text-gray-900">{metadata.keywordTree.primary}</span>
              </div>
            )}
          </div>
          {/* LAST LOCK: Confirmation Checkbox */}
          <div className="mt-4 pt-4 border-t">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={(e) => setConfirmationChecked(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                Saya menyetujui fokus konten & produk pendukung
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="p-4 border-b space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating || metadata.isLocked || !confirmationChecked}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
            title={!confirmationChecked ? 'Harus centang konfirmasi terlebih dahulu' : ''}
          >
            <Play className="h-4 w-4" />
            {generating ? 'Generating...' : 'Generate'}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating || metadata.isLocked}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            onClick={handleLockToggle}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
              metadata.isLocked
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            {metadata.isLocked ? (
              <>
                <Unlock className="h-4 w-4" />
                Unlock
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Lock
              </>
            )}
          </button>
        </div>
      </div>

      {/* Information Sections */}
      <div className="p-4 space-y-4">
        {/* Mode */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('mode')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-900">Mode</span>
            </div>
            {expandedSections.has('mode') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {expandedSections.has('mode') && (
            <div className="px-4 pb-3 border-t">
              <div className="mt-3">
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  metadata.mode === 'PRODUCT_AWARE'
                    ? 'bg-green-100 text-green-800'
                    : metadata.mode === 'CATEGORY_ONLY'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {metadata.mode || 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('category')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-900">Category</span>
            </div>
            {expandedSections.has('category') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {expandedSections.has('category') && (
            <div className="px-4 pb-3 border-t">
              <div className="mt-3">
                {metadata.category ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{metadata.category.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{metadata.category.path}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada kategori</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Related Products */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('products')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-900">
                Related Products ({metadata.relatedProducts.length})
              </span>
            </div>
            {expandedSections.has('products') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {expandedSections.has('products') && (
            <div className="px-4 pb-3 border-t">
              <div className="mt-3 space-y-2">
                {metadata.relatedProducts.length > 0 ? (
                  metadata.relatedProducts.map((product) => (
                    <div key={product.id} className="text-sm text-gray-700">
                      • {product.name}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada produk terkait</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Intent Type */}
        {metadata.intentType && (
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('intent')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">Intent Type</span>
              </div>
              {expandedSections.has('intent') ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has('intent') && (
              <div className="px-4 pb-3 border-t">
                <div className="mt-3">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                    {metadata.intentType}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Keyword Tree */}
        {metadata.keywordTree && (
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('keywords')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">Keyword Tree</span>
              </div>
              {expandedSections.has('keywords') ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has('keywords') && (
              <div className="px-4 pb-3 border-t">
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Primary</p>
                    <p className="text-sm font-semibold text-gray-900">{metadata.keywordTree.primary}</p>
                  </div>
                  {metadata.keywordTree.secondary.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Secondary</p>
                      <div className="flex flex-wrap gap-1">
                        {metadata.keywordTree.secondary.map((kw, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {metadata.keywordTree.longTail.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Long-tail</p>
                      <div className="flex flex-wrap gap-1">
                        {metadata.keywordTree.longTail.slice(0, 5).map((kw, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                        {metadata.keywordTree.longTail.length > 5 && (
                          <span className="px-2 py-1 text-gray-500 text-xs">
                            +{metadata.keywordTree.longTail.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
