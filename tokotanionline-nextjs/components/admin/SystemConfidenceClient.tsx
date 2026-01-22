/**
 * STEP P1-3C - SYSTEM CONFIDENCE CLIENT
 * 
 * Main client component for System Confidence Panel
 * Owner-friendly, non-technical language
 * 100% observational, no actions
 */

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Shield } from 'lucide-react';
import ConfidenceCard, {
  SystemSafetyCard,
  EngineStabilityCard,
  DecisionExplainabilityCard,
  MarketingDispatchCard,
  ErrorRiskCard,
} from './ConfidenceCard';
import ConfidenceIndicator from './ConfidenceIndicator';

interface ConfidenceSnapshot {
  systemSafety: {
    safeMode: 'ACTIVE' | 'INACTIVE';
    featureFreeze: 'ACTIVE' | 'OFF';
    confidence: 'AMAN' | 'PERHATIAN';
    message: string;
  };
  engineStability: {
    status: 'ONLINE' | 'OFFLINE';
    lastHeartbeat: string | null;
    message: string;
  };
  decisionExplainability: {
    explainablePercent: number;
    status: 'EXPLAINABLE' | 'UNKNOWN_DETECTED';
    message: string;
  };
  marketingDispatchMode: {
    mode: 'DRY-RUN' | 'LIVE';
    eventsToday: number;
    killSwitchRespected: boolean;
    message: string;
  };
  errorRiskSignal: {
    errorSpikeDetected: boolean;
    autoDisableTriggered: boolean;
    message: string;
  };
  timestamp: string;
}

export default function SystemConfidenceClient() {
  const [snapshot, setSnapshot] = useState<ConfidenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchConfidence = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/system/confidence', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch confidence snapshot');
      }

      const data = await response.json();

      if (data.success) {
        setSnapshot(data.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch confidence snapshot');
      }
    } catch (err: any) {
      console.error('Error fetching confidence:', err);
      setError(err.message || 'Failed to load confidence snapshot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfidence();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchConfidence, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate overall confidence
  const getOverallConfidence = (): 'AMAN' | 'PERHATIAN' | 'KRITIS' | 'UNKNOWN' => {
    if (!snapshot) return 'UNKNOWN';

    const { systemSafety, engineStability, decisionExplainability, marketingDispatchMode, errorRiskSignal } = snapshot;

    // If any critical issue
    if (errorRiskSignal.errorSpikeDetected || errorRiskSignal.autoDisableTriggered) {
      return 'KRITIS';
    }

    // If any warning
    if (
      systemSafety.confidence === 'PERHATIAN' ||
      engineStability.status === 'OFFLINE' ||
      decisionExplainability.status === 'UNKNOWN_DETECTED' ||
      !marketingDispatchMode.killSwitchRespected
    ) {
      return 'PERHATIAN';
    }

    // All good
    return 'AMAN';
  };

  const getOverallMessage = (): string => {
    if (!snapshot) return 'Memuat data confidence...';

    const confidence = getOverallConfidence();

    switch (confidence) {
      case 'AMAN':
        return 'Sistem aman, terkendali, dan bekerja sesuai aturan. Semua indikator dalam kondisi baik.';
      case 'PERHATIAN':
        return 'Sistem memerlukan perhatian. Beberapa indikator menunjukkan kondisi yang perlu dipantau.';
      case 'KRITIS':
        return 'Sistem memerlukan perhatian segera. Ditemukan error spike atau auto-disable yang aktif.';
      default:
        return 'Status confidence tidak dapat ditentukan.';
    }
  };

  if (loading && !snapshot) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow border p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-800 font-medium mb-2">Error loading confidence snapshot</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchConfidence}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-gray-600 font-medium mb-2">No confidence data available</p>
          <p className="text-gray-500 text-sm">
            Confidence snapshot will appear here once data is available.
          </p>
        </div>
      </div>
    );
  }

  const overallConfidence = getOverallConfidence();
  const overallMessage = getOverallMessage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Confidence</h2>
          <p className="text-gray-600">
            Status keamanan dan kontrol sistem saat ini
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
            </p>
          )}
        </div>
        <button
          onClick={fetchConfidence}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Confidence */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Overall Confidence</h3>
        </div>
        <ConfidenceIndicator 
          status={overallConfidence} 
          message={overallMessage}
          size="lg"
        />
      </div>

      {/* Confidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SystemSafetyCard
          safeMode={snapshot.systemSafety.safeMode}
          featureFreeze={snapshot.systemSafety.featureFreeze}
          confidence={snapshot.systemSafety.confidence}
          message={snapshot.systemSafety.message}
        />

        <EngineStabilityCard
          status={snapshot.engineStability.status}
          lastHeartbeat={snapshot.engineStability.lastHeartbeat}
          message={snapshot.engineStability.message}
        />

        <DecisionExplainabilityCard
          explainablePercent={snapshot.decisionExplainability.explainablePercent}
          status={snapshot.decisionExplainability.status}
          message={snapshot.decisionExplainability.message}
        />

        <MarketingDispatchCard
          mode={snapshot.marketingDispatchMode.mode}
          eventsToday={snapshot.marketingDispatchMode.eventsToday}
          killSwitchRespected={snapshot.marketingDispatchMode.killSwitchRespected}
          message={snapshot.marketingDispatchMode.message}
        />

        <ErrorRiskCard
          errorSpikeDetected={snapshot.errorRiskSignal.errorSpikeDetected}
          autoDisableTriggered={snapshot.errorRiskSignal.autoDisableTriggered}
          message={snapshot.errorRiskSignal.message}
        />
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Catatan:</strong> Panel ini 100% observasional. Tidak ada tombol aksi, retry, atau execute.
          Semua informasi read-only dan tidak dapat diubah dari sini.
        </p>
      </div>
    </div>
  );
}
