/**
 * STEP 18C-3: Engine Logs Panel (READ-ONLY)
 * - Auto-refresh: 30s
 * - Filter: INFO/WARN/ERROR
 * - Light pagination: limit selector (up to 500)
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

type EngineLog = {
  level: 'INFO' | 'WARN' | 'ERROR' | string;
  message: string;
  jobId?: string;
  timestamp: string;
};

type LogsResponse = {
  logs: EngineLog[];
  engineDown?: boolean;
  warning?: string;
};

function levelBadgeClass(level: string) {
  const base = 'px-2 py-1 rounded text-xs font-semibold';
  switch (level) {
    case 'ERROR':
      return `${base} bg-red-100 text-red-700`;
    case 'WARN':
      return `${base} bg-yellow-100 text-yellow-700`;
    case 'INFO':
      return `${base} bg-blue-100 text-blue-700`;
    default:
      return `${base} bg-gray-100 text-gray-700`;
  }
}

function safeLocaleTime(ts: string) {
  try {
    return new Date(ts).toLocaleString('id-ID');
  } catch {
    return ts;
  }
}

export default function EngineLogsClient() {
  const [logs, setLogs] = useState<EngineLog[]>([]);
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [limit, setLimit] = useState<number>(200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // FASE 1: Fetch logs DISABLED - tidak ada fetch ke engine
  const fetchLogs = async () => {
    // try {
    //   setError(null);
    //   const res = await fetch(`/api/admin/engine/logs?limit=${limit}`, {
    //     cache: 'no-store',
    //   });
    //
    //   if (!res.ok) {
    //     throw new Error('Failed to fetch logs');
    //   }
    //
    //   const data: LogsResponse = await res.json();
    //   setLogs(Array.isArray(data.logs) ? data.logs : []);
    //   setWarning(data.engineDown ? data.warning || 'Engine DOWN' : null);
    // } catch (err: any) {
    //   setLogs([]);
    //   setWarning('Engine DOWN');
    //   setError(err?.message || 'Failed to fetch logs');
    // } finally {
    //   setLoading(false);
    // }
    setLoading(false);
    setLogs([]);
    setError(null);
    setWarning(null);
  };

  useEffect(() => {
    // FASE 1: No fetch on mount
    fetchLogs();
    // Auto-refresh - DISABLED
    // const interval = setInterval(fetchLogs, 30000);
    // return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const filteredLogs = useMemo(() => {
    if (levelFilter === 'ALL') return logs;
    return logs.filter((l) => (l.level || 'INFO') === levelFilter);
  }, [logs, levelFilter]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Filter</span>
            <select
              className="border rounded-md px-2 py-1 text-sm"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
            >
              <option value="ALL">ALL</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Limit</span>
            <select
              className="border rounded-md px-2 py-1 text-sm"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Warning */}
      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-700" />
            <p className="text-sm text-yellow-900">{warning}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-700" />
            <p className="text-sm text-red-900">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-500 mt-2">Loading logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">Status: belum aktif</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log, idx) => (
                  <tr key={`${log.timestamp}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {safeLocaleTime(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={levelBadgeClass(log.level || 'INFO')}>
                        {log.level || 'INFO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.message || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.jobId ? (
                        <span className="font-mono text-gray-700">{log.jobId}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Read-only: tidak ada delete/edit/trigger dari panel ini.
      </p>
    </div>
  );
}


