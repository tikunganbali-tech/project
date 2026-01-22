'use client';

/**
 * NOTE LAYER MONITOR - READ-ONLY
 * 
 * UI hanya membaca dari NOTE layer
 * Tidak ada trigger engine
 * Polling ringan & stabil
 */

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

interface NoteStatus {
  lock: boolean;
  running_engine: string | null;
  last_engine: string | null;
  last_update: string | null;
}

interface NoteProgress {
  engine: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  started_at?: string;
  updated_at?: string;
  error?: string;
}

interface NoteMetrics {
  last_heartbeat: string | null;
  total_engines: number;
  active_engines: number;
  completed_tasks: number;
  failed_tasks: number;
  last_update: string | null;
}

interface NoteLog {
  timestamp: string;
  level: string;
  message: string;
}

const POLL_INTERVAL = 5000; // 5 seconds

export default function NoteLayerMonitor() {
  const [status, setStatus] = useState<NoteStatus | null>(null);
  const [progress, setProgress] = useState<Record<string, NoteProgress>>({});
  const [metrics, setMetrics] = useState<NoteMetrics | null>(null);
  const [logs, setLogs] = useState<Record<string, NoteLog[]>>({});
  const [selectedEngine, setSelectedEngine] = useState<string>('all');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Poll status
  const pollStatus = async () => {
    try {
      const res = await fetch('/api/admin/note/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  };

  // Poll progress
  const pollProgress = async () => {
    try {
      const res = await fetch('/api/admin/note/progress');
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch (error) {
      console.error('Error polling progress:', error);
    }
  };

  // Poll metrics
  const pollMetrics = async () => {
    try {
      const res = await fetch('/api/admin/note/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error polling metrics:', error);
    }
  };

  // Poll logs for selected engine
  const pollLogs = async (engineName: string) => {
    if (engineName === 'all') return;
    
    try {
      const res = await fetch(`/api/admin/note/logs?engine=${engineName}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLogs(prev => ({ ...prev, [engineName]: data.logs || [] }));
      }
    } catch (error) {
      console.error('Error polling logs:', error);
    }
  };

  // Main polling function
  const pollAll = async () => {
    await Promise.all([
      pollStatus(),
      pollProgress(),
      pollMetrics(),
    ]);
    
    if (selectedEngine !== 'all') {
      await pollLogs(selectedEngine);
    }
  };

  // Setup polling interval
  useEffect(() => {
    setMounted(true);
    setLastUpdate(new Date());
    pollAll(); // Initial poll
    
    const interval = setInterval(pollAll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedEngine]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Activity className="w-5 h-5 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const engines = ['content', 'image', 'smart-adset', 'output'];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">NOTE LAYER MONITOR</h1>
          <p className="text-gray-600 mt-1">Read-Only • Polling setiap {POLL_INTERVAL / 1000}s</p>
          <p className="text-xs text-gray-400 mt-1">
            Last update: {mounted && lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            status?.lock 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {status?.lock ? '🔒 LOCKED' : '✅ UNLOCKED'}
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Running Engine</div>
          <div className="text-2xl font-bold mt-1">
            {status?.running_engine || 'None'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Last Engine</div>
          <div className="text-2xl font-bold mt-1">
            {status?.last_engine || 'None'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Completed Tasks</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {metrics?.completed_tasks || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Failed Tasks</div>
          <div className="text-2xl font-bold mt-1 text-red-600">
            {metrics?.failed_tasks || 0}
          </div>
        </div>
      </div>

      {/* Engine Progress */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Engine Progress</h2>
        </div>
        <div className="p-4 space-y-4">
          {engines.map(engineName => {
            const engineProgress = progress[engineName];
            if (!engineProgress) {
              return (
                <div key={engineName} className="flex items-center gap-4">
                  <div className="w-32 font-medium capitalize">{engineName}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-gray-300 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                  <div className="w-24 text-sm text-gray-500">Idle</div>
                </div>
              );
            }

            return (
              <div key={engineName} className="flex items-center gap-4">
                <div className="w-32 font-medium capitalize flex items-center gap-2">
                  {getStatusIcon(engineProgress.status)}
                  {engineName}
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className={`h-2 rounded-full ${
                        engineProgress.status === 'completed' ? 'bg-green-500' :
                        engineProgress.status === 'failed' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${engineProgress.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{engineProgress.message}</div>
                </div>
                <div className="w-24 text-sm font-medium">
                  {engineProgress.progress}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Engine Logs</h2>
          <select
            value={selectedEngine}
            onChange={(e) => setSelectedEngine(e.target.value)}
            className="px-3 py-1 border rounded"
          >
            <option value="all">All Engines</option>
            {engines.map(engine => (
              <option key={engine} value={engine}>{engine}</option>
            ))}
          </select>
        </div>
        <div className="p-4">
          {selectedEngine === 'all' ? (
            <div className="text-gray-500 text-center py-8">
              Select an engine to view logs
            </div>
          ) : logs[selectedEngine]?.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs[selectedEngine].slice(-20).reverse().map((log, idx) => (
                <div key={idx} className="text-sm font-mono border-l-2 pl-2 py-1 border-gray-200">
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  <span className={`ml-2 px-1 rounded ${
                    log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                    log.level === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {log.level}
                  </span>
                  <span className="ml-2">{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No logs available for {selectedEngine}
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-4">System Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Last Heartbeat</div>
              <div className="text-lg font-medium mt-1">
                {mounted && metrics.last_heartbeat 
                  ? new Date(metrics.last_heartbeat).toLocaleTimeString()
                  : metrics.last_heartbeat ? '--:--:--' : 'Never'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Engines</div>
              <div className="text-lg font-medium mt-1">{metrics.total_engines}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Engines</div>
              <div className="text-lg font-medium mt-1">{metrics.active_engines}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-lg font-medium mt-1">
                {metrics.completed_tasks + metrics.failed_tasks > 0
                  ? Math.round((metrics.completed_tasks / (metrics.completed_tasks + metrics.failed_tasks)) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

