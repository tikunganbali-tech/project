'use client'

/**
 * GLOBAL USER ACCESS INDICATOR
 * 
 * Shows role, engine access status, and mode in the topbar
 */

import { useEngineState } from '@/lib/hooks/useEngineState';
import { useSession } from 'next-auth/react';
import { normalizeRole } from '@/lib/permissions';
import { AlertCircle, CheckCircle2, XCircle, Settings } from 'lucide-react';
import Link from 'next/link';

export default function EngineAccessIndicator() {
  const { data: session } = useSession();
  const { engineState, loading, canRunAI, getAIDisableReason } = useEngineState();

  if (!session) return null;

  const userRole = (session.user as any)?.role;
  const normalizedRole = normalizeRole(userRole);
  const roleLabel = normalizedRole === 'super_admin' ? 'Super Admin' : 
                    normalizedRole === 'admin' ? 'Admin' : 
                    normalizedRole === 'viewer' ? 'Viewer' : 'User';

  if (loading || !engineState) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Loading...</span>
      </div>
    );
  }

  const aiStatus = engineState.ai_engine.status;
  const seoStatus = engineState.seo_engine.status;
  const aiDisabled = !canRunAI;
  const disableReason = getAIDisableReason();

  return (
    <div className="flex items-center gap-4 text-xs">
      {/* Role */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Role:</span>
        <span className="font-medium text-gray-700">{roleLabel}</span>
      </div>

      {/* Engine Access */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Engine Access:</span>
        <span className={`font-medium ${aiDisabled ? 'text-red-600' : 'text-green-600'}`}>
          AI={aiStatus === 'ON' && !aiDisabled ? 'ON' : 'DISABLED'}, SEO={seoStatus}
        </span>
      </div>

      {/* Mode */}
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Mode:</span>
        <span className="font-medium text-gray-700">Manual</span>
      </div>

      {/* Warning if disabled */}
      {aiDisabled && (
        <div className="flex items-center gap-1 text-red-600">
          <AlertCircle size={14} />
          <span className="text-xs">
            {disableReason}
          </span>
          <Link 
            href="/admin/system/engine-control"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <Settings size={12} />
            Enable
          </Link>
        </div>
      )}
    </div>
  );
}
