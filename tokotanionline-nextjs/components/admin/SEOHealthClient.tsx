'use client';

import { useState, useEffect } from 'react';
// Notification utility removed - using simple alerts
import { AlertCircle, CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';

interface HealthIssue {
  id: string;
  issueType: string;
  entityType: string | null;
  entityId: string | null;
  severity: string;
  message: string;
  fixSuggestion: string | null;
  isResolved: boolean;
  detectedAt: Date;
}

interface HealthSummary {
  total: number;
  resolved: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

export default function SEOHealthClient() {
  const [issues, setIssues] = useState<HealthIssue[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [filter, severityFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [issuesRes, summaryRes] = await Promise.all([
        fetch(`/api/admin/seo/health?filter=${filter}&severity=${severityFilter}`),
        fetch('/api/admin/seo/health/summary'),
      ]);

      const issuesData = await issuesRes.json();
      const summaryData = await summaryRes.json();

      setIssues(issuesData.issues || []);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading SEO health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/seo/health/check?autoFix=true', { method: 'POST' });
      const data = await response.json();
      if (data.fixed) {
        alert(`✅ Auto-fixed ${data.fixed} issues!`);
      }
      await loadData();
    } catch (error) {
      console.error('Error running health check:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoFixAll = async () => {
    if (!confirm('Auto-fix semua issues yang terdeteksi?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/seo/health/fix', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Auto-fixed ${data.fixed} out of ${data.total} issues!`);
        await loadData();
      }
    } catch (error) {
      console.error('Error auto-fixing:', error);
      alert('❌ Error saat auto-fix');
    } finally {
      setLoading(false);
    }
  };

  const autoFixSingle = async (issueId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/seo/health/fix?issueId=${issueId}`, { method: 'POST' });
      const data = await response.json();
      if (data.success && data.result.fixed) {
        alert(`✅ Fixed: ${data.result.message}`);
        await loadData();
      } else {
        alert(`⚠️ ${data.result.message}`);
      }
    } catch (error) {
      console.error('Error auto-fixing issue:', error);
      alert('❌ Error saat auto-fix');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-300';
      case 'high':
        return 'bg-orange-100 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300';
      case 'low':
        return 'bg-blue-100 border-blue-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">SEO Health Monitor</h1>
        <div className="flex gap-2">
          <button
            onClick={autoFixAll}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Auto-Fix All
          </button>
          <button
            onClick={runHealthCheck}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Run Health Check
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Issues</div>
            <div className="text-2xl font-bold">{summary?.total || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Resolved</div>
            <div className="text-2xl font-bold text-green-600">{summary?.resolved || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Critical</div>
            <div className="text-2xl font-bold text-red-600">{summary?.bySeverity?.critical || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">High</div>
            <div className="text-2xl font-bold text-orange-600">{summary?.bySeverity?.high || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'unresolved')}
          className="border rounded-lg px-4 py-2"
        >
          <option value="unresolved">Unresolved</option>
          <option value="all">All Issues</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : issues.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-semibold">No issues found! Your SEO is healthy.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm uppercase">{issue.severity}</span>
                    <span className="text-sm text-gray-600">•</span>
                    <span className="text-sm text-gray-600">{issue.issueType}</span>
                  </div>
                  <p className="font-medium mb-1">{issue.message}</p>
                  {issue.fixSuggestion && (
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>Fix:</strong> {issue.fixSuggestion}
                    </p>
                  )}
                  {issue.entityType && issue.entityId && (
                    <p className="text-xs text-gray-500 mt-2">
                      {issue.entityType}: {issue.entityId}
                    </p>
                  )}
                  <button
                    onClick={() => autoFixSingle(issue.id)}
                    disabled={loading}
                    className="mt-3 text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Auto-Fix
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

