'use client';

import { useState, useEffect } from 'react';
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAdmin } from '@/components/providers/AdminProvider';

interface EngineStatus {
  engineName: string;
  executed: boolean;
  hasOutput: boolean;
  outputCount: number;
  executionTime: number;
  error?: string;
}

export default function AuditClient() {
  const { capabilities } = useAdmin();
  const [engines, setEngines] = useState<EngineStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [auditStatus, setAuditStatus] = useState<any>(null);

  const engineList = [
    'brand-entity-overlord',
    'search-domination',
    'content-queue',
    'authority-loop',
    'product-domination',
    'entity-engine',
    'internal-link-graph',
    'health-monitor',
    'brand-entity',
    'seo-domination-serp',
    'seo-domination-programmatic',
  ];

  const loadAuditStatus = async () => {
    try {
      const response = await fetch('/api/admin/audit/status');
      const data = await response.json();
      setAuditStatus(data);
    } catch (error) {
      console.error('Failed to load audit status:', error);
    }
  };

  useEffect(() => {
    loadAuditStatus();
    const interval = setInterval(loadAuditStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const [testingEngines, setTestingEngines] = useState<Set<string>>(new Set());

  const testEngine = async (engineName: string) => {
    // Mark as testing
    setTestingEngines(prev => new Set(prev).add(engineName));
    
    // Set initial state to show testing
    setEngines(prev => {
      const existing = prev.find(e => e.engineName === engineName);
      if (existing) {
        return prev.map(e => 
          e.engineName === engineName 
            ? { ...e, executed: false, error: undefined }
            : e
        );
      }
      return [...prev, { 
        engineName, 
        executed: false, 
        hasOutput: false, 
        outputCount: 0, 
        executionTime: 0 
      }];
    });

    try {
      const response = await fetch('/api/admin/audit/test-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engineName }),
      });

      const result = await response.json();
      
      setEngines(prev => {
        const existing = prev.find(e => e.engineName === engineName);
        if (existing) {
          return prev.map(e => 
            e.engineName === engineName 
              ? { ...result, engineName }
              : e
          );
        }
        return [...prev, { ...result, engineName }];
      });

      await loadAuditStatus();
      return result;
    } catch (error: any) {
      setEngines(prev => {
        const existing = prev.find(e => e.engineName === engineName);
        if (existing) {
          return prev.map(e => 
            e.engineName === engineName 
              ? { ...e, executed: false, error: error.message }
              : e
          );
        }
        return [...prev, { 
          engineName, 
          executed: false, 
          hasOutput: false, 
          outputCount: 0, 
          executionTime: 0,
          error: error.message 
        }];
      });
    } finally {
      // Remove from testing set
      setTestingEngines(prev => {
        const next = new Set(prev);
        next.delete(engineName);
        return next;
      });
    }
  };

  const testAllEngines = async () => {
    setIsRunning(true);
    setEngines([]);

    try {
      // Use the comprehensive test-all endpoint
      const response = await fetch('/api/admin/audit/test-all', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success && data.results) {
        // Update engines state with results
        setEngines(data.results.map((r: any) => ({
          engineName: r.engineName,
          executed: r.executed,
          hasOutput: r.hasOutput,
          outputCount: r.outputCount,
          executionTime: r.executionTime,
          error: r.error,
        })));
      } else {
        // Fallback to individual testing
        for (const engineName of engineList) {
          await testEngine(engineName);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error: any) {
      console.error('Error testing all engines:', error);
      // Fallback to individual testing
      for (const engineName of engineList) {
        await testEngine(engineName);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsRunning(false);
    await loadAuditStatus();
  };

  const getStatusIcon = (engine: EngineStatus, engineName: string) => {
    if (testingEngines.has(engineName)) return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    if (!engine.executed) return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    if (engine.error) return <XCircle className="w-5 h-5 text-red-500" />;
    if (engine.hasOutput) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusColor = (engine: EngineStatus, engineName: string) => {
    if (testingEngines.has(engineName)) return 'bg-blue-50 border-blue-200';
    if (!engine.executed) return 'bg-gray-50 border-gray-200';
    if (engine.error) return 'bg-red-50 border-red-200';
    if (engine.hasOutput) return 'bg-green-50 border-green-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Audit Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive engine verification and testing</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadAuditStatus}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
          {capabilities.canRunJob && (
            <button
              onClick={testAllEngines}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Test All Engines
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {auditStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-blue-50">
            <p className="text-sm text-blue-600">Recent Executions</p>
            <p className="text-2xl font-bold text-blue-900">{auditStatus.statistics?.recentExecutions || 0}</p>
          </div>
          <div className="p-4 rounded-lg border bg-red-50">
            <p className="text-sm text-red-600">Recent Failures</p>
            <p className="text-2xl font-bold text-red-900">{auditStatus.statistics?.recentFailures || 0}</p>
          </div>
          <div className="p-4 rounded-lg border bg-green-50">
            <p className="text-sm text-green-600">Healthy Engines</p>
            <p className="text-2xl font-bold text-green-900">{auditStatus.statistics?.healthyEngines || 0}</p>
          </div>
          <div className="p-4 rounded-lg border bg-yellow-50">
            <p className="text-sm text-yellow-600">Critical Engines</p>
            <p className="text-2xl font-bold text-yellow-900">{auditStatus.statistics?.criticalEngines || 0}</p>
          </div>
        </div>
      )}

      {/* Engine Test Results */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Engine Test Results</h2>
        <div className="space-y-3">
          {engineList.map(engineName => {
            const engine = engines.find(e => e.engineName === engineName);
            return (
              <div
                key={engineName}
                className={`p-4 border rounded-lg ${getStatusColor(engine || { engineName, executed: false, hasOutput: false, outputCount: 0, executionTime: 0 }, engineName)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(engine || { engineName, executed: false, hasOutput: false, outputCount: 0, executionTime: 0 }, engineName)}
                    <div>
                      <p className="font-medium">{engineName.replace(/-/g, ' ')}</p>
                      {testingEngines.has(engineName) ? (
                        <div className="text-sm text-blue-600 mt-1">
                          <span>🔄 Testing...</span>
                        </div>
                      ) : engine && engine.executed ? (
                        <div className="text-sm text-gray-600 mt-1">
                          {engine.hasOutput ? (
                            <span className="text-green-600">✅ Has Output ({engine.outputCount})</span>
                          ) : (
                            <span className="text-yellow-600">⚠️ No Output</span>
                          )}
                          {engine.error && (
                            <span className="text-red-600 ml-2">❌ {engine.error}</span>
                          )}
                          <span className="text-gray-500 ml-2">({engine.executionTime}ms)</span>
                        </div>
                      ) : engine && engine.error ? (
                        <div className="text-sm text-red-600 mt-1">
                          ❌ {engine.error}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 mt-1">
                          Not tested
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => testEngine(engineName)}
                    disabled={isRunning || testingEngines.has(engineName)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50 flex items-center gap-1"
                  >
                    {testingEngines.has(engineName) ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Logs */}
      {auditStatus && auditStatus.auditLogs && auditStatus.auditLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Audit Logs</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditStatus.auditLogs.map((log: any) => (
              <div key={log.id} className="p-3 border rounded text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{log.engineName}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    log.status === 'success' ? 'bg-green-100 text-green-800' :
                    log.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
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
      )}
    </div>
  );
}

