'use client';

import { useState } from 'react';
import {
  Building2,
  TrendingUp,
  Shield,
  Link as LinkIcon,
  FileText,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Users,
  Layers,
} from 'lucide-react';

interface BrandEntityClientProps {
  dashboardData: any;
}

export default function BrandEntityClient({ dashboardData }: BrandEntityClientProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async (action: string) => {
    // Prevent duplicate execution
    if (isExecuting) {
      return;
    }

    setIsExecuting(true);
    setExecutingAction(action);
    setError(null);

    try {
      const response = await fetch('/api/admin/brand-entity/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      // Check for rate limit error
      if (response.status === 429) {
        const errorData = await response.json();
        setError(`Rate limit exceeded. Please wait a moment and try again. ${errorData.error || ''}`);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || `Failed to execute ${action}. Please try again.`);
        return;
      }

      const result = await response.json();
      if (result.success) {
        // Show success message and reload after delay
        alert(`✅ ${action.replace(/_/g, ' ')} executed successfully! ${result.message || ''}`);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError(result.error || `Failed to execute ${action}`);
      }
    } catch (error: any) {
      console.error('Error executing action:', error);
      if (error.message?.includes('rate limit') || error.message?.includes('Too many')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError(`Error executing action: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsExecuting(false);
      setExecutingAction(null);
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'dominant':
        return 'text-green-600 bg-green-50';
      case 'growing':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-red-600 bg-red-50';
    }
  };

  const getStrengthIcon = (strength: string) => {
    switch (strength) {
      case 'dominant':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'growing':
        return <TrendingUp className="w-6 h-6 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
    }
  };

  const { brand, metrics, mentionHistory, schemaCoverage } = dashboardData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-500" />
            Brand Entity System
          </h1>
          <p className="text-gray-600 mt-1">Google Knowledge Graph Integration</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExecute('inject_signals')}
            disabled={isExecuting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {executingAction === 'inject_signals' && isExecuting ? 'Injecting...' : 'Inject Signals'}
          </button>
          <button
            onClick={() => handleExecute('build_links')}
            disabled={isExecuting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {executingAction === 'build_links' && isExecuting ? 'Building...' : 'Build Links'}
          </button>
          <button
            onClick={() => handleExecute('quality_check')}
            disabled={isExecuting}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {executingAction === 'quality_check' && isExecuting ? 'Checking...' : 'Quality Check'}
          </button>
          <button
            onClick={() => handleExecute('update_metrics')}
            disabled={isExecuting}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {executingAction === 'update_metrics' && isExecuting ? 'Updating...' : 'Update Metrics'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 mb-1">Error</p>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Info */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{brand.brandName}</h2>
            <p className="text-gray-600 mt-2">{brand.brandDescription}</p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-gray-600">Category:</span>
              <span className="font-medium">{brand.brandCategory}</span>
            </div>
          </div>
          <div className={`p-4 rounded-lg ${getStrengthColor(metrics.entityStrength)}`}>
            <div className="flex items-center gap-2">
              {getStrengthIcon(metrics.entityStrength)}
              <span className="font-semibold capitalize">{metrics.entityStrength}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Brand Mentions</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.brandMentions}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Schema Coverage</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.schemaCoverage}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Consistency</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.consistencyScore}/100</p>
            </div>
            <Shield className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entity Links</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.entityLinks}</p>
            </div>
            <LinkIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Authors</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.authorCount}</p>
            </div>
            <Users className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clusters</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.clusterCount}</p>
            </div>
            <Layers className="w-8 h-8 text-teal-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Indexed Pages</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.indexedPages}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Schema Coverage */}
      <div className="bg-white rounded-lg shadow border p-4">
        <h2 className="text-lg font-semibold mb-3">Schema Coverage by Type</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{schemaCoverage.blog}</p>
            <p className="text-sm text-gray-600">Blog Posts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{schemaCoverage.product}</p>
            <p className="text-sm text-gray-600">Products</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{schemaCoverage.page}</p>
            <p className="text-sm text-gray-600">Pages</p>
          </div>
        </div>
      </div>

      {/* Recent Mentions */}
      <div className="bg-white rounded-lg shadow border p-4">
        <h2 className="text-lg font-semibold mb-3">Recent Brand Mentions</h2>
        <div className="space-y-2">
          {mentionHistory.slice(0, 10).map((mention: any, idx: number) => (
            <div key={idx} className="p-3 bg-gray-50 rounded border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{mention.mentionType}</p>
                  <p className="text-sm text-gray-600">{mention.pageType}: {mention.pageId}</p>
                  {mention.context && (
                    <p className="text-xs text-gray-500 mt-1">{mention.context}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(mention.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}






