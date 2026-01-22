/**
 * UI-B1: Engine Status Monitor Client
 * 
 * Real-time engine status display with polling (10-15 seconds)
 */

'use client';

import { useEffect, useState } from 'react';

interface EngineStatus {
  engineStatus: 'RUNNING' | 'STOPPED';
  lastHeartbeat: string | null;
  uptime: string;
  schedulerWorker: 'ACTIVE' | 'IDLE';
  queue: {
    pending: number;
    processing: number;
    done: number;
    failed: number;
  };
  paused: boolean;
  timestamp: string;
}

export default function EngineStatusMonitorClient() {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/engine', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch engine status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching engine status:', err);
      setError(err.message || 'Failed to fetch engine status');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!status) return;

    setPausing(true);
    try {
      const response = await fetch('/api/admin/engine/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paused: !status.paused,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update pause status');
      }

      // Refresh status
      await fetchStatus();
    } catch (err: any) {
      console.error('Error updating pause status:', err);
      setError(err.message || 'Failed to update pause status');
    } finally {
      setPausing(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Poll every 12 seconds (between 10-15 as specified)
    const interval = setInterval(fetchStatus, 12000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          <span className="text-gray-600">Memuat status engine...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-red-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-red-600">⚠️ {error}</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const isRunning = status.engineStatus === 'RUNNING';
  const isPaused = status.paused;

  return (
    <div className="space-y-6">
      {/* Engine Status Card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Engine Status</h2>
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                isRunning && !isPaused ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {isPaused ? 'PAUSED' : status.engineStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-500">Last Heartbeat</p>
            <p className="text-sm font-medium text-gray-900">
              {status.lastHeartbeat
                ? new Date(status.lastHeartbeat).toLocaleString('id-ID')
                : 'Tidak ada'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Uptime</p>
            <p className="text-sm font-medium text-gray-900">{status.uptime}</p>
          </div>
        </div>

        {/* Pause/Resume Button */}
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={handlePauseResume}
            disabled={pausing}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isPaused
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {pausing
              ? 'Memproses...'
              : isPaused
              ? '▶ Resume Engine'
              : '⏸ Pause Engine'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            {isPaused
              ? 'Engine di-pause. Job baru tidak akan diproses.'
              : 'Engine aktif. Job baru akan diproses normal.'}
          </p>
        </div>
      </div>

      {/* Scheduler Worker Status */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Scheduler Worker
        </h2>
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              status.schedulerWorker === 'ACTIVE' ? 'bg-blue-500' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {status.schedulerWorker}
          </span>
        </div>
      </div>

      {/* Queue Summary */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Queue Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {status.queue.pending}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Processing</p>
            <p className="text-2xl font-bold text-blue-600">
              {status.queue.processing}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Done (Hari Ini)</p>
            <p className="text-2xl font-bold text-green-600">
              {status.queue.done}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {status.queue.failed}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
