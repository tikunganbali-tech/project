/**
 * PHASE 8B.5: Strategy Brief Client Component (READ-ONLY)
 * 
 * Admin review & approve new version production.
 * NO manual text edit, NO auto-publish.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';

interface StrategyBrief {
  brandId: string;
  localeId: string;
  pageId?: string;
  generatedAt: string;
  seoInsights: {
    score: number;
    issues: string[];
    recommendations: string[];
    strengths: string[];
  };
  adsInsights: {
    whatWorks: string[];
    whatStagnant: string[];
    recommendations: string[];
    topPerformers: string[];
  };
  contentIntent?: {
    funnelStage: string;
    intentType: string;
    contentTypes: string[];
    topics: string[];
    angles: string[];
    priority: number;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    message: string;
    action: string;
    source: string;
    confidence: number;
  }>;
  priority: number;
  readOnly: boolean;
}

interface StrategyBriefData {
  briefs: StrategyBrief[];
  readOnly: boolean;
  warning: string;
}

export default function StrategyBriefClient() {
  const { data: session } = useSession();
  const [data, setData] = useState<StrategyBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedLocale, setSelectedLocale] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedBrand, selectedLocale]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedBrand) params.set('brandId', selectedBrand);
      if (selectedLocale) params.set('localeId', selectedLocale);

      const response = await fetch(`/api/admin/ads/strategy-brief?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load strategy briefs');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load strategy briefs');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduction = async (pageId: string, briefId: string) => {
    try {
      const response = await fetch('/api/admin/ads/strategy-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          strategyBriefId: briefId,
          action: 'approve_production',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve production');
      }

      // Reload data
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Error</span>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { briefs, readOnly, warning } = data;

  return (
    <div className="space-y-6">
      {/* PHASE 8B.5: Read-only warning */}
      {readOnly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Read-Only Mode</span>
          </div>
          <p className="text-yellow-700 mt-1 text-sm">{warning}</p>
        </div>
      )}

      {/* Strategy Briefs */}
      {briefs.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No strategy briefs available</p>
          <p className="text-sm mt-2">Strategy briefs will appear here when SEO and Ads insights are combined.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">Strategy Brief</h3>
                  <p className="text-sm text-gray-500">
                    {brief.pageId ? `Page: ${brief.pageId}` : 'Brand/Locale Level'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Generated: {new Date(brief.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    brief.priority >= 7 ? 'bg-red-100 text-red-800' :
                    brief.priority >= 4 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Priority: {brief.priority}/10
                  </span>
                </div>
              </div>

              {/* SEO Insights */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  SEO Insights
                </h4>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm">Score: <strong>{brief.seoInsights.score}/100</strong></span>
                  </div>
                  {brief.seoInsights.issues.length > 0 && (
                    <div className="text-sm text-red-600">
                      <strong>Issues:</strong> {brief.seoInsights.issues.join(', ')}
                    </div>
                  )}
                  {brief.seoInsights.strengths.length > 0 && (
                    <div className="text-sm text-green-600 mt-1">
                      <strong>Strengths:</strong> {brief.seoInsights.strengths.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Ads Insights */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Ads Insights
                </h4>
                <div className="bg-gray-50 p-3 rounded">
                  {brief.adsInsights.whatWorks.length > 0 && (
                    <div className="text-sm text-green-600 mb-1">
                      <strong>What Works:</strong> {brief.adsInsights.whatWorks.join(', ')}
                    </div>
                  )}
                  {brief.adsInsights.whatStagnant.length > 0 && (
                    <div className="text-sm text-red-600 mb-1">
                      <strong>What's Stagnant:</strong> {brief.adsInsights.whatStagnant.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              {brief.recommendations.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {brief.recommendations.map((rec, recIdx) => (
                      <div key={recIdx} className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-blue-800">{rec.message}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            rec.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">{rec.action}</p>
                        <p className="text-xs text-gray-500 mt-1">Source: {rec.source} | Confidence: {(rec.confidence * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Intent */}
              {brief.contentIntent && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Content Intent</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm">
                      <strong>Funnel Stage:</strong> {brief.contentIntent.funnelStage} | 
                      <strong> Intent:</strong> {brief.contentIntent.intentType}
                    </div>
                    {brief.contentIntent.contentTypes.length > 0 && (
                      <div className="text-sm mt-1">
                        <strong>Content Types:</strong> {brief.contentIntent.contentTypes.join(', ')}
                      </div>
                    )}
                    {brief.contentIntent.topics.length > 0 && (
                      <div className="text-sm mt-1">
                        <strong>Topics:</strong> {brief.contentIntent.topics.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PHASE 8B.5: Approve Production Button */}
              {brief.priority >= 7 && brief.pageId && (
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => handleApproveProduction(brief.pageId!, `brief-${idx}`)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve New Version Production
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    This will trigger new version generation (not auto-publish, not edit old version)
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
