/**
 * STEP P1-3C - CONFIDENCE INDICATOR COMPONENT
 * 
 * Visual indicator for confidence status
 * Owner-friendly, non-technical
 */

'use client';

import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface ConfidenceIndicatorProps {
  status: 'AMAN' | 'PERHATIAN' | 'KRITIS' | 'UNKNOWN';
  message: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ConfidenceIndicator({ 
  status, 
  message, 
  size = 'md' 
}: ConfidenceIndicatorProps) {
  const getIcon = () => {
    const iconClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
    
    switch (status) {
      case 'AMAN':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case 'PERHATIAN':
        return <AlertTriangle className={`${iconClass} text-yellow-600`} />;
      case 'KRITIS':
        return <XCircle className={`${iconClass} text-red-600`} />;
      default:
        return <Info className={`${iconClass} text-gray-600`} />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'AMAN':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'PERHATIAN':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'KRITIS':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getBadge = () => {
    switch (status) {
      case 'AMAN':
        return '🟢 Aman';
      case 'PERHATIAN':
        return '🟡 Perhatian';
      case 'KRITIS':
        return '🔴 Kritis';
      default:
        return '⚪ Unknown';
    }
  };

  return (
    <div className={`border rounded-lg p-3 flex items-start gap-3 ${getColor()}`}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{getBadge()}</span>
        </div>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
