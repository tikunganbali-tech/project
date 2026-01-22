/**
 * STEP P1-3B - DECISION ITEM COMPONENT
 * 
 * Individual decision snapshot display
 * Explains "KENAPA" not "APA"
 */

'use client';

import { CheckCircle, XCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';

export interface DecisionItemProps {
  decision: {
    eventId: string;
    eventKey: string;
    entityType: string;
    entityId?: string | null;
    integration: string;
    decision: 'ALLOW' | 'SKIP';
    reason?: string | null;
    rule: string;
    explanation: string;
    timestamp: string;
    metadata?: Record<string, any>;
  };
}

export default function DecisionItem({ decision }: DecisionItemProps) {
  const getDecisionIcon = () => {
    if (decision.decision === 'ALLOW') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getDecisionColor = () => {
    if (decision.decision === 'ALLOW') {
      return 'bg-green-50 border-green-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  const getIntegrationBadge = () => {
    const colors: Record<string, string> = {
      FACEBOOK: 'bg-blue-100 text-blue-700',
      GOOGLE: 'bg-red-100 text-red-700',
      TIKTOK: 'bg-black text-white',
    };
    return colors[decision.integration] || 'bg-gray-100 text-gray-700';
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

  const getEventName = (eventKey: string) => {
    const names: Record<string, string> = {
      'page_view': 'Page View',
      'view_product': 'View Product',
      'add_to_cart': 'Add to Cart',
      'purchase': 'Purchase',
      'search': 'Search',
    };
    return names[eventKey] || eventKey;
  };

  return (
    <div className={`border rounded-lg p-4 ${getDecisionColor()}`}>
      <div className="flex items-start gap-3">
        {/* Decision Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getDecisionIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {getEventName(decision.eventKey)}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getIntegrationBadge()}`}>
                  {decision.integration}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  decision.decision === 'ALLOW' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {decision.decision}
                </span>
              </div>
              {decision.entityId && (
                <p className="text-sm text-gray-600">
                  Entity: <strong>{decision.entityType}</strong> ({decision.entityId})
                </p>
              )}
            </div>
          </div>

          {/* Rule & Explanation */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Rule: {decision.rule}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-600">{decision.explanation}</p>
              </div>
            </div>

            {decision.reason && (
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">
                    Technical reason: <code className="bg-white/50 px-1 rounded">{decision.reason}</code>
                  </p>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 pt-1 border-t border-gray-200">
              {formatTimestamp(decision.timestamp)} • Event ID: <code className="bg-white/50 px-1 rounded">{decision.eventId}</code>
            </div>
          </div>

          {/* Metadata (collapsible) */}
          {decision.metadata && Object.keys(decision.metadata).length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Show technical details
              </summary>
              <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(decision.metadata, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
