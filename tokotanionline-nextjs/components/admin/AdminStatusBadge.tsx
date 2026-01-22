/**
 * REAL-TIME STATUS BADGE
 * Displays real-time status with polling from backend
 */

'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';

export type StatusType = 'healthy' | 'warning' | 'critical' | 'loading' | 'unknown';

export interface StatusInfo {
  status: StatusType;
  message?: string;
  lastChecked?: Date;
  details?: Record<string, any>;
}

interface AdminStatusBadgeProps {
  statusType?: 'system' | 'engine' | 'service';
  engineName?: string;
  pollInterval?: number; // milliseconds
  onStatusChange?: (status: StatusInfo) => void;
  className?: string;
}

export default function AdminStatusBadge({
  statusType = 'system',
  engineName,
  pollInterval = 5000, // 5 seconds default
  onStatusChange,
  className = '',
}: AdminStatusBadgeProps) {
  const [status, setStatus] = useState<StatusInfo>({
    status: 'loading',
    lastChecked: new Date(),
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchStatus = async () => {
      if (!isMounted) return;
      
      try {
        let response: Response;
        
        if (statusType === 'system') {
          response = await fetch('/api/admin/monitoring/health', {
            cache: 'no-store',
            signal: AbortSignal.timeout(3000), // 3 second timeout
          });
        } else if (statusType === 'engine' && engineName) {
          response = await fetch(`/api/admin/engines/status?engineName=${engineName}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(3000),
          });
        } else {
          // Default to system status
          response = await fetch('/api/admin/monitoring/health', {
            cache: 'no-store',
            signal: AbortSignal.timeout(3000),
          });
        }

        if (response.ok) {
          const data = await response.json();
          
          // Extract status from various possible response formats
          let status: StatusType = 'unknown';
          let message: string | undefined;
          
          if (statusType === 'system') {
            // System health format: { health: { status: 'healthy' | 'warning' | 'critical' } }
            if (data.health?.status) {
              status = data.health.status === 'healthy' ? 'healthy' :
                      data.health.status === 'warning' ? 'warning' :
                      data.health.status === 'critical' ? 'critical' : 'unknown';
              message = data.health.message;
            } else if (data.status) {
              status = data.status === 'healthy' ? 'healthy' :
                      data.status === 'warning' ? 'warning' :
                      data.status === 'critical' ? 'critical' : 'unknown';
              message = data.message;
            }
          } else if (statusType === 'engine') {
            // Engine status format: { engine: { status: 'healthy' | 'warning' | 'critical' } }
            if (data.engine?.status) {
              status = data.engine.status === 'healthy' ? 'healthy' :
                      data.engine.status === 'warning' ? 'warning' :
                      data.engine.status === 'critical' ? 'critical' : 'unknown';
              message = data.engine.lastErrorMessage;
            } else if (data.status) {
              status = data.status === 'healthy' ? 'healthy' :
                      data.status === 'warning' ? 'warning' :
                      data.status === 'critical' ? 'critical' : 'unknown';
              message = data.message;
            }
          }
          
          const newStatus: StatusInfo = {
            status,
            message,
            lastChecked: new Date(),
            details: data.health || data.engine || data,
          };
          
          setStatus(newStatus);
          onStatusChange?.(newStatus);
        } else {
          setStatus({
            status: 'unknown',
            message: 'Failed to fetch status',
            lastChecked: new Date(),
          });
        }
      } catch (error) {
        setStatus({
          status: 'critical',
          message: 'Connection error',
          lastChecked: new Date(),
        });
      }
    };

    // Initial fetch with delay to prevent blocking initial render
    const initialTimeout = setTimeout(() => {
      if (isMounted) fetchStatus();
    }, 100);

    // Poll for updates
    const interval = setInterval(() => {
      if (isMounted) fetchStatus();
    }, pollInterval);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [statusType, engineName, pollInterval, onStatusChange]);

  const getStatusConfig = () => {
    switch (status.status) {
      case 'healthy':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Healthy',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Warning',
        };
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Critical',
        };
      case 'loading':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: 'Loading',
        };
      default:
        return {
          icon: Activity,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          label: 'Unknown',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${className}`}>
      <Icon
        className={`h-4 w-4 ${config.color} ${status.status === 'loading' ? 'animate-spin' : ''}`}
      />
      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      {status.message && (
        <span className={`text-xs ${config.color} opacity-75`}>({status.message})</span>
      )}
    </div>
  );
}

