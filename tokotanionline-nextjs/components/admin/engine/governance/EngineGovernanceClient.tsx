/**
 * FASE 3.2: Engine Governance Client Component
 * 
 * Read-only governance display dengan 4 panel:
 * 1. Job Lifecycle Overview
 * 2. Ownership & Traceability
 * 3. Retention Awareness
 * 4. Permission Clarity
 */

'use client';

interface LifecycleData {
  submitted: number;
  running: number;
  completed: number;
  failed: number;
}

interface TraceabilityItem {
  jobId: string;
  triggerSource: string;
  actor: string;
  timestamp: string;
}

interface RetentionData {
  policyDays: number | null;
  oldestJobDate: string | null;
  estimatedCleanupDate: string | null;
}

interface PermissionInfo {
  admin: { access: string; description: string };
  operator: { access: string; description: string };
  viewer: { access: string; description: string };
}

interface EngineGovernanceClientProps {
  lifecycleData: LifecycleData;
  traceabilityItems: TraceabilityItem[];
  retentionData: RetentionData;
  permissionInfo: PermissionInfo;
  currentRole: string;
}

export default function EngineGovernanceClient({
  lifecycleData,
  traceabilityItems,
  retentionData,
  permissionInfo,
  currentRole,
}: EngineGovernanceClientProps) {
  const totalJobs =
    lifecycleData.submitted +
    lifecycleData.running +
    lifecycleData.completed +
    lifecycleData.failed;

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
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

  // Format date only
  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Engine Governance</h1>
        <p className="text-sm text-gray-600 mt-1">
          Kejelasan tata kelola: lifecycle job, kepemilikan, retensi, dan hak akses
        </p>
      </div>

      {/* Panel 1: Job Lifecycle Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          1. Job Lifecycle Overview
        </h2>

        {totalJobs === 0 ? (
          <div className="text-gray-500 text-sm">
            No job activity in the last 7 days.
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <span className="text-gray-700">Submitted: </span>
              <span className="font-medium">{lifecycleData.submitted}</span>
            </div>
            <div>
              <span className="text-gray-700">Running: </span>
              <span className="font-medium">{lifecycleData.running}</span>
            </div>
            <div>
              <span className="text-gray-700">Completed: </span>
              <span className="font-medium">{lifecycleData.completed}</span>
            </div>
            <div>
              <span className="text-gray-700">Failed: </span>
              <span className="font-medium">{lifecycleData.failed}</span>
            </div>
            <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
              Period: Last 7 days | Total jobs: {totalJobs}
            </div>
          </div>
        )}
      </div>

      {/* Panel 2: Ownership & Traceability */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          2. Ownership & Traceability
        </h2>

        {traceabilityItems.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No job activity in the last 7 days.
          </div>
        ) : (
          <div className="space-y-2">
            {traceabilityItems.map((item, idx) => (
              <div key={idx} className="text-sm text-gray-700 border-b pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{item.jobId}</span>
                  <span className="text-gray-500 text-xs">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {item.triggerSource} • {item.actor}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-3">
          Latest 10 items | Period: Last 7 days
        </div>
      </div>

      {/* Panel 3: Retention Awareness */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          3. Retention Awareness
        </h2>

        {!retentionData.policyDays ? (
          <div className="text-gray-500 text-sm">
            Retention policy not configured.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-gray-700">Retention: </span>
              <span className="font-medium">{retentionData.policyDays} days</span>
            </div>
            {retentionData.oldestJobDate && (
              <div>
                <span className="text-gray-700">Oldest item: </span>
                <span className="font-medium">
                  {formatDate(retentionData.oldestJobDate)}
                </span>
              </div>
            )}
            {retentionData.estimatedCleanupDate && (
              <div>
                <span className="text-gray-700">Estimated cleanup: </span>
                <span className="font-medium">
                  {formatDate(retentionData.estimatedCleanupDate)}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  (informational only)
                </span>
              </div>
            )}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
          Note: This is informational only. No delete or edit actions available.
        </div>
      </div>

      {/* Panel 4: Permission Clarity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          4. Permission Clarity
        </h2>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-700 font-medium">Admin</span>
              {currentRole === 'super_admin' && (
                <span className="text-xs text-blue-600">(Current)</span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {permissionInfo.admin.access} — {permissionInfo.admin.description}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-700 font-medium">Operator</span>
              {currentRole === 'admin' && (
                <span className="text-xs text-blue-600">(Current)</span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {permissionInfo.operator.access} — {permissionInfo.operator.description}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-700 font-medium">Viewer</span>
              {currentRole !== 'super_admin' && currentRole !== 'admin' && (
                <span className="text-xs text-blue-600">(Current)</span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {permissionInfo.viewer.access} — {permissionInfo.viewer.description}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-4 pt-3 border-t">
          Note: Permissions are read-only. Changes require system configuration.
        </div>
      </div>
    </div>
  );
}
