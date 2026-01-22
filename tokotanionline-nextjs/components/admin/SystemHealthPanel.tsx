/**
 * STEP 21-4 - System Health Panel
 * 
 * Dashboard kecil "System Health" (read-only)
 */

'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    nextjs: { status: 'ok' | 'error'; message: string };
    database: { status: 'ok' | 'error'; message: string; responseTime?: number };
    engineHub: { status: 'ok' | 'error'; message: string };
  };
  timestamp: string;
}

export default function SystemHealthPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/health', {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCheckIcon = (checkStatus: string) => {
    return checkStatus === 'ok' ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh health status"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !health ? (
        <div className="text-center py-8 text-gray-500">Loading health status...</div>
      ) : health ? (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className={`border-2 rounded-lg p-4 flex items-center gap-3 ${getStatusColor(health.status)}`}>
            {getStatusIcon(health.status)}
            <div>
              <p className="font-semibold">System Status: {health.status.toUpperCase()}</p>
              {lastUpdated && (
                <p className="text-xs opacity-75 mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Individual Checks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {getCheckIcon(health.checks.nextjs.status)}
                <span className="text-sm font-medium">Next.js</span>
              </div>
              <span className="text-xs text-gray-600">{health.checks.nextjs.message}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {getCheckIcon(health.checks.database.status)}
                <span className="text-sm font-medium">Database</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-600">{health.checks.database.message}</span>
                {health.checks.database.responseTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    {health.checks.database.responseTime}ms
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {getCheckIcon(health.checks.engineHub.status)}
                <span className="text-sm font-medium">Engine Hub</span>
              </div>
              <span className="text-xs text-gray-600">{health.checks.engineHub.message}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">Unable to fetch health status</div>
      )}
    </div>
  );
}
