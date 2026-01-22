/**
 * PHASE UI-A: Scheduler Dashboard Client Component
 * 
 * Main dashboard showing:
 * - Engine Status
 * - Active Schedules count
 * - Queue stats (Pending, Processing, Done, Failed)
 * - Action buttons (Start/Pause scheduler)
 * - List of schedules
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Play, Pause, Plus, RefreshCw, ArrowRight, Settings, CheckCircle, XCircle, Clock, AlertCircle, X, Edit } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useNotification } from '@/lib/notification-context';

interface DashboardData {
  engineStatus: 'RUNNING' | 'STOPPED';
  activeSchedules: number;
  queue: {
    pending: number;
    processing: number;
    done: number;
    failed: number;
  };
  recent24h: {
    done: number;
    failed: number;
  };
}

interface Schedule {
  id: string;
  name: string;
  mode: 'BLOG' | 'PRODUCT';
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  productionPerDay: number;
  startDate: string;
  endDate: string | null;
  publishMode: 'AUTO_PUBLISH' | 'DRAFT_ONLY' | 'QC_REQUIRED';
  timeWindowStart: string;
  timeWindowEnd: string;
  createdAt: string;
  keywordStats: {
    total: number;
    pending: number;
    processing: number;
    done: number;
    failed: number;
  };
}

export default function SchedulerDashboardClient() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  // Polling interval: 12 seconds (between 10-15s requirement)
  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(true); // Silent refresh
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      // Load dashboard stats
      const dashboardRes = await fetch('/api/admin/schedules/dashboard');
      const dashboardData = await dashboardRes.json();
      if (dashboardData.success) {
        setDashboard(dashboardData.dashboard);
      }

      // Load schedules list
      const schedulesRes = await fetch('/api/admin/schedules');
      const schedulesData = await schedulesRes.json();
      if (schedulesData.success) {
        setSchedules(schedulesData.schedules);
      }
    } catch (error) {
      console.error('Failed to load scheduler data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // PHASE E: Handle pause job
  const handlePause = async (scheduleId: string) => {
    setActionLoading({ ...actionLoading, [scheduleId]: true });
    try {
      const response = await fetch(`/api/admin/schedules/${scheduleId}/pause`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Job paused successfully', 'success', {
          title: 'Job Paused',
          duration: 2000,
        });
        await loadData();
      } else {
        showNotification(data.error || 'Failed to pause job', 'error', {
          title: 'Pause Failed',
          duration: 5000,
        });
      }
    } catch (error: any) {
      showNotification('Terjadi kesalahan saat pause job', 'error', {
        title: 'Error',
        duration: 5000,
      });
    } finally {
      setActionLoading({ ...actionLoading, [scheduleId]: false });
    }
  };

  // PHASE E: Handle resume job
  const handleResume = async (scheduleId: string) => {
    setActionLoading({ ...actionLoading, [scheduleId]: true });
    try {
      const response = await fetch(`/api/admin/schedules/${scheduleId}/resume`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Job resumed successfully', 'success', {
          title: 'Job Resumed',
          duration: 2000,
        });
        await loadData();
      } else {
        showNotification(data.error || 'Failed to resume job', 'error', {
          title: 'Resume Failed',
          duration: 5000,
        });
      }
    } catch (error: any) {
      showNotification('Terjadi kesalahan saat resume job', 'error', {
        title: 'Error',
        duration: 5000,
      });
    } finally {
      setActionLoading({ ...actionLoading, [scheduleId]: false });
    }
  };

  // PHASE E: Handle cancel job
  const handleCancel = async (scheduleId: string) => {
    if (!confirm('Yakin ingin cancel job ini? Job akan di-mark sebagai CANCELLED.')) {
      return;
    }

    setActionLoading({ ...actionLoading, [scheduleId]: true });
    try {
      const response = await fetch(`/api/admin/schedules/${scheduleId}/cancel`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Job cancelled successfully', 'success', {
          title: 'Job Cancelled',
          duration: 2000,
        });
        await loadData();
      } else {
        showNotification(data.error || 'Failed to cancel job', 'error', {
          title: 'Cancel Failed',
          duration: 5000,
        });
      }
    } catch (error: any) {
      showNotification('Terjadi kesalahan saat cancel job', 'error', {
        title: 'Error',
        duration: 5000,
      });
    } finally {
      setActionLoading({ ...actionLoading, [scheduleId]: false });
    }
  };

  // PHASE E: Handle delete job
  const handleDelete = async (scheduleId: string, scheduleName: string) => {
    if (!confirm(`Yakin ingin menghapus job "${scheduleName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setActionLoading({ ...actionLoading, [scheduleId]: true });
    try {
      const response = await fetch(`/api/admin/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Job deleted successfully', 'success', {
          title: 'Job Deleted',
          duration: 2000,
        });
        await loadData();
      } else {
        showNotification(data.error || 'Failed to delete job', 'error', {
          title: 'Delete Failed',
          duration: 5000,
        });
      }
    } catch (error: any) {
      showNotification('Terjadi kesalahan saat delete job', 'error', {
        title: 'Error',
        duration: 5000,
      });
    } finally {
      setActionLoading({ ...actionLoading, [scheduleId]: false });
    }
  };

  // PHASE E: Legacy handleToggleSchedule (kept for backward compatibility)
  const handleToggleSchedule = async (scheduleId: string, currentStatus: string) => {
    // PHASE E: Use pause/resume instead
    if (currentStatus === 'ACTIVE') {
      await handlePause(scheduleId);
    } else if (currentStatus === 'PAUSED') {
      await handleResume(scheduleId);
    }
  };

  // PHASE E: Get status badge with job lifecycle status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">ACTIVE</span>;
      case 'PAUSED':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">PAUSED</span>;
      case 'FINISHED':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">FINISHED</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 font-medium">{status}</span>;
    }
  };

  // PHASE E: Check if job can be paused
  const canPauseJob = (status: string) => {
    return status === 'ACTIVE';
  };

  // PHASE E: Check if job can be resumed
  const canResumeJob = (status: string) => {
    return status === 'PAUSED';
  };

  // PHASE E: Check if job can be cancelled
  const canCancelJob = (status: string) => {
    return status === 'ACTIVE' || status === 'PAUSED';
  };

  // PHASE E: Check if job can be deleted
  const canDeleteJob = (status: string, hasProcessingKeywords: boolean) => {
    // RUNNING (ACTIVE with processing keywords) cannot be deleted
    if (status === 'ACTIVE' && hasProcessingKeywords) {
      return false;
    }
    // FINISHED can be deleted
    if (status === 'FINISHED') {
      return true;
    }
    // ACTIVE and PAUSED can be deleted (but should cancel first)
    return true;
  };

  const getPublishModeLabel = (mode: string) => {
    switch (mode) {
      case 'DRAFT_ONLY':
        return 'Draft Only';
      case 'AUTO_PUBLISH':
        return 'Auto Publish';
      case 'QC_REQUIRED':
        return 'QC Required';
      default:
        return mode;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-8 w-8 text-blue-600" />
          Scheduler Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/admin/scheduler/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Schedule
          </Link>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Engine Status */}
        <div className={`p-4 rounded-lg ${dashboard?.engineStatus === 'RUNNING' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
          <div className="text-sm font-medium text-gray-600 mb-1">Engine Status</div>
          <div className={`text-2xl font-bold ${dashboard?.engineStatus === 'RUNNING' ? 'text-green-700' : 'text-red-700'}`}>
            {dashboard?.engineStatus === 'RUNNING' ? '🟢 RUNNING' : '🔴 STOPPED'}
          </div>
        </div>

        {/* Active Schedules */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600 mb-1">Active Schedules</div>
          <div className="text-2xl font-bold text-blue-900">{dashboard?.activeSchedules || 0}</div>
        </div>

        {/* Queue Stats */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-900">{dashboard?.queue.pending || 0}</div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="text-sm text-orange-600 mb-1">Processing</div>
          <div className="text-2xl font-bold text-orange-900">{dashboard?.queue.processing || 0}</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 mb-1">Done</div>
          <div className="text-2xl font-bold text-green-900">{dashboard?.queue.done || 0}</div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600 mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-900">{dashboard?.queue.failed || 0}</div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Schedules</h2>
        </div>

        {schedules.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Belum ada scheduler yang dibuat</p>
            <Link
              href="/admin/scheduler/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Buat Scheduler Pertama
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{schedule.name}</h3>
                      {getStatusBadge(schedule.status)}
                      <span className="text-sm text-gray-500">{schedule.mode}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Produksi:</span> {schedule.productionPerDay}/hari
                      </div>
                      <div>
                        <span className="font-medium">Publish:</span> {getPublishModeLabel(schedule.publishMode)}
                      </div>
                      <div>
                        <span className="font-medium">Jam Aktif:</span> {schedule.timeWindowStart} - {schedule.timeWindowEnd}
                      </div>
                      <div>
                        <span className="font-medium">Mulai:</span>{' '}
                        {format(new Date(schedule.startDate), 'd MMM yyyy', { locale: id })}
                      </div>
                    </div>

                    {/* Keyword Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Keywords: {schedule.keywordStats.total}</span>
                      <span className="text-yellow-600">Pending: {schedule.keywordStats.pending}</span>
                      <span className="text-orange-600">Processing: {schedule.keywordStats.processing}</span>
                      <span className="text-green-600">Done: {schedule.keywordStats.done}</span>
                      {schedule.keywordStats.failed > 0 && (
                        <span className="text-red-600">Failed: {schedule.keywordStats.failed}</span>
                      )}
                    </div>
                  </div>

                  {/* PHASE E: Action buttons with state guards */}
                  <div className="flex items-center gap-2 ml-4 flex-wrap">
                    {/* PHASE E: Pause button (only if ACTIVE) */}
                    {canPauseJob(schedule.status) && (
                      <button
                        onClick={() => handlePause(schedule.id)}
                        disabled={actionLoading[schedule.id]}
                        className="px-3 py-1.5 text-sm rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Pause job"
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </button>
                    )}

                    {/* PHASE E: Resume button (only if PAUSED) */}
                    {canResumeJob(schedule.status) && (
                      <button
                        onClick={() => handleResume(schedule.id)}
                        disabled={actionLoading[schedule.id]}
                        className="px-3 py-1.5 text-sm rounded-lg bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Resume job"
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </button>
                    )}

                    {/* PHASE E: Cancel button (only if ACTIVE or PAUSED) */}
                    {canCancelJob(schedule.status) && (
                      <button
                        onClick={() => handleCancel(schedule.id)}
                        disabled={actionLoading[schedule.id]}
                        className="px-3 py-1.5 text-sm rounded-lg bg-orange-100 text-orange-800 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Cancel job (soft delete)"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}

                    {/* PHASE E: Delete button (with guard) */}
                    {canDeleteJob(schedule.status, schedule.keywordStats.processing > 0) && (
                      <button
                        onClick={() => handleDelete(schedule.id, schedule.name)}
                        disabled={actionLoading[schedule.id] || schedule.keywordStats.processing > 0}
                        className="px-3 py-1.5 text-sm rounded-lg bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title={
                          schedule.keywordStats.processing > 0
                            ? 'Cannot delete: Job has keywords in PROCESSING state'
                            : 'Delete job (hard delete)'
                        }
                      >
                        <X className="h-4 w-4" />
                        Delete
                      </button>
                    )}

                    {/* PHASE E: Edit button (only if can update) */}
                    {(schedule.status === 'ACTIVE' || schedule.status === 'PAUSED') && (
                      <Link
                        href={`/admin/scheduler/${schedule.id}`}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                        title="Edit job (update schedule time, batch, etc.)"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Link>
                    )}

                    <Link
                      href={`/admin/scheduler/${schedule.id}/keywords`}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 flex items-center gap-1"
                    >
                      Keywords
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
