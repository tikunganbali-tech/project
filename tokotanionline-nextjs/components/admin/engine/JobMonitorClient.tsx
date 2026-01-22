/**
 * UI-B2: Job Monitor Client
 * 
 * Displays jobs with retry & skip actions
 * Polling: 12 seconds
 */

'use client';

import { useEffect, useState } from 'react';

interface Job {
  id: string;
  type: 'BLOG' | 'PRODUCT';
  primaryKeyword: string;
  scheduleName: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'SKIPPED';
  startedAt: string | null;
  finishedAt: string | null;
  duration: string | null;
  error: string | null;
  createdAt: string;
}

export default function JobMonitorClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/admin/engine/jobs?limit=100', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const response = await fetch(`/api/admin/engine/jobs/${jobId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to retry job');
      }

      // Refresh jobs
      await fetchJobs();
    } catch (err: any) {
      console.error('Error retrying job:', err);
      alert(err.message || 'Gagal retry job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkip = async (jobId: string) => {
    if (!confirm('Yakin ingin skip job ini?')) {
      return;
    }

    setActionLoading(jobId);
    try {
      const response = await fetch(`/api/admin/engine/jobs/${jobId}/skip`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to skip job');
      }

      // Refresh jobs
      await fetchJobs();
    } catch (err: any) {
      console.error('Error skipping job:', err);
      alert(err.message || 'Gagal skip job');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'DONE':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'SKIPPED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchJobs();

    // Poll every 12 seconds
    const interval = setInterval(fetchJobs, 12000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          <span className="text-gray-600">Memuat jobs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-red-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-red-600">⚠️ {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Primary Keyword
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Started At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Finished At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                  Tidak ada jobs
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {job.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {job.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {job.primaryKeyword}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {job.scheduleName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.startedAt
                      ? new Date(job.startedAt).toLocaleString('id-ID')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.finishedAt
                      ? new Date(job.finishedAt).toLocaleString('id-ID')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.duration || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                    {job.error || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {job.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(job.id)}
                          disabled={actionLoading === job.id}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === job.id ? '...' : '🔁 Retry'}
                        </button>
                      )}
                      {(job.status === 'PENDING' || job.status === 'FAILED') && (
                        <button
                          onClick={() => handleSkip(job.id)}
                          disabled={actionLoading === job.id}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === job.id ? '...' : '⏭ Skip'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
