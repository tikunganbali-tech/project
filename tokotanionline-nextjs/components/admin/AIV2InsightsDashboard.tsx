/**
 * PHASE 5: Dashboard Insight (Read-Only)
 * 
 * Admin bisa melihat:
 * - Histori versi
 * - Tren SEO
 * - Alasan revisi
 * 
 * Admin tidak mengedit teks
 * Admin hanya memutuskan publish
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Eye, Lock } from 'lucide-react';

interface Insight {
  pageId: string;
  version: number;
  generatedAt: string;
  serpTrend: 'STAGNANT' | 'RISING' | 'FALLING';
  ctrTrend: 'STAGNANT' | 'RISING' | 'FALLING';
  engagementTrend: 'STAGNANT' | 'RISING' | 'FALLING';
  stagnantPatterns: string[];
  decliningPatterns: string[];
  recommendations: Array<{
    type: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    action: string;
  }>;
}

interface VersionHistory {
  version: number;
  createdAt: string;
  wordCount: number;
  readingTime: number;
}

interface AIV2InsightsDashboardProps {
  pageId: string;
}

export default function AIV2InsightsDashboard({ pageId }: AIV2InsightsDashboardProps) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [versions, setVersions] = useState<VersionHistory[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [pageId, selectedVersion]);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedVersion
        ? `/api/admin/ai-v2/insights?pageId=${pageId}&version=${selectedVersion}`
        : `/api/admin/ai-v2/insights?pageId=${pageId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load insights');
      }
      
      const data = await response.json();
      setInsight(data.insight);
      
      // Extract version history
      if (data.allVersions) {
        const versionHistory = data.allVersions.map((v: any) => ({
          version: v.version,
          createdAt: v.createdAt,
          wordCount: v.package?.metadata?.wordCount || 0,
          readingTime: v.package?.metadata?.readingTime || 0,
        }));
        setVersions(versionHistory);
        
        // Set selected version to latest if not set
        if (!selectedVersion && versionHistory.length > 0) {
          setSelectedVersion(versionHistory[versionHistory.length - 1].version);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'RISING':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'FALLING':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'RISING':
        return 'text-green-600 bg-green-50';
      case 'FALLING':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-600">
        Loading insights...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="p-4 text-center text-gray-600">
        No insights available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI v2 Insights Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">Page ID: <span className="font-mono">{pageId}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">Read-Only</span>
          </div>
        </div>

        {/* Version Selector */}
        {versions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Version:</label>
            <select
              value={selectedVersion || ''}
              onChange={(e) => setSelectedVersion(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {versions.map((v) => (
                <option key={v.version} value={v.version}>
                  V{v.version} - {new Date(v.createdAt).toLocaleDateString()} ({v.wordCount} words)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Performance Trends */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${getTrendColor(insight.serpTrend)}`}>
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(insight.serpTrend)}
              <span className="font-medium">SERP Position</span>
            </div>
            <p className="text-sm">{insight.serpTrend}</p>
          </div>
          <div className={`p-4 rounded-lg ${getTrendColor(insight.ctrTrend)}`}>
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(insight.ctrTrend)}
              <span className="font-medium">CTR</span>
            </div>
            <p className="text-sm">{insight.ctrTrend}</p>
          </div>
          <div className={`p-4 rounded-lg ${getTrendColor(insight.engagementTrend)}`}>
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(insight.engagementTrend)}
              <span className="font-medium">Engagement</span>
            </div>
            <p className="text-sm">{insight.engagementTrend}</p>
          </div>
        </div>
      </div>

      {/* Patterns */}
      {(insight.stagnantPatterns.length > 0 || insight.decliningPatterns.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Detected Patterns</h3>
          
          {insight.stagnantPatterns.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Stagnant Patterns:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {insight.stagnantPatterns.map((pattern, index) => (
                  <li key={index}>{pattern}</li>
                ))}
              </ul>
            </div>
          )}
          
          {insight.decliningPatterns.length > 0 && (
            <div>
              <h4 className="font-medium text-red-900 mb-2">Declining Patterns:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {insight.decliningPatterns.map((pattern, index) => (
                  <li key={index}>{pattern}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {insight.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <div className="space-y-3">
            {insight.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === 'HIGH'
                    ? 'bg-red-50 border-red-500'
                    : rec.priority === 'MEDIUM'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{rec.type}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.priority === 'HIGH'
                      ? 'bg-red-100 text-red-700'
                      : rec.priority === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1">{rec.message}</p>
                <p className="text-xs text-gray-600">Action: {rec.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version History */}
      {versions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Version History</h3>
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.version}
                className={`p-3 rounded-lg border ${
                  selectedVersion === v.version
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">V{v.version}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {v.wordCount} words · {v.readingTime} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
