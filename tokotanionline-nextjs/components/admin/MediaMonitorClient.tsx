/**
 * UI-C1 — MEDIA MONITOR CLIENT COMPONENT
 * 
 * Features:
 * - List semua media dengan thumbnail
 * - Source: MANUAL | AI_GENERATED | SCHEDULER
 * - Digunakan di: Blog (judul) | Product (nama)
 * - Status: USED | ORPHAN
 * - Created At
 * - Filter: all, used, orphan, source
 * - Read-only (tidak bisa edit/upload/generate)
 */

'use client';

import { useState, useEffect } from 'react';
import { Eye, Loader2, AlertCircle, Image as ImageIcon, Filter, Search, Tag } from 'lucide-react';
import Image from 'next/image';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface MediaMonitorItem {
  id: string;
  url: string;
  filename: string;
  thumbnail: string;
  size: number;
  createdAt: string;
  source: 'MANUAL' | 'AI_GENERATED' | 'SCHEDULER' | 'UNKNOWN';
  usedIn: Array<{
    type: 'blog' | 'product';
    id: string;
    title: string;
  }>;
  status: 'USED' | 'ORPHAN';
}

interface MediaMonitorResponse {
  success: boolean;
  media: MediaMonitorItem[];
  stats: {
    total: number;
    used: number;
    orphan: number;
  };
  error?: string;
}

interface MediaMonitorClientProps {
  userRole: string;
}

type FilterOption = 'all' | 'used' | 'orphan';
type SourceFilter = 'all' | 'MANUAL' | 'AI_GENERATED' | 'SCHEDULER';

export default function MediaMonitorClient({ userRole }: MediaMonitorClientProps) {
  const [media, setMedia] = useState<MediaMonitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, used: 0, orphan: 0 });

  // Fetch media on mount and when filters change
  useEffect(() => {
    fetchMedia();
  }, [filter, sourceFilter, searchTerm]);

  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/admin/media/monitor?${params.toString()}`);
      const data: MediaMonitorResponse = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch media');
      }
      
      setMedia(data.media);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load media');
      console.error('Error fetching media:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'AI_GENERATED':
        return 'bg-blue-100 text-blue-700';
      case 'SCHEDULER':
        return 'bg-purple-100 text-purple-700';
      case 'MANUAL':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-medium text-red-900">Error loading media</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Media Monitor</h1>
        <p className="text-gray-600">Read-only observability dashboard untuk melihat kondisi media</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Media</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">USED</p>
              <p className="text-2xl font-bold text-green-900">{stats.used}</p>
            </div>
            <Tag className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">ORPHAN</p>
              <p className="text-2xl font-bold text-orange-900">{stats.orphan}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('used')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === 'used'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              USED
            </button>
            <button
              onClick={() => setFilter('orphan')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === 'orphan'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ORPHAN
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-gray-700">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="all">All</option>
              <option value="MANUAL">Manual</option>
              <option value="AI_GENERATED">AI Generated</option>
              <option value="SCHEDULER">Scheduler</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {media.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No media found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-lg overflow-hidden transition ${
                item.status === 'ORPHAN'
                  ? 'border-orange-300 hover:border-orange-400'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-100">
                <Image
                  src={normalizeImageSrc(item.thumbnail)}
                  alt={item.filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'USED'
                        ? 'bg-green-600 text-white'
                        : 'bg-orange-600 text-white'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-900 truncate" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatFileSize(item.size)}</p>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSourceBadgeColor(item.source)}`}>
                    {item.source}
                  </span>
                </div>

                {item.usedIn.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-600 mb-1">Digunakan di:</p>
                    <div className="space-y-1">
                      {item.usedIn.slice(0, 2).map((usage, idx) => (
                        <div key={idx} className="text-xs text-gray-700 truncate">
                          <span className="font-medium">{usage.type}:</span> {usage.title}
                        </div>
                      ))}
                      {item.usedIn.length > 2 && (
                        <p className="text-xs text-gray-500">+{item.usedIn.length - 2} lainnya</p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  {formatDate(item.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
