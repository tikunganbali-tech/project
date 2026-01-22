'use client';

/**
 * Admin Dashboard Client Component
 * Fetches live data from dashboard API endpoints
 */

import { useEffect, useState } from 'react';

interface SummaryData {
  total_products: number;
  products_published: number;
  total_posts: number;
  posts_published: number;
  drafts_count: number;
  last_publish_at: string | null;
}

interface Activity {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: any;
  created_at: string;
}

interface EngineStatus {
  AI: { status: 'UP' | 'DOWN'; last_ok_at: string | null; reason?: string };
  SEO: { status: 'UP' | 'DOWN'; last_ok_at: string | null; reason?: string };
  Ads: { status: 'UP' | 'DOWN'; last_ok_at: string | null; reason?: string };
  Scheduler?: { status: 'PAUSED' | 'RUNNING' | 'STOPPED'; last_action?: string; last_action_at?: string | null };
  cached_until: string;
}

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metadata?: any;
}

export default function DashboardClient() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [engines, setEngines] = useState<EngineStatus | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [summaryRes, activityRes, enginesRes, alertsRes] = await Promise.all([
        fetch('/api/admin/dashboard/summary').catch(() => null),
        fetch('/api/admin/dashboard/activity?limit=10').catch(() => null),
        fetch('/api/admin/dashboard/engines').catch(() => null),
        fetch('/api/admin/dashboard/alerts').catch(() => null),
      ]);

      if (summaryRes?.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      } else if (summaryRes && !summaryRes.ok) {
        const err = await summaryRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load summary');
      }

      if (activityRes?.ok) {
        const data = await activityRes.json();
        setActivities(data.activities || []);
      }

      if (enginesRes?.ok) {
        const data = await enginesRes.json();
        setEngines(data);
      }

      if (alertsRes?.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString('id-ID', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch {
      return dateString;
    }
  };

  if (loading && !summary) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Summary Cards */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Platform Snapshot</h2>
        {summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-3xl font-bold text-gray-900">{summary.total_products}</div>
              <div className="text-sm text-gray-500 mt-1">Total Produk</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{summary.products_published}</div>
              <div className="text-sm text-gray-500 mt-1">Produk Published</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-3xl font-bold text-gray-900">{summary.total_posts}</div>
              <div className="text-sm text-gray-500 mt-1">Total Artikel</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{summary.posts_published}</div>
              <div className="text-sm text-gray-500 mt-1">Artikel Published</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-600">{summary.drafts_count}</div>
              <div className="text-sm text-gray-500 mt-1">Drafts</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-lg font-bold text-gray-900">
                {formatDate(summary.last_publish_at)}
              </div>
              <div className="text-sm text-gray-500 mt-1">Last Publish</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Loading summary...</div>
        )}
      </section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Alerts & Warnings</h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'border-red-300 bg-red-50'
                    : alert.severity === 'warning'
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-blue-300 bg-blue-50'
                }`}
              >
                <div className="font-semibold text-gray-900">{alert.title}</div>
                <div className="text-sm text-gray-700 mt-1">{alert.message}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Engine Status */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Engine Status</h2>
        {engines ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['AI', 'SEO', 'Ads'] as const).map((engineName) => {
              const engine = engines[engineName];
              const isUp = engine.status === 'UP';
              return (
                <div key={engineName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{engineName}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        isUp
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {engine.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {isUp ? (
                      <>Last OK: {formatRelativeTime(engine.last_ok_at || '')}</>
                    ) : (
                      <>{engine.reason || 'Unknown issue'}</>
                    )}
                  </div>
                  {engine.last_ok_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(engine.last_ok_at)}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Scheduler Status */}
            {engines.Scheduler && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Scheduler</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      engines.Scheduler.status === 'RUNNING'
                        ? 'bg-green-100 text-green-800'
                        : engines.Scheduler.status === 'PAUSED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {engines.Scheduler.status}
                  </span>
                </div>
                {engines.Scheduler.last_action && (
                  <div className="text-sm text-gray-600 mb-1">
                    {engines.Scheduler.last_action}
                  </div>
                )}
                {engines.Scheduler.last_action_at && (
                  <div className="text-xs text-gray-500">
                    {formatRelativeTime(engines.Scheduler.last_action_at)}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">Loading engine status...</div>
        )}
      </section>

      {/* Activity Feed */}
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
        {activities.length > 0 ? (
          <ul className="space-y-2">
            {activities.map((activity) => (
              <li key={activity.id} className="text-sm text-gray-700 border-b pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{activity.actor_name}</span>
                    {' — '}
                    <span className="text-gray-600">{activity.action}</span>
                    {activity.entity_type && activity.entity_id && (
                      <>
                        {' '}
                        <span className="text-gray-500">
                          ({activity.entity_type} #{activity.entity_id.slice(0, 8)})
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No recent activity.</p>
        )}
      </section>
    </div>
  );
}
