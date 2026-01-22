/**
 * STEP P1-3A - AUDIT TIMELINE COMPONENT
 * 
 * Unified audit trail timeline
 * Human-readable, non-technical language
 * Owner-friendly display
 */

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Filter, X } from 'lucide-react';
import AuditItem from './AuditItem';

interface UnifiedAuditEntry {
  id: string;
  timestamp: string;
  source: 'ADMIN' | 'ENGINE' | 'SYSTEM' | 'MARKETING';
  category: 'CONTENT' | 'PRODUCT' | 'MARKETING' | 'SYSTEM' | 'ACTION';
  action: string;
  actor: string | null;
  target: string | null;
  status: 'SUCCESS' | 'SKIPPED' | 'BLOCKED' | 'PENDING' | 'FAILED';
  reason: string | null;
  metadata: Record<string, any>;
  rawSource: string;
  rawId: string;
}

interface AuditTimelineProps {
  initialPage?: number;
  initialLimit?: number;
}

export default function AuditTimeline({ initialPage = 1, initialLimit = 50 }: AuditTimelineProps) {
  const [entries, setEntries] = useState<UnifiedAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchAudit = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
      });

      if (sourceFilter) params.set('source', sourceFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }

      const data = await response.json();

      if (data.success) {
        setEntries(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
        setHasMore(data.pagination.hasMore);
      } else {
        throw new Error(data.error || 'Failed to fetch audit trail');
      }
    } catch (err: any) {
      console.error('Error fetching audit:', err);
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit(page);
  }, [page, sourceFilter, categoryFilter, statusFilter]);

  const handleRefresh = () => {
    fetchAudit(page);
  };

  const clearFilters = () => {
    setSourceFilter(null);
    setCategoryFilter(null);
    setStatusFilter(null);
    setPage(1);
  };

  const hasActiveFilters = sourceFilter || categoryFilter || statusFilter;

  if (loading && entries.length === 0) {
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

  if (error && entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-800 font-medium mb-2">Error loading audit trail</p>
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

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-gray-600 font-medium mb-2">No audit entries found</p>
          <p className="text-gray-500 text-sm">
            {hasActiveFilters 
              ? 'Try adjusting your filters'
              : 'Audit trail will appear here as system activity occurs'}
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
                {[sourceFilter, categoryFilter, statusFilter].filter(Boolean).length}
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
          Showing {entries.length} of {total} entries
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <select
                value={sourceFilter || ''}
                onChange={(e) => {
                  setSourceFilter(e.target.value || null);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sources</option>
                <option value="ADMIN">Admin</option>
                <option value="ENGINE">Engine</option>
                <option value="SYSTEM">System</option>
                <option value="MARKETING">Marketing</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter || ''}
                onChange={(e) => {
                  setCategoryFilter(e.target.value || null);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                <option value="CONTENT">Content</option>
                <option value="PRODUCT">Product</option>
                <option value="MARKETING">Marketing</option>
                <option value="SYSTEM">System</option>
                <option value="ACTION">Action</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter || ''}
                onChange={(e) => {
                  setStatusFilter(e.target.value || null);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="BLOCKED">Blocked</option>
                <option value="SKIPPED">Skipped</option>
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

      {/* Timeline */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <AuditItem key={entry.id} entry={entry} />
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
