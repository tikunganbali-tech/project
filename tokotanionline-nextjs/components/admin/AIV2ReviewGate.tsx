/**
 * PHASE 4: Review Gate (Human-in-the-loop)
 * 
 * Admin tidak mengedit teks
 * Admin hanya:
 * - Menerima versi baru
 * - Publish / reject
 * 
 * Keputusan tercatat (audit trail)
 */

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Lock } from 'lucide-react';

interface QCArtefact {
  pageId: string;
  version: number;
  qcStatus: 'LAYAK' | 'PERLU_REVISI';
  seoReport: {
    score: number;
    issues: Array<{
      type: string;
      severity: string;
      message: string;
      recommendation: string;
    }>;
    recommendations: Array<{
      type: string;
      message: string;
      action: string;
    }>;
  };
  adminDecision?: {
    decision: 'ACCEPT' | 'REJECT';
    reason?: string;
    adminId?: string;
    timestamp: string;
  };
  timestamp: string;
}

interface AIV2ReviewGateProps {
  pageId: string;
  version: number;
  onDecision?: (decision: 'ACCEPT' | 'REJECT') => void;
}

export default function AIV2ReviewGate({
  pageId,
  version,
  onDecision,
}: AIV2ReviewGateProps) {
  const [qcData, setQcData] = useState<QCArtefact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'ACCEPT' | 'REJECT' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQCData();
  }, [pageId, version]);

  const loadQCData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/ai-v2/qc?pageId=${pageId}&version=${version}`);
      if (!response.ok) {
        throw new Error('Failed to load QC data');
      }
      const data = await response.json();
      setQcData(data);
      
      // If already has decision, set it
      if (data.adminDecision) {
        setDecision(data.adminDecision.decision);
        setReason(data.adminDecision.reason || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!decision) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/ai-v2/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          version,
          decision,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit decision');
      }

      // Reload QC data to show updated decision
      await loadQCData();

      if (onDecision) {
        onDecision(decision);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-600">
        Loading QC data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!qcData) {
    return (
      <div className="p-4 text-center text-gray-600">
        No QC data found
      </div>
    );
  }

  const hasDecision = !!qcData.adminDecision;
  const isLayak = qcData.qcStatus === 'LAYAK';

  return (
    <div className="space-y-6">
      {/* QC Status */}
      <div className={`p-4 rounded-lg border-2 ${
        isLayak 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {isLayak ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-yellow-600" />
          )}
          <h3 className="text-lg font-semibold">
            QC Status: {qcData.qcStatus}
          </h3>
        </div>
        <p className="text-sm text-gray-700">
          SEO Score: <span className="font-bold">{qcData.seoReport.score}/100</span>
        </p>
      </div>

      {/* SEO Report */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">SEO Quality Control Report</h3>
        
        {/* Issues */}
        {qcData.seoReport.issues.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Issues Found:</h4>
            <div className="space-y-2">
              {qcData.seoReport.issues.map((issue, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      issue.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                      issue.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {issue.severity}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{issue.type}</span>
                  </div>
                  <p className="text-sm text-gray-700">{issue.message}</p>
                  <p className="text-xs text-gray-600 mt-1">💡 {issue.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {qcData.seoReport.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recommendations:</h4>
            <div className="space-y-2">
              {qcData.seoReport.recommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">{rec.message}</p>
                  <p className="text-xs text-gray-600 mt-1">Action: {rec.action}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Gate - PHASE 4: Admin hanya accept/reject */}
      {!hasDecision && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold">Review Gate</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            PHASE 4: Admin tidak mengedit teks. Hanya menerima atau menolak versi ini.
          </p>

          {/* Decision Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision *
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setDecision('ACCEPT')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition ${
                    decision === 'ACCEPT'
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
                  }`}
                >
                  <CheckCircle className="h-5 w-5 inline mr-2" />
                  Accept & Publish
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('REJECT')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition ${
                    decision === 'REJECT'
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-red-300'
                  }`}
                >
                  <XCircle className="h-5 w-5 inline mr-2" />
                  Reject
                </button>
              </div>
            </div>

            {/* Reason (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Alasan keputusan (untuk audit trail)..."
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitDecision}
              disabled={!decision || submitting}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Submitting...' : 'Submit Decision'}
            </button>
          </div>
        </div>
      )}

      {/* Existing Decision */}
      {hasDecision && qcData.adminDecision && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Decision Recorded</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Decision:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                qcData.adminDecision.decision === 'ACCEPT'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {qcData.adminDecision.decision}
              </span>
            </div>
            {qcData.adminDecision.reason && (
              <div>
                <span className="font-medium">Reason:</span>
                <p className="text-sm text-gray-700 mt-1">{qcData.adminDecision.reason}</p>
              </div>
            )}
            <div>
              <span className="font-medium">Timestamp:</span>
              <p className="text-sm text-gray-700 mt-1">
                {new Date(qcData.adminDecision.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
