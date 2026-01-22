'use client';

import { useEffect, useState } from 'react';
import ActivityItem from './ActivityItem';
import { RefreshCw } from 'lucide-react';

interface Activity {
  id: string;
  type: 'system' | 'content' | 'product' | 'engine';
  category: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

type FilterType = 'all' | 'system' | 'content' | 'product' | 'engine';

export default function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const limit = 20;

  async function fetchActivities(currentFilter: FilterType, currentPage: number) {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/activity?filter=${currentFilter}&page=${currentPage}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchActivities(filter, page);
  }, [filter, page]);

  function handleRefresh() {
    setRefreshing(true);
    fetchActivities(filter, page);
  }

  function handleFilterChange(newFilter: FilterType) {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filter & Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'system', 'content', 'product', 'engine'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'system' ? 'Sistem' : f === 'content' ? 'Konten' : f === 'product' ? 'Produk' : 'Engine'}
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse border-l-4 border-gray-300">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && activities.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-sm text-yellow-800">Belum ada aktivitas</p>
        </div>
      )}

      {/* Activity List */}
      {!loading && activities.length > 0 && (
        <>
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                id={activity.id}
                type={activity.type}
                category={activity.category}
                title={activity.title}
                description={activity.description}
                timestamp={activity.timestamp}
                metadata={activity.metadata}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              
              <span className="px-4 py-2 text-sm text-gray-600">
                Halaman {page} dari {totalPages}
              </span>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

