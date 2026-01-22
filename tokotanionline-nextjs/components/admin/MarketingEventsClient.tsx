/**
 * STEP 22B-4 - MARKETING EVENTS LOG CLIENT
 * 
 * Admin UI for viewing marketing event logs (READ-ONLY)
 * - No write operations
 * - No trigger operations
 * - No auto-refresh agresif
 * - Manual refresh only
 * - Super fast
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import MarketingEventLogFilters, { FilterState } from './MarketingEventLogFilters';
import MarketingEventLogTable from './MarketingEventLogTable';

interface EventLog {
  id: string;
  eventKey: string;
  entityType: string;
  entityId: string | null;
  payload: any;
  source: string;
  sessionId: string | null;
  userId: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface EventLogsResponse {
  events: EventLog[];
  pagination: Pagination;
}

export default function MarketingEventsClient() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    eventKey: '',
    entityType: '',
    source: '',
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (filters.eventKey) {
        params.append('eventKey', filters.eventKey);
      }
      if (filters.entityType) {
        params.append('entityType', filters.entityType);
      }
      if (filters.source) {
        params.append('source', filters.source);
      }
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/admin/marketing/events/logs?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch event logs');
      }

      const data: EventLogsResponse = await response.json();
      setEvents(data.events || []);
      setPagination((prev) => ({
        ...prev,
        ...(data.pagination || {}),
      }));
    } catch (error: any) {
      console.error('Error fetching event logs:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters.eventKey, filters.entityType, filters.source, pagination.page, pagination.limit]);

  // Fetch events when filters or pagination changes
  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.eventKey, filters.entityType, filters.source, pagination.page, pagination.limit]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Reset to page 1 when filters change
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRefresh = () => {
    fetchEvents();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Event Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Audit log untuk semua event marketing (read-only)
        </p>
      </div>

      {/* Filters */}
      <MarketingEventLogFilters
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* Table */}
      <MarketingEventLogTable
        events={events}
        pagination={pagination}
        loading={loading}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

