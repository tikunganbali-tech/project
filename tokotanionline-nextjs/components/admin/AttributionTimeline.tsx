/**
 * STEP 23C-2 — ATTRIBUTION TIMELINE (HOW)
 * 
 * Menampilkan alur kronologis perjalanan pelanggan
 * - Timeline vertikal sederhana
 * - Icon per event type
 * - Waktu relatif ("2 hari lalu")
 * - Non-technical labels
 */

'use client';

import { Eye, ShoppingCart, CheckCircle, Search, FileText, Loader2, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  eventKey: string;
  timestamp: string;
  entityId: string;
}

interface AttributionTimelineProps {
  timeline: TimelineEvent[];
  loading: boolean;
  error: string | null;
}

function eventIcon(eventKey: string) {
  switch (eventKey?.toLowerCase()) {
    case 'view_product':
    case 'viewcontent':
      return Eye;
    case 'add_to_cart':
    case 'addtocart':
      return ShoppingCart;
    case 'purchase':
    case 'completepayment':
      return CheckCircle;
    case 'search':
      return Search;
    case 'page_view':
    case 'pageview':
      return FileText;
    default:
      return FileText;
  }
}

function eventLabel(eventKey: string): string {
  switch (eventKey?.toLowerCase()) {
    case 'view_product':
    case 'viewcontent':
      return 'Melihat Produk';
    case 'add_to_cart':
    case 'addtocart':
      return 'Menambah ke Keranjang';
    case 'purchase':
    case 'completepayment':
      return 'Pembelian';
    case 'search':
      return 'Pencarian';
    case 'page_view':
    case 'pageview':
      return 'Melihat Halaman';
    default:
      return eventKey?.replace(/_/g, ' ') || 'Interaksi';
  }
}

function formatRelativeTime(timestamp: string): string {
  try {
    const eventTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - eventTime.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} hari lalu`;
    }
    if (diffHours > 0) {
      return `${diffHours} jam lalu`;
    }
    if (diffMinutes > 0) {
      return `${diffMinutes} menit lalu`;
    }
    return 'Baru saja';
  } catch {
    return timestamp;
  }
}

function TimelineSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 animate-pulse">
      <div className="h-5 w-48 bg-gray-200 rounded"></div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AttributionTimeline({ timeline, loading, error }: AttributionTimelineProps) {
  if (loading) {
    return <TimelineSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-amber-200 bg-amber-50 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 mb-1">Timeline Tidak Tersedia</h3>
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Perjalanan Pelanggan</h3>
        <div className="text-center py-8">
          <p className="text-sm text-gray-600">
            Belum ada data timeline untuk periode 7 hari terakhir.
          </p>
        </div>
      </div>
    );
  }

  // Sort timeline chronologically (oldest first)
  const sortedTimeline = [...timeline].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Perjalanan Pelanggan</h3>
      
      <div className="space-y-4">
        {sortedTimeline.map((event, index) => {
          const Icon = eventIcon(event.eventKey);
          const isLast = index === sortedTimeline.length - 1;
          
          return (
            <div key={`${event.timestamp}-${index}`} className="flex gap-4">
              {/* Timeline Line */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                {!isLast && (
                  <div className="w-0.5 h-full bg-gray-300 my-2 min-h-[60px]"></div>
                )}
              </div>

              {/* Event Details */}
              <div className="flex-1 pb-6">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {eventLabel(event.eventKey)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(event.timestamp)}
                  </p>
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  {event.entityId}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {sortedTimeline.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Total {sortedTimeline.length} interaksi dalam perjalanan pelanggan menuju konversi.
          </p>
        </div>
      )}
    </div>
  );
}
