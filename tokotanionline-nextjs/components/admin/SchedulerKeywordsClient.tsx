/**
 * PHASE UI-A: Keywords Management Client Component
 * 
 * Features:
 * - Textarea input: 1 line = 1 primary keyword
 * - Secondary keywords: CSV / |
 * - Table showing: Primary, Secondary, Status, Last Error, Actions
 * - Retry and Delete actions
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, RefreshCw, RotateCcw, Trash2, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Keyword {
  id: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  lastError: string | null;
  scheduledPublishAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SchedulerKeywordsClientProps {
  scheduleId: string;
  scheduleName: string;
}

export default function SchedulerKeywordsClient({
  scheduleId,
  scheduleName,
}: SchedulerKeywordsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Input states
  const [primaryKeywordsInput, setPrimaryKeywordsInput] = useState('');
  const [secondaryKeywordsInput, setSecondaryKeywordsInput] = useState('');

  // Polling interval: 12 seconds
  useEffect(() => {
    loadKeywords();

    const interval = setInterval(() => {
      loadKeywords(true); // Silent refresh
    }, 12000);

    return () => clearInterval(interval);
  }, [scheduleId]);

  const loadKeywords = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/admin/schedules/${scheduleId}/keywords`);
      const data = await response.json();

      if (data.success) {
        setKeywords(data.keywords);
      } else {
        setError(data.error || 'Gagal memuat keywords');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeywords = async () => {
    if (!primaryKeywordsInput.trim()) {
      setError('Masukkan minimal satu primary keyword');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Parse primary keywords (1 line = 1 keyword)
      const primaryLines = primaryKeywordsInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Parse secondary keywords (CSV or |)
      const secondaryArray = secondaryKeywordsInput
        .split(/[,|]/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Build keywords array
      const keywordsToAdd = primaryLines.map(primary => ({
        primaryKeyword: primary,
        secondaryKeywords: secondaryArray.length > 0 ? secondaryArray : [],
      }));

      const response = await fetch(`/api/admin/schedules/${scheduleId}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywordsToAdd }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear inputs
        setPrimaryKeywordsInput('');
        setSecondaryKeywordsInput('');
        await loadKeywords();
      } else {
        setError(data.error || 'Gagal menambahkan keywords');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menambahkan keywords');
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = async (keywordId: string) => {
    try {
      const response = await fetch(`/api/admin/schedules/${scheduleId}/keywords/${keywordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING', lastError: null }),
      });

      const data = await response.json();

      if (data.success) {
        await loadKeywords();
      } else {
        alert(data.error || 'Gagal retry keyword');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat retry keyword');
    }
  };

  const handleDelete = async (keywordId: string) => {
    if (!confirm('Yakin ingin menghapus keyword ini?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/schedules/${scheduleId}/keywords/${keywordId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await loadKeywords();
      } else {
        alert(data.error || 'Gagal menghapus keyword');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus keyword');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            PENDING
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            PROCESSING
          </span>
        );
      case 'DONE':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            DONE
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            FAILED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/scheduler"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Keywords Management</h1>
          <p className="text-sm text-gray-600 mt-1">{scheduleName}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Input Keywords */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Tambah Keywords</h2>

        {/* Primary Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Keywords *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            1 baris = 1 primary keyword
          </p>
          <textarea
            value={primaryKeywordsInput}
            onChange={(e) => setPrimaryKeywordsInput(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="contoh keyword 1&#10;contoh keyword 2&#10;contoh keyword 3"
          />
        </div>

        {/* Secondary Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Secondary Keywords (Opsional)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Pisahkan dengan koma (,) atau pipe (|). Akan diterapkan ke semua primary keywords.
          </p>
          <input
            type="text"
            value={secondaryKeywordsInput}
            onChange={(e) => setSecondaryKeywordsInput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="keyword1, keyword2, keyword3"
          />
        </div>

        <button
          onClick={handleAddKeywords}
          disabled={saving || !primaryKeywordsInput.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Tambah Keywords
            </>
          )}
        </button>
      </div>

      {/* Keywords Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Daftar Keywords</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : keywords.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">Belum ada keywords. Tambahkan keywords di atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primary Keyword</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Secondary Keywords</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Error</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {keywords.map((keyword) => (
                  <tr key={keyword.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{keyword.primaryKeyword}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {keyword.secondaryKeywords.length > 0 ? (
                          keyword.secondaryKeywords.join(', ')
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(keyword.status)}
                    </td>
                    <td className="px-6 py-4">
                      {keyword.lastError ? (
                        <div className="text-sm text-red-600 max-w-xs truncate" title={keyword.lastError}>
                          {keyword.lastError}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {keyword.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(keyword.id)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center gap-1"
                            title="Retry"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(keyword.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
