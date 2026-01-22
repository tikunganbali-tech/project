'use client'

/**
 * FEATURE ACCESS BADGE
 * 
 * Shows warning when AI generation is disabled
 */

import { useEngineState } from '@/lib/hooks/useEngineState';
import { AlertTriangle, Settings } from 'lucide-react';
import Link from 'next/link';

interface FeatureAccessBadgeProps {
  feature: 'ai' | 'seo';
  className?: string;
}

export default function FeatureAccessBadge({ feature, className = '' }: FeatureAccessBadgeProps) {
  const { engineState, loading, canRunAI, getAIDisableReason } = useEngineState();

  if (loading || !engineState) {
    return null;
  }

  const isDisabled = feature === 'ai' ? !canRunAI : engineState.seo_engine.status !== 'ON';
  const reason = feature === 'ai' ? getAIDisableReason() : 'SEO Engine belum aktif';

  if (!isDisabled) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3 ${className}`}>
      <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <div className="font-semibold text-yellow-800 mb-1">
          {feature === 'ai' ? '⚠ AI Generation Disabled' : '⚠ SEO Engine Disabled'}
        </div>
        <div className="text-sm text-yellow-700 mb-2">
          <div className="font-medium">Reason:</div>
          <div>{reason || `${feature === 'ai' ? 'AI' : 'SEO'} Engine OFF`}</div>
        </div>
        <Link
          href="/admin/system/engine-control"
          className="text-sm text-yellow-800 hover:text-yellow-900 font-medium flex items-center gap-1 underline"
        >
          <Settings size={14} />
          Open Engine Control
        </Link>
      </div>
    </div>
  );
}
