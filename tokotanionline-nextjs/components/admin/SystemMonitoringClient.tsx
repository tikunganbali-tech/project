/**
 * PHASE 6B — SYSTEM MONITORING CLIENT
 * 
 * Read-only monitoring page untuk system health
 * - Integration status
 * - Scheduler status
 * - Active alerts
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/permissions';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Clock, Activity } from 'lucide-react';

interface MonitoringData {
  integrations: any[];
  scheduler: {
    tasks: any[];
    summary: any;
  };
  alerts: any[];
  summary: {
    integrations: any;
    scheduler: any;
    alerts: any;
  };
}

export default function SystemMonitoringClient() {
  const { data: session, status: sessionStatus } = useSession();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const userRole = session?.user ? (session.user as any)?.role : null;
  const canView = userRole ? hasPermission(userRole, 'system.view') : false;

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system/monitoring');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Forbidden: Insufficient permissions');
        } else if (response.status === 401) {
          setError('Unauthorized: Please login again');
        } else {
          setError('Failed to load monitoring data');
        }
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
        setLastRefresh(new Date());
      } else {
        setError('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching monitoring data:', err);
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return;
    }

    if (sessionStatus === 'unauthenticated' || !session) {
      setError('Unauthorized: Please login');
      setLoading(false);
      return;
    }

    if (!canView) {
      setError('Insufficient permissions');
      setLoading(false);
      return;
    }

    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [canView, sessionStatus, session]);

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  if (!session || !canView) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error || 'You don\'t have permission to view this page.'}</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            {status}
          </span>
        );
      case 'ERROR':
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            {status}
          </span>
        );
      case 'NOT_CONFIGURED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3" />
            {status}
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Activity className="h-3 w-3 animate-pulse" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3" />
            WARNING
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <AlertCircle className="h-3 w-3" />
            INFO
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">System Monitoring</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Integrations Summary */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Integrations</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-sm font-semibold">{data.summary.integrations.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Connected</span>
              <span className="text-sm font-semibold text-green-600">
                {data.summary.integrations.connected}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Errors</span>
              <span className="text-sm font-semibold text-red-600">
                {data.summary.integrations.error}
              </span>
            </div>
          </div>
        </div>

        {/* Scheduler Summary */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Scheduler</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Enabled Tasks</span>
              <span className="text-sm font-semibold">
                {data.summary.scheduler.enabledTasks} / {data.summary.scheduler.totalTasks}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Running</span>
              <span className="text-sm font-semibold text-blue-600">
                {data.summary.scheduler.runningTasks}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Failed</span>
              <span className="text-sm font-semibold text-red-600">
                {data.summary.scheduler.failedTasks}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts Summary */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Alerts</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Critical</span>
              <span className="text-sm font-semibold text-red-600">
                {data.summary.alerts.critical}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Warning</span>
              <span className="text-sm font-semibold text-yellow-600">
                {data.summary.alerts.warning}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-sm font-semibold">{data.summary.alerts.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Status */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Integration Status</h3>
        </div>
        <div className="divide-y">
          {data.integrations.map((integration) => (
            <div key={integration.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-medium text-gray-900">{integration.name}</h4>
                    {getStatusBadge(integration.healthStatus)}
                    {!integration.isEnabled && (
                      <span className="text-xs text-gray-500">(Disabled)</span>
                    )}
                  </div>
                  {integration.healthMessage && (
                    <p className="text-xs text-gray-600 mt-1">{integration.healthMessage}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Last checked: {formatDate(integration.healthCheckedAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduler Tasks */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Scheduler Tasks</h3>
        </div>
        <div className="divide-y">
          {data.scheduler.tasks.map((task) => (
            <div key={task.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-medium text-gray-900">{task.name}</h4>
                  {getStatusBadge(task.status)}
                  {!task.enabled && (
                    <span className="text-xs text-gray-500">(Disabled)</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 mt-2">
                <div>
                  <span className="font-medium">Interval:</span> {task.intervalMinutes} min
                </div>
                <div>
                  <span className="font-medium">Last Run:</span> {formatDate(task.lastRunAt)}
                </div>
                <div>
                  <span className="font-medium">Next Run:</span> {formatDate(task.nextRunAt)}
                </div>
                <div>
                  <span className="font-medium">Success Rate:</span>{' '}
                  {task.runCount > 0
                    ? Math.round((task.successCount / task.runCount) * 100)
                    : 0}
                  %
                </div>
              </div>
              {task.lastError && (
                <p className="text-xs text-red-600 mt-2">Error: {task.lastError}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-base font-semibold text-gray-900">Active Alerts</h3>
          </div>
          <div className="divide-y">
            {data.alerts.map((alert) => (
              <div key={alert.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      {getSeverityBadge(alert.severity)}
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(alert.createdAt)} • {alert.sourceType}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
