'use client'

/**
 * ENGINE CONTROL CENTER - Client Component
 * 
 * UI Cockpit for engine state management
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/permissions';
import { Power, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

type EngineState = {
  ai_engine: { status: 'ON' | 'OFF'; reason?: string };
  seo_engine: { status: 'ON' | 'OFF'; reason?: string };
  scheduler: { status: 'ON' | 'OFF' };
  access_mode: { admin: boolean; editor: boolean };
  last_updated_at: string;
};

export default function EngineControlClient() {
  const { data: session } = useSession();
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userRole = (session?.user as any)?.role;
  const canControl = hasPermission(userRole, 'engine.control');

  useEffect(() => {
    fetchEngineState();
  }, []);

  const fetchEngineState = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/engine/state');
      if (!response.ok) {
        throw new Error('Failed to fetch engine state');
      }
      const data = await response.json();
      setEngineState(data.engine_state);
    } catch (err: any) {
      setError(err.message || 'Failed to load engine state');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (engine: 'ai' | 'seo' | 'scheduler') => {
    if (!canControl) {
      setError('Anda tidak memiliki izin untuk mengontrol engine');
      return;
    }

    if (!engineState) return;

    const currentStatus = 
      engine === 'ai' ? engineState.ai_engine.status :
      engine === 'seo' ? engineState.seo_engine.status :
      engineState.scheduler.status;

    const newStatus = currentStatus === 'ON' ? 'OFF' : 'ON';

    try {
      setToggling(engine);
      setError(null);

      const response = await fetch('/api/admin/engine/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle engine');
      }

      const data = await response.json();
      setEngineState(data.engine_state);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle engine');
    } finally {
      setToggling(null);
    }
  };

  const handleAccessToggle = async (role: 'admin' | 'editor', allow: boolean) => {
    if (!canControl) {
      setError('Anda tidak memiliki izin untuk mengontrol akses');
      return;
    }

    try {
      setError(null);

      const response = await fetch('/api/admin/engine/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, allow }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update access');
      }

      const data = await response.json();
      setEngineState(data.engine_state);
    } catch (err: any) {
      setError(err.message || 'Failed to update access');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!engineState) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="text-center text-gray-500">
          {error || 'Failed to load engine state'}
        </div>
      </div>
    );
  }

  const EngineRow = ({ 
    label, 
    engine, 
    status, 
    reason 
  }: { 
    label: string; 
    engine: 'ai' | 'seo' | 'scheduler';
    status: 'ON' | 'OFF';
    reason?: string;
  }) => {
    const isOn = status === 'ON';
    const isToggling = toggling === engine;

    return (
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isOn ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div>
            <div className="font-semibold text-gray-900">{label}</div>
            {reason && (
              <div className="text-sm text-gray-500 mt-1">{reason}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${isOn ? 'text-green-600' : 'text-gray-500'}`}>
            {status}
          </span>
          {canControl && (
            <button
              onClick={() => handleToggle(engine)}
              disabled={isToggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isOn
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Power size={16} />
              {isToggling ? 'Processing...' : isOn ? 'Turn OFF' : 'Turn ON'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Engine Status */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Engine Status</h2>
        <div className="space-y-3">
          <EngineRow
            label="AI Engine"
            engine="ai"
            status={engineState.ai_engine.status}
            reason={engineState.ai_engine.reason}
          />
          <EngineRow
            label="SEO Engine"
            engine="seo"
            status={engineState.seo_engine.status}
            reason={engineState.seo_engine.reason}
          />
          <EngineRow
            label="Scheduler"
            engine="scheduler"
            status={engineState.scheduler.status}
          />
        </div>
      </div>

      {/* Access Matrix */}
      {canControl && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Matrix</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={engineState.access_mode.admin}
                  onChange={(e) => handleAccessToggle('admin', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label className="font-medium text-gray-900">Admin can run AI</label>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={engineState.access_mode.editor}
                  onChange={(e) => handleAccessToggle('editor', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <label className="font-medium text-gray-900">Editor can run AI</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-sm text-gray-500">
        Last updated: {new Date(engineState.last_updated_at).toLocaleString()}
      </div>
    </div>
  );
}
