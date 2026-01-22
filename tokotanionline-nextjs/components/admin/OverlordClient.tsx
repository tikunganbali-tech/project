'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap, Play, Power, Eye, ExternalLink, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OverlordClientProps {
  systemHealth: any;
  engineLogs: any[];
  contentLogs: any[];
  imageLogs: any[];
  entityStrength: any;
  automationHealth: any;
  indexationProgress: any;
  masterDecisions: any[];
}

export default function OverlordClient({
  systemHealth,
  engineLogs,
  contentLogs,
  imageLogs,
  entityStrength,
  automationHealth,
  indexationProgress,
  masterDecisions,
}: OverlordClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runningEngines, setRunningEngines] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; type: 'success' | 'error' }>>([]);
  const [realTimeData, setRealTimeData] = useState({
    systemHealth,
    engineLogs,
    contentLogs,
    imageLogs,
    entityStrength,
    automationHealth,
    indexationProgress,
  });

  // Map engine names to API endpoints
  const engineNameMap: Record<string, string> = {
    'brand-entity-overlord': 'brand-entity-overlord',
    'search-domination': 'search-domination',
    'content-posting-overlord': 'content-queue',
    'internal-linking-authority-loop': 'authority-loop',
    'product-domination': 'product-domination',
  };

  // Fetch real-time data from API
  const fetchRealTimeData = async () => {
    try {
      // Since we can't easily reload all props, we'll refresh critical data
      // The page will auto-refresh on manual refresh button
      // For now, we'll keep the initial data but add polling capability
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRealTimeData();
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealTimeData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // READ-ONLY MODE: Engine triggers removed
  // Engines are controlled by Go Orchestrator only
  const handleRunEngine = async (engineName: string) => {
    showNotification('⚠️ Read-Only Mode: Engines are controlled by Go Orchestrator. Use /admin/engines to monitor.', 'error');
  };

  const handleToggleEngine = async (engineName: string, currentStatus: boolean) => {
    showNotification('⚠️ Read-Only Mode: Engines are controlled by Go Orchestrator. Use /admin/engines to monitor.', 'error');
  };

  const handleViewLogs = (engineName: string) => {
    router.push(`/admin/engines?engine=${encodeURIComponent(engineName)}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
      case 'failed':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`px-4 py-3 rounded-lg shadow-lg ${
                notif.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {notif.message}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            Overlord Control Tower
          </h1>
          <p className="text-gray-600 mt-2">Real-time monitoring of all SEO and automation systems</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${getStatusColor(systemHealth.overall)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Overall Health</p>
              <p className="text-2xl font-bold mt-1 capitalize">{systemHealth.overall}</p>
            </div>
            {getStatusIcon(systemHealth.overall)}
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Entity Strength</p>
              <p className="text-2xl font-bold mt-1 text-blue-900 capitalize">{entityStrength.strength}</p>
            </div>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Indexation</p>
              <p className="text-2xl font-bold mt-1 text-purple-900">
                {Math.round(indexationProgress.percentage)}%
              </p>
            </div>
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${getStatusColor(automationHealth.status)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Automation</p>
              <p className="text-2xl font-bold mt-1 capitalize">{automationHealth.status}</p>
            </div>
            {getStatusIcon(automationHealth.status)}
          </div>
        </div>
      </div>

      {/* Engine Status */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Engine Status & Actions</h2>
        <div className="space-y-3">
          {systemHealth.engines.map((engine: any) => {
            const isRunning = runningEngines.has(engine.engineName);
            const canRun = engineNameMap[engine.engineName] !== undefined;
            
            return (
              <div key={engine.engineName} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(engine.status)}
                    <div className="flex-1">
                      <p className="font-medium">{engine.engineName}</p>
                      <p className="text-sm text-gray-500">
                        Health: {engine.healthScore}% | Success: {Math.round(engine.successRate)}%
                      </p>
                      {engine.message && (
                        <p className="text-xs text-red-600 mt-1">{engine.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm text-gray-500">
                      {engine.lastRun ? new Date(engine.lastRun).toLocaleString() : 'Never'}
                    </p>
                    {engine.nextRun && (
                      <p className="text-xs text-gray-400 mt-1">
                        Next: {new Date(engine.nextRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons - READ-ONLY MODE */}
                <div className="flex items-center gap-2 pt-3 border-t">
                  <div className="px-3 py-1.5 text-sm bg-gray-200 text-gray-500 rounded flex items-center gap-2 cursor-not-allowed" title="Read-Only Mode: Engines controlled by Go Orchestrator">
                    <Clock className="w-3 h-3" />
                    Read-Only
                  </div>
                  <div className="px-3 py-1.5 text-sm bg-gray-200 text-gray-500 rounded flex items-center gap-2 cursor-not-allowed" title="Read-Only Mode: Engines controlled by Go Orchestrator">
                    <Clock className="w-3 h-3" />
                    Read-Only
                  </div>
                  {/* Original buttons removed - READ-ONLY MODE
                  {canRun && (
                    <button
                      onClick={() => handleRunEngine(engine.engineName)}
                      disabled={isRunning}
                      className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Run engine manually"
                    >
                      <Play className="w-3 h-3" />
                      {isRunning ? 'Running...' : 'Run Now'}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleEngine(engine.engineName, engine.isEnabled ?? false)}
                    className={`px-3 py-1.5 text-sm rounded flex items-center gap-2 ${
                      engine.isEnabled 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                    title={engine.isEnabled ? 'Disable engine auto mode' : 'Enable engine auto mode'}
                  >
                    <Power className="w-3 h-3" />
                  </button>
                  */}
                  <button
                    onClick={() => handleViewLogs(engine.engineName)}
                    className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-2"
                    title="View detailed logs"
                  >
                    <Eye className="w-3 h-3" />
                    Logs
                  </button>
                  {(engine.status === 'critical' || engine.status === 'warning') && (
                    <button
                      onClick={() => router.push(`/admin/seo-titan?engine=${encodeURIComponent(engine.engineName)}`)}
                      className="px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded flex items-center gap-2"
                      title="View in SEO Titan dashboard"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engine Logs */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Engine Activity</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {engineLogs.slice(0, 10).map((log: any) => (
              <div key={log.id} className="p-2 border rounded text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{log.engineName}</span>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-gray-600 mt-1">{log.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(log.executedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Content & Image Logs */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Content & Image Activity</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Content Generation</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contentLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="p-2 border rounded text-sm">
                    <p className="text-gray-600">{log.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.executedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Image Processing</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {imageLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="p-2 border rounded text-sm">
                    <p className="text-gray-600">{log.filename || log.imageUrl}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Entity Strength Details */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Entity Strength Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Schema Coverage</p>
            <p className="text-2xl font-bold mt-1">{entityStrength.metrics.schemaCoverage}%</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Mentions</p>
            <p className="text-2xl font-bold mt-1">{entityStrength.metrics.mentionCount}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Consistency</p>
            <p className="text-2xl font-bold mt-1">{entityStrength.metrics.consistencyScore}%</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Authors</p>
            <p className="text-2xl font-bold mt-1">{entityStrength.metrics.authorCount}</p>
          </div>
        </div>
      </div>

      {/* Master Decision Engine - Single Source of Truth */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Master Decision Engine
            </h2>
            <p className="text-sm text-gray-600 mt-1">Single source of truth - All engines must obey these decisions</p>
          </div>
          <div className="text-sm text-gray-500">
            {masterDecisions.length} decisions
          </div>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {masterDecisions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No master decisions yet. Decisions are generated when engines process pages.</p>
            </div>
          ) : (
            masterDecisions.map((decision: any, index: number) => {
              const getDecisionColor = (dec: string) => {
                switch (dec) {
                  case 'PRIORITY_SELL':
                    return 'bg-green-100 border-green-300 text-green-800';
                  case 'PRIORITY_EDUCATE':
                    return 'bg-blue-100 border-blue-300 text-blue-800';
                  case 'PRIORITY_AUTHORITY':
                    return 'bg-purple-100 border-purple-300 text-purple-800';
                  case 'IGNORE':
                    return 'bg-gray-100 border-gray-300 text-gray-800';
                  default:
                    return 'bg-gray-100 border-gray-300 text-gray-800';
                }
              };

              const getDecisionIcon = (dec: string) => {
                switch (dec) {
                  case 'PRIORITY_SELL':
                    return '💰';
                  case 'PRIORITY_EDUCATE':
                    return '📚';
                  case 'PRIORITY_AUTHORITY':
                    return '🏆';
                  case 'IGNORE':
                    return '🚫';
                  default:
                    return '❓';
                }
              };

              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${getDecisionColor(decision.decision)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getDecisionIcon(decision.decision)}</span>
                        <span className="font-bold text-lg">{decision.decision}</span>
                        <span className="text-sm opacity-75">
                          ({decision.confidence}% confidence)
                        </span>
                      </div>
                      <p className="text-sm mb-3 opacity-90">{decision.reason}</p>
                      
                      {decision.analytics && (
                        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-opacity-30">
                          <div>
                            <p className="text-xs opacity-75">Truth Score</p>
                            <p className="font-semibold">{decision.analytics.truthScore || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Bounce Rate</p>
                            <p className="font-semibold">{Math.round((decision.analytics.bounceRate || 0) * 100)}%</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Scroll Depth</p>
                            <p className="font-semibold">{decision.analytics.avgScrollDepth || 0}%</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-75">Conversion Intent</p>
                            <p className="font-semibold">{decision.analytics.conversionIntent || 0}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs opacity-75 ml-4">
                      {new Date(decision.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}






