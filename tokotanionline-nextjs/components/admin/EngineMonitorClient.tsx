'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap
} from 'lucide-react';

interface EngineHealth {
  id: string;
  engineName: string;
  status: 'healthy' | 'warning' | 'critical';
  isActive: boolean; // Engine aktif atau tidak
  lastRunAt: Date | null; // Kapan terakhir jalan
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastResult: string | null; // Apa hasil terakhirnya
  lastDataProcessed: number; // Jumlah data processed terakhir
  totalDataProcessed: number; // Total data processed
  successCount: number;
  warningCount: number;
  failureCount: number;
  errorRate: number;
  avgExecutionTime: number | null;
  lastError: string | null;
  // Auto-fix tracking
  autoFixApplied: boolean;
  lastAutoFixAt: Date | null;
  autoFixCount: number;
  lastAutoFixType: string | null;
  autoFixSuccess: boolean | null;
  recentLogs?: EngineLog[];
  activeAlerts?: Array<{
    id: string;
    alertType: string;
    title: string;
    message: string;
    createdAt: Date;
  }>;
}

interface EngineLog {
  id: string;
  engineName: string;
  moduleName: string | null;
  actionType: string;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  status: 'RUN' | 'UPDATE' | 'ERROR'; // Display format
  message: string;
  metadata: string | null;
  dataProcessedCount: number; // Number of items/data processed
  executedAt: Date; // Timestamp
  executionTime: number | null;
  error: string | null;
}

interface EngineAlert {
  id: string;
  engineName: string;
  alertType: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: Date;
}

interface Stats {
  totalEngines: number;
  healthy: number;
  warning: number;
  critical: number;
  totalLogs: number;
  activeAlerts: number;
}

interface EngineMonitorClientProps {
  engineHealth: EngineHealth[];
  recentLogs: EngineLog[];
  activeAlerts: EngineAlert[];
  stats: Stats;
}

