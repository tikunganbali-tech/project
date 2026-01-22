/**
 * LAST ACTION TIMESTAMP
 * Shows last action timestamp with real-time updates
 */

'use client';

import { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

export interface LastActionInfo {
  timestamp: Date;
  action: string;
  user?: string;
  status?: 'success' | 'failed' | 'pending';
  details?: Record<string, any>;
}

interface AdminLastActionProps {
  source?: string; // Filter by source (e.g., 'engine', 'system', 'user')
  showRefresh?: boolean;
  pollInterval?: number;
  className?: string;
}

export default function AdminLastAction({
  source,
  showRefresh = true,
  pollInterval = 10000, // 10 seconds (increased for performance)
  className = '',
}: AdminLastActionProps) {
  const [lastAction, setLastAction] = useState<LastActionInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLastAction = async () => {
    if (!mounted) return;
    
    try {
      setIsRefreshing(true);
      const params = new URLSearchParams();
      if (source) params.set('source', source);
      params.set('limit', '1');

      // Try to get from engine logs first with timeout
      let response = await fetch(`/api/admin/engines/status?${params.toString()}&limit=1`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        // Fallback to system status
        response = await fetch('/api/admin/monitoring/health', {
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        });
      }

      if (response.ok) {
        const data = await response.json();
        
        // Extract last action from various possible formats
        let timestamp: Date | null = null;
        let action: string = 'No recent actions';
        let status: 'success' | 'failed' | 'pending' = 'success';

        // Try to get last log from engines data
        if (data.engines && Array.isArray(data.engines) && data.engines.length > 0) {
          const allLogs = data.engines.flatMap((e: any) => e.recentLogs || []);
          if (allLogs.length > 0) {
            const lastLog = allLogs.sort((a: any, b: any) => 
              new Date(b.executedAt || b.createdAt).getTime() - new Date(a.executedAt || a.createdAt).getTime()
            )[0];
            timestamp = new Date(lastLog.executedAt || lastLog.createdAt);
            action = lastLog.message || lastLog.task_name || 'Action executed';
            status = lastLog.status === 'failed' || lastLog.status === 'ERROR' ? 'failed' : 
                     lastLog.status === 'running' ? 'pending' : 'success';
          }
        }
        
        // Fallback to other fields
        if (!timestamp) {
          if (data.lastLog) {
            timestamp = new Date(data.lastLog.executedAt || data.lastLog.createdAt);
            action = data.lastLog.message || data.lastLog.task_name || 'Action executed';
            status = data.lastLog.status === 'failed' ? 'failed' : data.lastLog.status === 'running' ? 'pending' : 'success';
          } else if (data.lastRunAt) {
            timestamp = new Date(data.lastRunAt);
            action = 'System activity';
          } else if (data.timestamp) {
            timestamp = new Date(data.timestamp);
            action = data.action || 'System update';
          }
        }

        if (timestamp) {
          setLastAction({
            timestamp,
            action,
            status,
            details: data,
          });
        }
      }
    } catch (error) {
      // Silent fail
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;
    
    // Initial fetch with delay to prevent blocking initial render
    const initialTimeout = setTimeout(() => {
      if (isMounted) fetchLastAction();
    }, 300);

    // Poll for updates
    const interval = setInterval(() => {
      if (isMounted) fetchLastAction();
    }, pollInterval);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [source, pollInterval, mounted]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  if (!lastAction) {
    return (
      <div className={`inline-flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <Clock className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  const statusColor =
    lastAction.status === 'failed'
      ? 'text-red-600'
      : lastAction.status === 'pending'
      ? 'text-yellow-600'
      : 'text-green-600';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Clock className="h-4 w-4 text-gray-500" />
      <div className="flex flex-col">
        <span className="text-sm text-gray-600">{lastAction.action}</span>
        <span className={`text-xs ${statusColor}`}>
          {formatTimeAgo(lastAction.timestamp)}
        </span>
      </div>
      {showRefresh && (
        <button
          onClick={fetchLastAction}
          disabled={isRefreshing}
          className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3 w-3 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}

