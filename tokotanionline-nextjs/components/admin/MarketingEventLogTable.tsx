/**
 * STEP 22B-4 - MARKETING EVENT LOG TABLE
 * 
 * Read-only event log table
 * - Skeleton per row (non-blocking)
 * - Payload viewer (collapsed JSON)
 * - Empty state
 * - Pagination
 */

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Code2 } from 'lucide-react';

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

interface MarketingEventLogTableProps {
  events: EventLog[];
  pagination: Pagination;
  loading: boolean;
  onPageChange: (page: number) => void;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function sourceBadgeClass(source: string): string {
  const base = 'px-2 py-1 rounded text-xs font-semibold';
  switch (source) {
    case 'WEB':
      return `${base} bg-blue-100 text-blue-700`;
    case 'ENGINE':
      return `${base} bg-green-100 text-green-700`;
    case 'ADMIN':
      return `${base} bg-purple-100 text-purple-700`;
    default:
      return `${base} bg-gray-100 text-gray-700`;
  }
}

function PayloadViewer({ payload }: { payload: any }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(payload, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="border border-gray-200 rounded-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">
            Payload {expanded ? '(Expanded)' : '(Click to expand)'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-gray-200 p-3 bg-gray-50 relative">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <pre className="text-xs font-mono text-gray-800 overflow-x-auto max-h-96">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <tr className="border-b border-gray-200 animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-20 bg-gray-200 rounded w-full"></div>
      </td>
    </tr>
  );
}

export default function MarketingEventLogTable({
  events,
  pagination,
  loading,
  onPageChange,
}: MarketingEventLogTableProps) {
  // Empty state
  if (!loading && events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Code2 className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Tidak Ada Event Log
            </h3>
            <p className="text-sm text-gray-500">
              Belum ada event yang tercatat. Event akan muncul di sini saat terjadi aktivitas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Waktu
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Payload
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              // Skeleton loading per row
              <>
                <TableSkeleton />
                <TableSkeleton />
                <TableSkeleton />
                <TableSkeleton />
                <TableSkeleton />
              </>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {formatDate(event.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <span className="font-medium">{event.eventKey}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {event.entityType}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={sourceBadgeClass(event.source)}>
                      {event.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {event.entityId ? (
                      <span className="font-mono text-xs">{event.entityId}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <PayloadViewer payload={event.payload} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && events.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Menampilkan{' '}
            <span className="font-medium">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{' '}
            sampai{' '}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            dari <span className="font-medium">{pagination.total}</span> event
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Halaman {pagination.page} dari {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

