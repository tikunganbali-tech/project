/**
 * STEP P1-3B - DECISION TIMELINE COMPONENT
 * 
 * Engine decision inspector timeline
 * Explains "KENAPA" not "APA"
 * Owner-friendly, non-technical language
 */

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Filter, X, Search, HelpCircle } from 'lucide-react';
import DecisionItem from './DecisionItem';

interface DecisionSnapshot {
  eventId: string;
  eventKey: string;
  entityType: string;
  entityId?: string | null;
  integration: string;
  decision: 'ALLOW' | 'SKIP';
  reason?: string | null;
  rule: string;
  explanation: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface DecisionTimelineProps {
  initialPage?: number;
  initialLimit?: number;
}

export default function DecisionTimeline({ initialPage = 1, initialLimit = 50 }: DecisionTimelineProps) {
  const [decisions, setDecisions] = useState<DecisionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [eventKeyFilter, setEventKeyFilter] = useState<string>('');
  const [entityIdFilter, setEntityIdFilter] = useState<string>('');
  const [integrationFilter, setIntegrationFilter] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchDecisions = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
      });

      if (eventKeyFilter) params.set('eventKey', eventKeyFilter);
      if (entityIdFilter) params.set('entityId', entityIdFilter);
      if (integrationFilter) params.set('integration', integrationFilter);
      if (decisionFilter) params.set('decision', decisionFilter);

      const response = await fetch(`/api/admin/engine/decisions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch decision snapshots');
      }

      const data = await response.json();

      if (data.success) {
        setDecisions(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
        setHasMore(data.pagination.hasMore);
      } else {
        throw new Error(data.error || 'Failed to fetch decision snapshots');
      }
    } catch (err: any) {
      console.error('Error fetching decisions:', err);
      setError(err.message || 'Failed to load decision snapshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions(page);
  }, [page, eventKeyFilter, entityIdFilter, integrationFilter, decisionFilter]);

  const handleRefresh = () => {
    fetchDecisions(page);
  };

  const clearFilters = () => {
    setEventKeyFilter('');
    setEntityIdFilter('');
    setIntegrationFilter(null);
    setDecisionFilter(null);
    setPage(1);
  };

  const hasActiveFilters = eventKeyFilter || entityIdFilter || integrationFilter || decisionFilter;

  if (loading && decisions.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error && decisions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-800 font-medium mb-2">Error loading decisions</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
          <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">No decision snapshots found</p>
          <p className="text-gray-500 text-sm">
            {hasActiveFilters 
              ? 'Try adjusting your filters'
              : 'Decision snapshots will appear here as events are processed'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {[eventKeyFilter, entityIdFilter, integrationFilter, decisionFilter].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Showing {decisions.length} of {total} decisions
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Event Key Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Key
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={eventKeyFilter}
                  onChange={(e) => {
                    setEventKeyFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g., add_to_cart"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Entity ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entity ID
              </label>
              <input
                type="text"
                value={entityIdFilter}
                onChange={(e) => {
                  setEntityIdFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g., prod_123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Integration Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Integration
              </label>
              <select
                value={integrationFilter || ''}
                onChange={(e) => {
                  setIntegrationFilter(e.target.value || null);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Integrations</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="GOOGLE">Google</option>
                <option value="TIKTOK">TikTok</option>
              </select>
            </div>

            {/* Decision Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision
              </label>
              <select
                value={decisionFilter || ''}
                onChange={(e) => {
                  setDecisionFilter(e.target.value || null);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Decisions</option>
                <option value="ALLOW">Allowed</option>
                <option value="SKIP">Skipped</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">
              Engine Decision Inspector
            </p>
            <p className="text-sm text-blue-700">
              This tool explains <strong>why</strong> events were sent or skipped, not just <strong>what</strong> happened.
              All information is read-only and does not trigger any execution.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {decisions.map((decision) => (
          <DecisionItem key={`${decision.eventId}-${decision.integration}`} decision={decision} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={!hasMore || loading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
