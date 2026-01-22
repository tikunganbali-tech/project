'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, TrendingUp, Brain, DollarSign } from 'lucide-react';

interface AuditResult {
  category: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: any;
  recommendations?: string[];
}

interface SystemAuditReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'warning' | 'critical';
  summary: {
    total: number;
    pass: number;
    warning: number;
    fail: number;
  };
  results: AuditResult[];
  stability: {
    score: number;
    status: 'stable' | 'unstable';
  };
  intelligence: {
    score: number;
    status: 'intelligent' | 'needs-improvement';
  };
  profitOrientation: {
    score: number;
    status: 'profit-oriented' | 'needs-optimization';
  };
}

export default function SystemAuditClient() {
  const [report, setReport] = useState<SystemAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/system/audit');
      const data = await response.json();
      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.error || 'Failed to run audit');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
      case 'stable':
      case 'intelligent':
      case 'profit-oriented':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
      case 'needs-improvement':
      case 'needs-optimization':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'fail':
      case 'critical':
      case 'unstable':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
      case 'stable':
      case 'intelligent':
      case 'profit-oriented':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
      case 'needs-improvement':
      case 'needs-optimization':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'fail':
      case 'critical':
      case 'unstable':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={runAudit}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report && !loading) {
    return (
      <div className="p-6">
        <button
          onClick={runAudit}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Run System Audit
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Audit</h1>
          <p className="text-gray-600 mt-1">Full system health and performance audit</p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running...' : 'Run Audit'}
        </button>
      </div>

      {loading && !report && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-600">Running system audit...</p>
        </div>
      )}

      {report && (
        <>
          {/* Overall Status */}
          <div className={`rounded-lg shadow border-2 p-6 ${getStatusColor(report.overallStatus)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(report.overallStatus)}
                <div>
                  <h2 className="text-2xl font-bold">System Status: {report.overallStatus.toUpperCase()}</h2>
                  <p className="text-sm mt-1">
                    {report.summary.pass}/{report.summary.total} checks passed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-75">
                  {new Date(report.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stability */}
            <div className={`bg-white rounded-lg shadow border-2 p-4 ${getStatusColor(report.stability.status)}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-semibold">Stability</h3>
              </div>
              <div className="text-3xl font-bold mb-1">{report.stability.score}%</div>
              <div className="text-sm opacity-75">{report.stability.status}</div>
            </div>

            {/* Intelligence */}
            <div className={`bg-white rounded-lg shadow border-2 p-4 ${getStatusColor(report.intelligence.status)}`}>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5" />
                <h3 className="font-semibold">Intelligence</h3>
              </div>
              <div className="text-3xl font-bold mb-1">{report.intelligence.score}%</div>
              <div className="text-sm opacity-75">{report.intelligence.status}</div>
            </div>

            {/* Profit Orientation */}
            <div className={`bg-white rounded-lg shadow border-2 p-4 ${getStatusColor(report.profitOrientation.status)}`}>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-semibold">Profit Orientation</h3>
              </div>
              <div className="text-3xl font-bold mb-1">{report.profitOrientation.score}%</div>
              <div className="text-sm opacity-75">{report.profitOrientation.status}</div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Audit Summary</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{report.summary.total}</div>
                <div className="text-sm text-gray-600">Total Checks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{report.summary.pass}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{report.summary.warning}</div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{report.summary.fail}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Detailed Results</h3>
            </div>
            <div className="divide-y">
              {report.results.map((result, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{result.category}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(result.status)}`}>
                          {result.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                      {result.details && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <pre>{JSON.stringify(result.details, null, 2)}</pre>
                        </div>
                      )}
                      {result.recommendations && result.recommendations.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Recommendations:</p>
                          <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                            {result.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}













