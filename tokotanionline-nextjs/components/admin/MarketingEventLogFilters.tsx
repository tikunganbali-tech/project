/**
 * STEP 22B-4 - MARKETING EVENT LOG FILTERS
 * 
 * Filter component for event logs
 * - Event key filter
 * - Entity type filter
 * - Source filter
 * - Manual refresh button
 */

'use client';

import { useState } from 'react';
import { RefreshCw, Filter } from 'lucide-react';

interface MarketingEventLogFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export interface FilterState {
  eventKey: string;
  entityType: string;
  source: string;
}

const ENTITY_TYPES = [
  { value: '', label: 'Semua Tipe' },
  { value: 'PRODUCT', label: 'Product' },
  { value: 'BLOG', label: 'Blog' },
  { value: 'PAGE', label: 'Page' },
  { value: 'CART', label: 'Cart' },
  { value: 'ORDER', label: 'Order' },
  { value: 'SEARCH', label: 'Search' },
];

const SOURCES = [
  { value: '', label: 'Semua Source' },
  { value: 'WEB', label: 'Web' },
  { value: 'ENGINE', label: 'Engine' },
  { value: 'ADMIN', label: 'Admin' },
];

export default function MarketingEventLogFilters({
  onFilterChange,
  onRefresh,
  loading = false,
}: MarketingEventLogFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    eventKey: '',
    entityType: '',
    source: '',
  });

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-700">Filter Event Log</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Event Key Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Event Key
          </label>
          <input
            type="text"
            placeholder="Cari event key..."
            value={filters.eventKey}
            onChange={(e) => handleFilterChange('eventKey', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Entity Type Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Tipe Entity
          </label>
          <select
            value={filters.entityType}
            onChange={(e) => handleFilterChange('entityType', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {SOURCES.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <div className="flex items-end">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

