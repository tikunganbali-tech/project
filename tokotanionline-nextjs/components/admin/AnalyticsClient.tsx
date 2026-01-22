'use client';

import { BarChart3, Eye, MessageCircle, ShoppingBag, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';

interface AnalyticsClientProps {
  stats: {
    totalProducts: number;
    totalBlogs: number;
    publishedBlogs: number;
    totalViews: number;
    whatsappClicks: number;
    marketplaceClicks: number;
  };
  topProducts: any[];
  recentEvents: any[];
}

export default function AnalyticsClient({ stats, topProducts, recentEvents }: AnalyticsClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
        <BarChart3 className="h-8 w-8 text-purple-600" />
        Analytics Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Page Views</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalViews}</p>
            </div>
            <Eye className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">WhatsApp Clicks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.whatsappClicks}</p>
            </div>
            <MessageCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Marketplace Clicks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.marketplaceClicks}</p>
            </div>
            <ShoppingBag className="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Blogs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalBlogs}</p>
            </div>
            <BarChart3 className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published Blogs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.publishedBlogs}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Top Products (by Views)</h2>
        {topProducts.length > 0 ? (
          <div className="space-y-2">
            {topProducts.map((product, idx) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-8">#{idx + 1}</span>
                  <Link
                    href={`/produk/${product.slug}`}
                    className="font-medium hover:text-green-600"
                  >
                    {product.name}
                  </Link>
                </div>
                <span className="text-sm text-gray-600">{product.views} views</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Belum ada data</p>
        )}
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentEvents.length > 0 ? (
            recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium">{event.eventType}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(event.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
                  </p>
                </div>
                {event.metadata && (
                  <span className="text-xs text-gray-500">
                    {JSON.parse(event.metadata).productName || JSON.parse(event.metadata).platform}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">Belum ada event</p>
          )}
        </div>
      </div>
    </div>
  );
}



