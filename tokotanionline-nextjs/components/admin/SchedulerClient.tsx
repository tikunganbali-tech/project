/**
 * FASE 4 — SCHEDULER CLIENT
 * 
 * Admin UI untuk kontrol scheduler automation
 * - ON/OFF toggle
 * - Status view (last run, today count, status)
 * - Settings (daily quota, time windows)
 * - Recent runs log
 */

'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Play, Pause, RefreshCw, CheckCircle, XCircle, Loader, Settings, Power } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface SchedulerConfig {
  id: string;
  enabled: boolean;
  timezone: string;
  dailyQuota: number;
  runWindows: string[];
  contentMix: { blog: number; product: number } | string;
}

interface SchedulerStatus {
  enabled: boolean;
  lastRun: {
    runId: string;
    date: string;
    status: string;
    executedCount: number;
    plannedCount: number;
    startedAt: string;
    finishedAt: string | null;
  } | null;
  todayCount: number;
  todayRuns: number;
  quota: number;
  quotaRemaining: number;
  status: 'running' | 'idle' | 'disabled';
  message: string;
}

interface SchedulerRun {
  id: string;
  runId: string;
  date: string;
  plannedCount: number;
  executedCount: number;
  status: string;
  log: any;
  startedAt: string;
  finishedAt: string | null;
}

export default function SchedulerClient() {
  const [config, setConfig] = useState<SchedulerConfig | null>(null);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [runs, setRuns] = useState<SchedulerRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dailyQuota, setDailyQuota] = useState(3);
  const [runWindows, setRunWindows] = useState<string[]>(['09:00-21:00']);

  // Load data
  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load config
      const configRes = await fetch('/api/admin/scheduler/config');
      const configData = await configRes.json();
      if (configData.success) {
        setConfig(configData.config);
        setDailyQuota(configData.config.dailyQuota);
        setRunWindows(configData.config.runWindows || ['09:00-21:00']);
      }

      // Load status
      const statusRes = await fetch('/api/admin/scheduler/status');
      const statusData = await statusRes.json();
      if (statusData.success) {
        setStatus(statusData.status);
      }

      // Load runs
      const runsRes = await fetch('/api/admin/scheduler/runs?limit=20');
      const runsData = await runsRes.json();
      if (runsData.success) {
        setRuns(runsData.runs);
      }
    } catch (error) {
      console.error('Failed to load scheduler data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleScheduler = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/scheduler/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !config.enabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        await loadData();
      } else {
        alert('Gagal mengupdate scheduler');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/scheduler/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyQuota,
          runWindows,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        setShowSettings(false);
        await loadData();
      } else {
        alert('Gagal menyimpan settings');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Loader className="h-4 w-4 text-yellow-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-8 w-8 text-blue-600" />
          Scheduler & Automation
        </h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Control Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Scheduler Control</h2>
            <p className="text-sm text-gray-600">
              {status?.message || 'Scheduler status'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Status</div>
              <div className={`text-lg font-semibold ${
                status?.status === 'running' ? 'text-yellow-600' :
                status?.status === 'idle' ? 'text-green-600' :
                'text-gray-600'
              }`}>
                {status?.status === 'running' ? 'Running' :
                 status?.status === 'idle' ? 'Idle' :
                 'Disabled'}
              </div>
            </div>
            <button
              onClick={toggleScheduler}
              disabled={saving || !config}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                config?.enabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50`}
            >
              <Power className="h-5 w-5" />
              {config?.enabled ? 'Turn OFF' : 'Turn ON'}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
            >
              <Settings className="h-5 w-5" />
              Settings
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Today's Count</div>
            <div className="text-2xl font-bold text-blue-900">
              {status?.todayCount || 0}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              of {status?.quota || 0} quota
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 mb-1">Quota Remaining</div>
            <div className="text-2xl font-bold text-green-900">
              {status?.quotaRemaining || 0}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">Today's Runs</div>
            <div className="text-2xl font-bold text-purple-900">
              {status?.todayRuns || 0}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Last Run</div>
            <div className="text-sm font-semibold text-gray-900">
              {status?.lastRun
                ? format(new Date(status.lastRun.startedAt), 'HH:mm', { locale: id })
                : 'Never'}
            </div>
            {status?.lastRun && (
              <div className="text-xs text-gray-500 mt-1">
                {status.lastRun.executedCount} executed
              </div>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Scheduler Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Quota (3-5 recommended)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={dailyQuota}
                  onChange={(e) => setDailyQuota(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Windows (e.g., 09:00-21:00)
                </label>
                <div className="space-y-2">
                  {runWindows.map((window, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={window}
                        onChange={(e) => {
                          const newWindows = [...runWindows];
                          newWindows[idx] = e.target.value;
                          setRunWindows(newWindows);
                        }}
                        placeholder="09:00-21:00"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      {runWindows.length > 1 && (
                        <button
                          onClick={() => setRunWindows(runWindows.filter((_, i) => i !== idx))}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setRunWindows([...runWindows, '09:00-21:00'])}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                  >
                    + Add Window
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Runs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Runs</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {runs.length > 0 ? (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(run.status)}
                    <span className="font-medium">{run.runId}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(run.startedAt), 'd MMM yyyy, HH:mm:ss', { locale: id })}
                    {run.finishedAt && (
                      <span className="ml-2">
                        - {format(new Date(run.finishedAt), 'HH:mm:ss', { locale: id })}
                      </span>
                    )}
                  </div>
                  {run.log && typeof run.log === 'object' && run.log.topic && (
                    <div className="text-xs text-gray-500 mt-1">
                      Topic: {run.log.topic} | Type: {run.log.type || 'blog'}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 text-xs rounded-full ${
                    run.status === 'done'
                      ? 'bg-green-100 text-green-800'
                      : run.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : run.status === 'running'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {run.status}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {run.executedCount}/{run.plannedCount} executed
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No runs yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
