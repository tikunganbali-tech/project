/**
 * FASE 2 — ENGINE STATUS CLIENT
 * 
 * Read-only panel untuk menampilkan:
 * - State: idle | running | error
 * - Last run
 * - Message
 */

'use client';

import { useState, useEffect } from 'react';
import { Activity, Clock, Server, AlertCircle, Play } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface EngineStatus {
  state: 'idle' | 'running' | 'error';
  lastRunAt: string | null;
  message: string;
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 10) {
      return 'Just now';
    }
    if (diffSec < 60) {
      return `${diffSec}s ago`;
    }
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
      return `${diffHour}h ago`;
    }
    
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

export default function EngineStatusClient() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const isSuperAdmin = (session?.user as any)?.role === 'super_admin';

  // Fetch status from FASE 2 endpoint
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/engine/status', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch engine status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching status:', err);
      setError(err.message || 'Failed to fetch status');
      // Fail-safe: set default status
      setStatus({
        state: 'idle',
        lastRunAt: null,
        message: 'Engine ready',
      });
    } finally {
      setLoading(false);
    }
  };

  // Run engine
  const handleRunEngine = async () => {
    if (!isSuperAdmin) {
      setError('Only super_admin can run engine');
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (status?.state === 'running') {
      setError('Engine is already running');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setRunning(true);
      setError(null);

      const response = await fetch('/api/engine/run', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run engine');
      }

      // Refresh status after starting
      setTimeout(() => {
        fetchStatus();
        setRunning(false);
      }, 1000);
    } catch (err: any) {
      console.error('Error running engine:', err);
      setError(err.message || 'Failed to run engine');
      setRunning(false);
      setTimeout(() => setError(null), 5000);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 5 seconds (non-aggressive)
    const interval = setInterval(() => {
      if (status?.state !== 'running') {
        fetchStatus();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // More frequent refresh when running
  useEffect(() => {
    if (status?.state === 'running') {
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [status?.state]);

  const isRunning = status?.state === 'running';
  const isError = status?.state === 'error';

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          <span className="text-gray-600">Loading engine status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="space-y-6">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-6 h-6 text-gray-700" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Engine Status
                </h2>
                <p className="text-sm text-gray-500">FASE 2 — Engine Visibility</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isRunning ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-yellow-600 font-semibold">RUNNING</span>
                </>
              ) : isError ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-red-600 font-semibold">ERROR</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-green-600 font-semibold">IDLE</span>
                </>
              )}
            </div>
          </div>

          {/* Status Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* State */}
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase">State</span>
              </div>
              <p className="text-lg font-bold text-gray-900 uppercase">
                {status?.state || 'IDLE'}
              </p>
            </div>

            {/* Last Run */}
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase">Last Run</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {status?.lastRunAt ? formatTimestamp(status.lastRunAt) : 'Never'}
              </p>
              {status?.lastRunAt && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(status.lastRunAt).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="rounded-lg border p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-600 uppercase">Message</span>
            </div>
            <p className="text-sm text-blue-900">
              {status?.message || 'Engine ready'}
            </p>
          </div>

          {/* Control Button */}
          {isSuperAdmin && (
            <div className="pt-4 border-t">
              <button
                onClick={handleRunEngine}
                disabled={running || isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running || isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Jalankan Engine
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
