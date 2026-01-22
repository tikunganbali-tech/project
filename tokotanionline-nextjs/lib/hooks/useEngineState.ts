/**
 * ENGINE CONTROL CENTER - React Hook
 * 
 * Hook untuk check engine state dan canRunAI
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission, normalizeRole } from '@/lib/permissions';

type EngineState = {
  ai_engine: { status: 'ON' | 'OFF'; reason?: string };
  seo_engine: { status: 'ON' | 'OFF'; reason?: string };
  scheduler: { status: 'ON' | 'OFF' };
  access_mode: { admin: boolean; editor: boolean };
  last_updated_at: string;
};

export function useEngineState() {
  const { data: session } = useSession();
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEngineState();
    // Refresh every 30 seconds
    const interval = setInterval(fetchEngineState, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEngineState = async () => {
    try {
      const response = await fetch('/api/admin/engine/state');
      if (!response.ok) {
        throw new Error('Failed to fetch engine state');
      }
      const data = await response.json();
      setEngineState(data.engine_state);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load engine state');
    } finally {
      setLoading(false);
    }
  };

  const userRole = (session?.user as any)?.role;
  const normalizedRole = normalizeRole(userRole);

  // Calculate canRunAI
  const canRunAI = 
    engineState?.ai_engine.status === 'ON' &&
    engineState?.access_mode.admin === true &&
    (normalizedRole === 'admin' || normalizedRole === 'super_admin');

  // Get disable reason for AI
  const getAIDisableReason = (): string | null => {
    if (!engineState) return 'Engine state belum dimuat';
    if (engineState.ai_engine.status !== 'ON') {
      return engineState.ai_engine.reason || 'AI Engine belum aktif';
    }
    if (!engineState.access_mode.admin) {
      return 'Akses AI belum diizinkan untuk role Admin';
    }
    if (normalizedRole !== 'admin' && normalizedRole !== 'super_admin') {
      return 'Akses AI belum diizinkan untuk role Anda';
    }
    return null;
  };

  return {
    engineState,
    loading,
    error,
    canRunAI,
    getAIDisableReason,
    refresh: fetchEngineState,
  };
}
