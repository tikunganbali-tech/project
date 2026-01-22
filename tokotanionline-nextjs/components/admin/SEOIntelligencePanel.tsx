/**
 * EKSEKUSI 1 - SEO INTELLIGENCE PANEL (READ-ONLY)
 * 
 * Menampilkan informasi SEO untuk artikel:
 * - Primary keyword
 * - Secondary keywords
 * - Long-tail keywords
 * - Intent type
 * - Status SEO: VALID / WARNING / BLOCKED
 */

'use client';

import { useState, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react';

interface SEOData {
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  intentType: string | null;
  status: 'VALID' | 'WARNING' | 'BLOCKED';
  statusReason?: string;
  metaTitle: string | null;
  metaDescription: string | null;
  seoKeywords: string | null;
}

interface SEOIntelligencePanelProps {
  blogId: string;
}

export default function SEOIntelligencePanel({ blogId }: SEOIntelligencePanelProps) {
  const [seoData, setSeoData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSEOData();
  }, [blogId]);

  const fetchSEOData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/blog/posts/${blogId}/seo`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch SEO data');
      }

      const data = await response.json();
      setSeoData(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data SEO');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!seoData) return null;
    
    switch (seoData.status) {
      case 'VALID':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'WARNING':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'BLOCKED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    if (!seoData) return 'bg-gray-100 text-gray-800';
    
    switch (seoData.status) {
      case 'VALID':
        return 'bg-green-100 text-green-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'BLOCKED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-gray-500">Loading SEO data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!seoData) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <p className="text-gray-500">Tidak ada data SEO</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">SEO Intelligence</h3>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor()}`}>
              {seoData.status}
            </span>
          </div>
        </div>
        {seoData.statusReason && (
          <p className="text-sm text-yellow-700 mt-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {seoData.statusReason}
          </p>
        )}
      </div>

      {/* SEO Data */}
      <div className="p-4 space-y-4">
        {/* Primary Keyword */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Primary Keyword</span>
          </div>
          {seoData.primaryKeyword ? (
            <p className="text-base font-semibold text-gray-900">{seoData.primaryKeyword}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">Tidak ada primary keyword</p>
          )}
        </div>

        {/* Secondary Keywords */}
        {seoData.secondaryKeywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Secondary Keywords ({seoData.secondaryKeywords.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {seoData.secondaryKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Long-tail Keywords */}
        {seoData.longTailKeywords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Long-tail Keywords ({seoData.longTailKeywords.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {seoData.longTailKeywords.slice(0, 10).map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs"
                >
                  {kw}
                </span>
              ))}
              {seoData.longTailKeywords.length > 10 && (
                <span className="px-2 py-1 text-gray-500 text-xs">
                  +{seoData.longTailKeywords.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Intent Type */}
        {seoData.intentType && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Intent Type</span>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
              {seoData.intentType}
            </span>
          </div>
        )}

        {/* Meta Tags */}
        <div className="border-t pt-4 space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Meta Title</span>
            {seoData.metaTitle ? (
              <p className="text-sm text-gray-900 mt-1">{seoData.metaTitle}</p>
            ) : (
              <p className="text-sm text-gray-500 italic mt-1">Tidak ada meta title</p>
            )}
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Meta Description</span>
            {seoData.metaDescription ? (
              <p className="text-sm text-gray-900 mt-1">{seoData.metaDescription}</p>
            ) : (
              <p className="text-sm text-gray-500 italic mt-1">Tidak ada meta description</p>
            )}
          </div>
          {seoData.seoKeywords && (
            <div>
              <span className="text-sm font-medium text-gray-700">SEO Keywords</span>
              <p className="text-sm text-gray-900 mt-1">{seoData.seoKeywords}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
