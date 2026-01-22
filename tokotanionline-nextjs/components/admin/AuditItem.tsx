/**
 * STEP P1-3A - AUDIT ITEM COMPONENT
 * 
 * Individual audit entry display
 * Human-readable, non-technical language
 */

'use client';

import { CheckCircle, XCircle, AlertTriangle, Clock, Ban, User, Target, Calendar } from 'lucide-react';

export interface AuditItemProps {
  entry: {
    id: string;
    timestamp: string;
    source: 'ADMIN' | 'ENGINE' | 'SYSTEM' | 'MARKETING';
    category: 'CONTENT' | 'PRODUCT' | 'MARKETING' | 'SYSTEM' | 'ACTION';
    action: string;
    actor: string | null;
    target: string | null;
    status: 'SUCCESS' | 'SKIPPED' | 'BLOCKED' | 'PENDING' | 'FAILED';
    reason: string | null;
    metadata: Record<string, any>;
  };
}

export default function AuditItem({ entry }: AuditItemProps) {
  const getStatusIcon = () => {
    switch (entry.status) {
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'BLOCKED':
        return <Ban className="h-5 w-5 text-red-500" />;
      case 'SKIPPED':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (entry.status) {
      case 'SUCCESS':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'FAILED':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'BLOCKED':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'SKIPPED':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'PENDING':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSourceBadge = () => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-700',
      ENGINE: 'bg-blue-100 text-blue-700',
      SYSTEM: 'bg-gray-100 text-gray-700',
      MARKETING: 'bg-green-100 text-green-700',
    };
    return colors[entry.source] || 'bg-gray-100 text-gray-700';
  };

  const getCategoryBadge = () => {
    const colors = {
      CONTENT: 'bg-indigo-100 text-indigo-700',
      PRODUCT: 'bg-orange-100 text-orange-700',
      MARKETING: 'bg-green-100 text-green-700',
      SYSTEM: 'bg-gray-100 text-gray-700',
      ACTION: 'bg-purple-100 text-purple-700',
    };
    return colors[entry.category] || 'bg-gray-100 text-gray-700';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Action */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-medium text-gray-900">{entry.action}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getSourceBadge()}`}>
                {entry.source}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryBadge()}`}>
                {entry.category}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1 text-sm text-gray-600">
            {entry.actor && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>By: <strong>{entry.actor}</strong></span>
              </div>
            )}

            {entry.target && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-400" />
                <span>Target: <strong>{entry.target}</strong></span>
              </div>
            )}

            {entry.reason && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-gray-400 mt-0.5" />
                <span>{entry.reason}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{formatTimestamp(entry.timestamp)}</span>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {new Date(entry.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Metadata (collapsible) */}
          {Object.keys(entry.metadata).length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Show details
              </summary>
              <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