export default function EngineMonitorClient({
  engineHealth: initialHealth,
  recentLogs: initialLogs,
  activeAlerts: initialAlerts,
  stats: initialStats,
}: EngineMonitorClientProps) {
  const [engineHealth, setEngineHealth] = useState(initialHealth);
  const [logs, setLogs] = useState(initialLogs);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [stats, setStats] = useState(initialStats);
  const [selectedEngine, setSelectedEngine] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/engines/monitor?hours=24&limit=100');
      const data = await response.json();
      if (data.success && data.data) {
        setEngineHealth(data.data.engines || []);
        setLogs(data.data.timeline || []);
        setAlerts(data.data.engines?.flatMap((e: any) => e.activeAlerts || []) || []);
        setStats(data.data.summary || {
          totalEngines: 0,
          healthyEngines: 0,
          warningEngines: 0,
          criticalEngines: 0,
          activeAlerts: 0,
          totalLogs: 0,
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/admin/engines/alerts/${alertId}/acknowledge`, { method: 'POST' });
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, status: 'acknowledged' as const } : a));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
      case 'RUN':
        return 'text-green-600 bg-green-50';
      case 'warning':
      case 'UPDATE':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
      case 'failed':
      case 'ERROR':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
      case 'RUN':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
      case 'UPDATE':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
      case 'failed':
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (selectedEngine !== 'all' && log.engineName !== selectedEngine) return false;
    if (selectedStatus !== 'all' && log.status !== selectedStatus) return false;
    return true;
  });

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('id-ID');
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Engine Monitor</h1>
          <p className="text-gray-600 mt-1">Full observability for all automation engines</p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Total Engines</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalEngines || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-green-200">
          <div className="text-sm text-gray-600">Healthy</div>
          <div className="text-2xl font-bold text-green-600">{stats?.healthy || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-gray-600">Warning</div>
          <div className="text-2xl font-bold text-yellow-600">{stats?.warning || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-red-200">
          <div className="text-sm text-gray-600">Critical</div>
          <div className="text-2xl font-bold text-red-600">{stats?.critical || 0}</div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-red-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Active Alerts ({alerts.length})
            </h2>
          </div>
          <div className="divide-y">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{alert.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {formatDate(alert.createdAt)} • {alert.engineName}
                    </div>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engine Health Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Engine Health Status</h2>
        </div>
        <div className="divide-y">
          {engineHealth.map((engine) => (
            <div key={engine.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(engine.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-gray-900">{engine.engineName}</div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        engine.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {engine.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div>
                        <span className="font-medium">Last run:</span> {formatDate(engine.lastRunAt)}
                      </div>
                      <div>
                        <span className="font-medium">Last success:</span>{' '}
                        <span className={engine.lastSuccessAt ? 'text-green-600' : 'text-gray-400'}>
                          {formatDate(engine.lastSuccessAt)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Last failure:</span>{' '}
                        <span className={engine.lastFailureAt ? 'text-red-600' : 'text-gray-400'}>
                          {formatDate(engine.lastFailureAt)}
                        </span>
                      </div>
                      {engine.autoFixApplied && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-800">Auto-fix Applied</span>
                          </div>
                          <div className="text-xs text-blue-700 mt-1">
                            <div>Last auto-fix: {formatDate(engine.lastAutoFixAt)}</div>
                            <div>Type: {engine.lastAutoFixType || 'N/A'}</div>
                            <div>
                              Status:{' '}
                              <span className={engine.autoFixSuccess ? 'text-green-600' : 'text-red-600'}>
                                {engine.autoFixSuccess === true ? 'Success' : engine.autoFixSuccess === false ? 'Failed' : 'Unknown'}
                              </span>
                            </div>
                            <div>Total auto-fixes: {engine.autoFixCount}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    {engine.lastResult && (
                      <div className="text-sm text-gray-700 mt-1 bg-blue-50 p-2 rounded">
                        <span className="font-medium">Last result:</span> {engine.lastResult.substring(0, 150)}
                      </div>
                    )}
                    {engine.lastDataProcessed > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Data processed: <span className="font-semibold">{engine.lastDataProcessed.toLocaleString()}</span>
                        {engine.totalDataProcessed > 0 && (
                          <span> • Total: <span className="font-semibold">{engine.totalDataProcessed.toLocaleString()}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-gray-600">
                    <span className="text-green-600 font-semibold">{engine.successCount}</span> success
                  </div>
                  <div className="text-gray-600">
                    <span className="text-yellow-600 font-semibold">{engine.warningCount}</span> warnings
                  </div>
                  <div className="text-gray-600">
                    <span className="text-red-600 font-semibold">{engine.failureCount}</span> failures
                  </div>
                  {engine.avgExecutionTime && (
                    <div className="text-gray-600">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {formatDuration(engine.avgExecutionTime)} avg
                    </div>
                  )}
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(engine.status)}`}>
                    {engine.status}
                  </div>
                </div>
              </div>
              {engine.lastError && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  Last error: {engine.lastError.substring(0, 200)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline of Engine Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Timeline of Engine Activity</h2>
            <div className="flex gap-2">
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Engines</option>
                {Array.from(new Set(logs.map(l => l.engineName))).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <span className="font-semibold text-gray-900">{log.engineName}</span>
                    {log.moduleName && (
                      <span className="text-xs text-gray-500">• {log.moduleName}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{log.message}</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(log.executedAt)}
                    </span>
                    {log.executionTime && (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {formatDuration(log.executionTime)}
                      </span>
                    )}
                    {log.dataProcessedCount > 0 && (
                      <span className="font-semibold text-blue-600">
                        Data: {log.dataProcessedCount.toLocaleString()}
                      </span>
                    )}
                    {log.relatedEntityId && (
                      <span>Entity: {log.relatedEntityType}/{log.relatedEntityId.substring(0, 8)}</span>
                    )}
                  </div>
                  {log.error && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      Error: {log.error.substring(0, 300)}
                    </div>
                  )}
                </div>
                {(log.metadata || log.error) && (
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedLogs);
                      if (newExpanded.has(log.id)) {
                        newExpanded.delete(log.id);
                      } else {
                        newExpanded.add(log.id);
                      }
                      setExpandedLogs(newExpanded);
                    }}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                  >
                    {expandedLogs.has(log.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
              {expandedLogs.has(log.id) && log.metadata && (
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                  <pre>{JSON.stringify(JSON.parse(log.metadata), null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}






