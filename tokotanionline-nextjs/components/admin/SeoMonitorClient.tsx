/**
 * UI-C2 — SEO MONITOR CLIENT COMPONENT
 * 
 * Features:
 * - List semua konten (Blog & Product)
 * - Title, Primary Keyword, Status (READY/WARNING/RISK)
 * - Filter: all, ready, warning, risk
 * - Search: title, keyword
 * - Read-only (tidak bisa edit)
 */

'use client';

import { useState, useEffect } from 'react';
import { Eye, Loader2, AlertCircle, Search, Filter, CheckCircle, AlertTriangle, XCircle, FileText, Package } from 'lucide-react';

interface SeoMonitorItem {
  id: string;
  type: 'blog' | 'product';
  title: string;
  slug: string;
  primaryKeyword: string | null;
  secondaryKeywords: string[] | null;
  status: 'READY' | 'WARNING' | 'RISK';
  issues: string[];
  hasImage: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SeoMonitorResponse {
  success: boolean;
  items: SeoMonitorItem[];
  stats: {
    total: number;
    ready: number;
    warning: number;
    risk: number;
    readyPercent: number;
    warningPercent: number;
    riskPercent: number;
  };
  error?: string;
}

interface SeoMonitorClientProps {
  userRole: string;
}

type FilterOption = 'all' | 'ready' | 'warning' | 'risk';
type TypeFilter = 'all' | 'blog' | 'product';

export default function SeoMonitorClient({ userRole }: SeoMonitorClientProps) {
  const [items, setItems] = useState<SeoMonitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    ready: 0,
    warning: 0,
    risk: 0,
    readyPercent: 0,
    warningPercent: 0,
    riskPercent: 0,
  });

  // Fetch items on mount and when filters change
  useEffect(() => {
    fetchItems();
  }, [filter, typeFilter, searchTerm]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/admin/seo/monitor?${params.toString()}`);
      const data: SeoMonitorResponse = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch SEO data');
      }
      
      setItems(data.items);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load SEO data');
      console.error('Error fetching SEO data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'RISK':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'WARNING':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'RISK':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
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
            <p className="font-medium text-red-900">Error loading SEO data</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SEO Monitor</h1>
        <p className="text-gray-600">Read-only observability dashboard untuk melihat kondisi SEO konten</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Konten</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">READY</p>
              <p className="text-2xl font-bold text-green-900">{stats.ready}</p>
              <p className="text-xs text-green-600 mt-1">{stats.readyPercent}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">WARNING</p>
              <p className="text-2xl font-bold text-orange-900">{stats.warning}</p>
              <p className="text-xs text-orange-600 mt-1">{stats.warningPercent}%</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">RISK</p>
              <p className="text-2xl font-bold text-red-900">{stats.risk}</p>
              <p className="text-xs text-red-600 mt-1">{stats.riskPercent}%</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
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
              onClick={() => setFilter('ready')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === 'ready'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              READY
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === 'warning'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              WARNING
            </button>
            <button
              onClick={() => setFilter('risk')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === 'risk'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              RISK
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="all">All</option>
              <option value="blog">Blog</option>
              <option value="product">Product</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search title or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No content found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Primary Keyword</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Issues</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.type === 'blog' ? (
                        <FileText className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Package className="w-4 h-4 text-purple-600" />
                      )}
                      <span className="text-sm text-gray-700 capitalize">{item.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.primaryKeyword ? (
                      <span className="text-sm text-gray-900">{item.primaryKeyword}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Tidak ada</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.issues.length > 0 ? (
                      <div className="space-y-1">
                        {item.issues.map((issue, idx) => (
                          <p key={idx} className="text-xs text-gray-600">{issue}</p>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-green-600">✓ OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{formatDate(item.updatedAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
