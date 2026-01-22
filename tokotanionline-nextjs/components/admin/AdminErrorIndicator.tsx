/**
 * INLINE ERROR INDICATOR
 * Shows inline errors with real-time updates
 */

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X, AlertTriangle } from 'lucide-react';

export interface ErrorInfo {
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: Date;
  source?: string;
  details?: Record<string, any>;
  dismissible?: boolean;
}

interface AdminErrorIndicatorProps {
  source?: string; // Filter errors by source (e.g., 'engine', 'api', 'system')
  showInline?: boolean; // Show inline or as badge
  maxErrors?: number;
  pollInterval?: number;
  className?: string;
}

export default function AdminErrorIndicator({
  source,
  showInline = true,
  maxErrors = 5,
  pollInterval = 5000, // 5 seconds (increased for performance)
  className = '',
}: AdminErrorIndicatorProps) {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;
    
    const fetchErrors = async () => {
      if (!mounted) return;
      
      try {
        // Fetch from engines status endpoint with timeout
        const response = await fetch('/api/admin/engines/status', {
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          const data = await response.json();
          // Extract alerts from engine data or use alerts array
          let alerts: any[] = [];
          
          if (data.alerts) {
            alerts = data.alerts;
          } else if (data.engines) {
            // Extract alerts from engine health data
            alerts = data.engines
              .filter((e: any) => e.status === 'critical' || e.status === 'warning')
              .map((e: any) => ({
                id: e.engineName || e.id,
                message: e.lastErrorMessage || `${e.engineName || 'Engine'} is ${e.status}`,
                severity: e.status === 'critical' ? 'critical' : 'warning',
                createdAt: e.lastFailureAt || e.lastRunAt || new Date().toISOString(),
                engineName: e.engineName,
                subsystem: e.subsystem,
              }));
          }

          // Filter by source if provided
          let filteredAlerts = alerts;
          if (source) {
            filteredAlerts = alerts.filter((a: any) => 
              a.engineName === source || a.subsystem === source
            );
          }

          // Limit to maxErrors
          filteredAlerts = filteredAlerts.slice(0, maxErrors);

          const errorInfos: ErrorInfo[] = filteredAlerts
            .filter((alert: any) => !dismissedIds.has(alert.id))
            .map((alert: any) => ({
              id: alert.id || alert.engineName,
              message: alert.message || alert.title || `${alert.engineName} error`,
              severity: alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info',
              timestamp: new Date(alert.createdAt || alert.timestamp || new Date()),
              source: alert.engineName || alert.subsystem || source,
              details: alert.details ? (typeof alert.details === 'string' ? JSON.parse(alert.details) : alert.details) : undefined,
              dismissible: true,
            }));

          setErrors(errorInfos);
        }
      } catch (error) {
        // Silent fail - don't show error about error fetching
      }
    };

    // Initial fetch with delay to prevent blocking initial render
    const initialTimeout = setTimeout(() => {
      if (isMounted) fetchErrors();
    }, 200);

    // Poll for updates
    const interval = setInterval(() => {
      if (isMounted) fetchErrors();
    }, pollInterval);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [source, maxErrors, pollInterval, dismissedIds, mounted]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...Array.from(prev), id]));
    setErrors((prev) => prev.filter((e) => e.id !== id));
  };

  if (errors.length === 0) {
    return null;
  }

  if (!showInline) {
    // Show as badge
    const hasErrors = errors.some((e) => e.severity === 'error');
    const hasWarnings = errors.some((e) => e.severity === 'warning');

    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {hasErrors && (
          <div className="relative">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
              {errors.filter((e) => e.severity === 'error').length}
            </span>
          </div>
        )}
        {hasWarnings && !hasErrors && (
          <div className="relative">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-600 text-white text-xs rounded-full flex items-center justify-center">
              {errors.filter((e) => e.severity === 'warning').length}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Show inline errors
  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error) => (
        <div
          key={error.id}
          className={`flex items-start gap-3 p-3 rounded-lg border ${
            error.severity === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : error.severity === 'warning'
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <AlertCircle
            className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
              error.severity === 'error'
                ? 'text-red-600'
                : error.severity === 'warning'
                ? 'text-yellow-600'
                : 'text-blue-600'
            }`}
          />
          <div className="flex-1 min-w-0">
            {error.source && (
              <div className="text-xs font-medium opacity-75 mb-1">{error.source}</div>
            )}
            <div className="text-sm font-medium">{error.message}</div>
            {error.details && (
              <div className="text-xs mt-1 opacity-75">
                {JSON.stringify(error.details, null, 2)}
              </div>
            )}
            <div className="text-xs mt-1 opacity-50">
              {error.timestamp.toLocaleTimeString()}
            </div>
          </div>
          {error.dismissible && (
            <button
              onClick={() => handleDismiss(error.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

