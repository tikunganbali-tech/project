/**
 * SEO TITAN MODE - Admin Dashboard Client Component
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Play, 
  Pause,
  RefreshCw,
  Eye,
  Settings,
  BarChart3,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Globe,
  Search,
  Zap,
  Shield,
  Clock
} from 'lucide-react';

interface EngineStatus {
  id: string;
  engineName: string;
  isEnabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  healthScore: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  avgExecutionTime: number | null;
  lastErrorMessage: string | null;
}

interface EngineLog {
  id: string;
  engineName: string;
  taskName: string;
  status: string;
  message: string | null;
  executionTime: number | null;
  createdAt: Date;
}

interface ScheduledTask {
  id: string;
  engineName: string;
  taskType: string;
  schedule: string;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}

interface CrawlIssue {
  id: string;
  url: string;
  issueType: string;
  severity: string;
  description: string | null;
}

interface Props {
  engineStatuses: EngineStatus[];
  recentLogs: EngineLog[];
  scheduledTasks: ScheduledTask[];
  crawlIssues: CrawlIssue[];
  stats: {
    totalEngines: number;
    healthy: number;
    warning: number;
    critical: number;
    totalLogs: number;
    openIssues: number;
    activeTasks: number;
  };
}

const ENGINE_NAMES: Record<string, { name: string; icon: any; color: string }> = {
  keyword: { name: 'Keyword Engine', icon: Search, color: 'blue' },
  internal_link: { name: 'Internal Link Engine', icon: LinkIcon, color: 'purple' },
  onpage: { name: 'On-Page Optimizer', icon: FileText, color: 'green' },
  blog: { name: 'Blog Posting Engine', icon: FileText, color: 'indigo' },
  sitemap: { name: 'Sitemap & Indexing', icon: Globe, color: 'orange' },
  crawl: { name: 'Crawl Health', icon: Shield, color: 'red' },
  web_vitals: { name: 'Web Vitals', icon: Zap, color: 'yellow' },
  authority: { name: 'Authority Engine', icon: BarChart3, color: 'pink' },
  image: { name: 'Image Intelligence', icon: ImageIcon, color: 'cyan' },
};

export default function SeoTitanClient({
  engineStatuses: initialEngineStatuses,
  recentLogs: initialRecentLogs,
  scheduledTasks: initialScheduledTasks,
  crawlIssues: initialCrawlIssues,
  stats: initialStats,
}: Props) {
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [engineStatuses, setEngineStatuses] = useState(initialEngineStatuses);
  const [recentLogs, setRecentLogs] = useState(initialRecentLogs);
  const [crawlIssues] = useState(initialCrawlIssues);
  const [stats, setStats] = useState(initialStats);
  const [engineRunningStatus, setEngineRunningStatus] = useState<Record<string, 'running' | 'standby' | 'stopped'>>({});

  const getStatusColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 50) return AlertTriangle;
    return XCircle;
  };

  const filteredLogs = selectedEngine
    ? recentLogs.filter((log) => log.engineName === selectedEngine)
    : recentLogs;

  const statusFilteredLogs = filterStatus !== 'all'
    ? filteredLogs.filter((log) => log.status === filterStatus)
    : filteredLogs;

  // Fetch real-time engine status
  const fetchEngineStatus = async () => {
    try {
      const response = await fetch('/api/admin/seo-titan/auto-mode');
      if (response.ok) {
        const data = await response.json();
        const statusMap: Record<string, 'running' | 'standby' | 'stopped'> = {};
        data.engines?.forEach((engine: any) => {
          statusMap[engine.engineName] = engine.status;
        });
        setEngineRunningStatus(statusMap);
        
        // Update engine statuses with latest data
        if (data.engines) {
          setEngineStatuses(data.engines.map((e: any) => ({
            id: e.id,
            engineName: e.engineName,
            isEnabled: e.isEnabled,
            lastRunAt: e.lastRunAt,
            nextRunAt: e.nextRunAt,
            healthScore: e.healthScore,
            successCount: e.successCount,
            failureCount: e.failureCount,
            warningCount: e.warningCount,
            avgExecutionTime: e.avgExecutionTime,
            lastErrorMessage: e.lastErrorMessage,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching engine status:', error);
    }
  };

  // Poll for status every 5 seconds
  useEffect(() => {
    fetchEngineStatus(); // Initial fetch
    const interval = setInterval(fetchEngineStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Scroll to logs section when viewing specific engine logs
  const handleViewLogs = (engineName: string) => {
    setSelectedEngine(selectedEngine === engineName ? null : engineName);
    // Scroll to logs section after state update
    setTimeout(() => {
      const logsSection = document.getElementById('execution-logs');
      if (logsSection) {
        logsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Refresh data
  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Fetch fresh data from server
      const response = await fetch('/api/admin/seo-titan/status');
      if (response.ok) {
        const data = await response.json();
        // Reload page to get fresh server-side data
        window.location.reload();
      } else {
        throw new Error('Failed to refresh data');
      }
    } catch (error: any) {
      console.error('Error refreshing:', error);
      alert('Error refreshing data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // READ-ONLY MODE: All engine triggers removed
  // Engines are controlled by Go Orchestrator only
  // UI only reads from NOTE layer

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SEO TITAN MODE</h1>
          <p className="text-gray-600 mt-1">Enterprise SEO Engine Monitor</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Engines</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEngines}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Healthy</p>
              <p className="text-2xl font-bold text-green-600">{stats.healthy}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Warning</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{stats?.critical || 0}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Engine Status Grid */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Engine Status</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {engineStatuses.map((engine) => {
              const engineInfo = ENGINE_NAMES[engine.engineName] || {
                name: engine.engineName,
                icon: Activity,
                color: 'gray',
              };
              const Icon = engineInfo.icon;
              const StatusIcon = getStatusIcon(engine.healthScore);
              const runningStatus = engineRunningStatus[engine.engineName] || 
                (engine.isEnabled ? 'standby' : 'stopped');
              
              const getRunningStatusColor = () => {
                switch (runningStatus) {
                  case 'running':
                    return 'bg-blue-100 text-blue-700 border-blue-300';
                  case 'standby':
                    return 'bg-green-100 text-green-700 border-green-300';
                  case 'stopped':
                    return 'bg-gray-100 text-gray-700 border-gray-300';
                  default:
                    return 'bg-gray-100 text-gray-700 border-gray-300';
                }
              };

              const getRunningStatusIcon = () => {
                switch (runningStatus) {
                  case 'running':
                    return <Activity className="h-3 w-3 animate-pulse" />;
                  case 'standby':
                    return <CheckCircle2 className="h-3 w-3" />;
                  case 'stopped':
                    return <XCircle className="h-3 w-3" />;
                  default:
                    return <Activity className="h-3 w-3" />;
                }
              };

              return (
                <div
                  key={engine.id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 text-${engineInfo.color}-500`} />
                      <h3 className="font-semibold">{engineInfo.name}</h3>
                    </div>
                    <StatusIcon
                      className={`h-5 w-5 ${
                        engine.healthScore >= 80
                          ? 'text-green-500'
                          : engine.healthScore >= 50
                          ? 'text-yellow-500'
                          : 'text-red-500'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Health Score:</span>
                      <span
                        className={`font-semibold ${getStatusColor(engine.healthScore)} px-2 py-1 rounded`}
                      >
                        {engine.healthScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Success:</span>
                      <span className="font-semibold text-green-600">{engine.successCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Failures:</span>
                      <span className="font-semibold text-red-600">{engine.failureCount}</span>
                    </div>
                    {engine.lastRunAt && (
                      <div className="text-xs text-gray-500">
                        Last run: {new Date(engine.lastRunAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {/* Running Status Indicator */}
                    <div className={`px-3 py-2 text-xs rounded border flex items-center justify-center gap-2 ${getRunningStatusColor()}`}>
                      {getRunningStatusIcon()}
                      <span className="font-semibold uppercase">{runningStatus}</span>
                      {runningStatus === 'running' && (
                        <span className="text-xs">Processing jobs...</span>
                      )}
                      {runningStatus === 'standby' && (
                        <span className="text-xs">Waiting for jobs...</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {/* READ-ONLY MODE: Engine control removed */}
                      <div className="flex-1 px-3 py-1 text-sm rounded bg-gray-100 text-gray-500 text-center">
                        Read-Only Mode
                      </div>
                    <div className="px-3 py-1 text-sm bg-gray-100 text-gray-500 rounded flex items-center gap-1" title="Engines controlled by Go Orchestrator">
                      <Clock className="h-3 w-3" />
                    </div>
                    <button
                      onClick={() => handleViewLogs(engine.engineName)}
                      className={`px-3 py-1 text-sm rounded ${
                        selectedEngine === engine.engineName
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      title={selectedEngine === engine.engineName ? 'Clear filter' : 'View logs'}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div id="execution-logs" className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Execution Logs</h2>
            {selectedEngine && (
              <p className="text-sm text-gray-600 mt-1">
                Filtered by: <span className="font-semibold">{ENGINE_NAMES[selectedEngine]?.name || selectedEngine}</span>
                <button
                  onClick={() => setSelectedEngine(null)}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
                >
                  Clear filter
                </button>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={selectedEngine || 'all'}
              onChange={(e) => setSelectedEngine(e.target.value === 'all' ? null : e.target.value)}
              className="px-3 py-1 border rounded"
            >
              <option value="all">All Engines</option>
              {engineStatuses.map((e) => (
                <option key={e.id} value={e.engineName}>
                  {ENGINE_NAMES[e.engineName]?.name || e.engineName}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border rounded"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {statusFilteredLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs found</p>
            ) : (
              statusFilteredLogs.map((log) => {
                const engineInfo = ENGINE_NAMES[log.engineName] || {
                  name: log.engineName,
                  icon: Activity,
                  color: 'gray',
                };
                const Icon = engineInfo.icon;

                return (
                  <div
                    key={log.id}
                    className="border rounded p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 text-${engineInfo.color}-500`} />
                        <span className="font-semibold">{engineInfo.name}</span>
                        <span className="text-sm text-gray-500">- {log.taskName}</span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    {log.message && (
                      <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {log.executionTime && (
                        <span>⏱️ {log.executionTime}ms</span>
                      )}
                      <span>🕐 {new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Crawl Issues */}
      {crawlIssues.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Crawl Issues ({crawlIssues.length})</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {crawlIssues.map((issue) => (
                <div key={issue.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          issue.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : issue.severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="ml-2 text-sm font-semibold">{issue.issueType}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{issue.url}</p>
                  {issue.description && (
                    <p className="text-sm text-gray-500 mt-1">{issue.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






