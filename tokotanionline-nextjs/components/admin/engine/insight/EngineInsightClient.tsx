/**
 * FASE 3.1: Engine Insight Client Component
 * 
 * Read-only insight display dengan 4 panel:
 * 1. Engine Health Summary
 * 2. Failure Pattern (Top Causes)
 * 3. Activity Trend (Light)
 * 4. Configuration Awareness
 */

'use client';

import { SAFE_MODE, FEATURE_FREEZE } from '@/lib/admin-config';

interface HealthData {
  totalJobs: number;
  successJobs: number;
  failedJobs: number;
  avgDuration: number | null;
}

interface FailurePattern {
  error: string;
  count: number;
}

interface ActivityTrend {
  day: string;
  count: number;
}

interface LastConfigChange {
  setting: string;
  changedBy: string;
  timestamp: string;
}

interface EngineInsightClientProps {
  healthData: HealthData;
  failurePattern: FailurePattern[];
  activityTrend: ActivityTrend[];
  lastConfigChange: LastConfigChange | null;
}

export default function EngineInsightClient({
  healthData,
  failurePattern,
  activityTrend,
  lastConfigChange,
}: EngineInsightClientProps) {
  // Calculate success rate
  const successRate =
    healthData.totalJobs > 0
      ? Math.round((healthData.successJobs / healthData.totalJobs) * 100)
      : 0;

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // Format config change timestamp
  const formatConfigTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Engine Insight</h1>
        <p className="text-sm text-gray-600 mt-1">
          Insight interpretatif ringan untuk memahami kondisi engine & dampaknya
        </p>
      </div>

      {/* Panel 1: Engine Health Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          1. Engine Health Summary
        </h2>

        {healthData.totalJobs === 0 ? (
          <div className="text-gray-500 text-sm">
            No engine activity in the last 7 days.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-gray-700">Success rate: </span>
              <span className="font-medium">{successRate}%</span>
            </div>
            <div>
              <span className="text-gray-700">Total jobs failed: </span>
              <span className="font-medium">{healthData.failedJobs}</span>
            </div>
            <div>
              <span className="text-gray-700">Average duration: </span>
              <span className="font-medium">
                {formatDuration(healthData.avgDuration)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Period: Last 7 days | Total jobs: {healthData.totalJobs}
            </div>
          </div>
        )}
      </div>

      {/* Panel 2: Failure Pattern (Top Causes) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          2. Failure Pattern (Top Causes)
        </h2>

        {failurePattern.length === 0 ? (
          <div className="text-gray-500 text-sm">No failures recorded.</div>
        ) : (
          <div className="space-y-2">
            {failurePattern.map((item, idx) => (
              <div key={idx} className="text-sm text-gray-700">
                {item.error} — {item.count} times
              </div>
            ))}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-3">
          Period: Last 7 days | Top 3 errors
        </div>
      </div>

      {/* Panel 3: Activity Trend (Light) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          3. Activity Trend (Light)
        </h2>

        {activityTrend.length === 0 || activityTrend.every((a) => a.count === 0) ? (
          <div className="text-gray-500 text-sm">
            No engine activity trend available.
          </div>
        ) : (
          <div className="space-y-1">
            {activityTrend.map((item, idx) => (
              <div key={idx} className="text-sm text-gray-700">
                {item.day}: {item.count}
              </div>
            ))}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-3">Period: Last 7 days</div>
      </div>

      {/* Panel 4: Configuration Awareness */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          4. Configuration Awareness
        </h2>

        <div className="space-y-3">
          <div>
            <span className="text-gray-700">SAFE_MODE: </span>
            <span className="font-medium">{SAFE_MODE ? 'ON' : 'OFF'}</span>
          </div>
          <div>
            <span className="text-gray-700">FEATURE_FREEZE: </span>
            <span className="font-medium">
              {FEATURE_FREEZE ? 'ON' : 'OFF'}
            </span>
          </div>

          {lastConfigChange ? (
            <div className="mt-4 pt-3 border-t">
              <div className="text-sm text-gray-600">
                Last configuration change:
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {lastConfigChange.setting} changed by {lastConfigChange.changedBy}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatConfigTimestamp(lastConfigChange.timestamp)}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t text-sm text-gray-500">
              No recent configuration changes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
