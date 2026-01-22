/**
 * STEP P1-3C - CONFIDENCE CARD COMPONENT
 * 
 * Individual confidence metric card
 * Owner-friendly, non-technical language
 */

'use client';

import { Shield, Cpu, Brain, Send, AlertTriangle } from 'lucide-react';
import ConfidenceIndicator from './ConfidenceIndicator';

export interface ConfidenceCardProps {
  title: string;
  icon: React.ReactNode;
  status: 'AMAN' | 'PERHATIAN' | 'KRITIS' | 'UNKNOWN';
  message: string;
  details?: Array<{ label: string; value: string | number | boolean }>;
  className?: string;
}

export default function ConfidenceCard({
  title,
  icon,
  status,
  message,
  details,
  className = '',
}: ConfidenceCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Status Indicator */}
      <div className="mb-4">
        <ConfidenceIndicator status={status} message={message} size="sm" />
      </div>

      {/* Details */}
      {details && details.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{detail.label}:</span>
                <span className="font-medium text-gray-900">
                  {typeof detail.value === 'boolean' 
                    ? detail.value ? 'Ya' : 'Tidak'
                    : detail.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Predefined card types for common confidence metrics
export function SystemSafetyCard({ 
  safeMode, 
  featureFreeze, 
  confidence, 
  message 
}: {
  safeMode: 'ACTIVE' | 'INACTIVE';
  featureFreeze: 'ACTIVE' | 'OFF';
  confidence: 'AMAN' | 'PERHATIAN';
  message: string;
}) {
  return (
    <ConfidenceCard
      title="System Safety"
      icon={<Shield className="h-5 w-5 text-gray-600" />}
      status={confidence}
      message={message}
      details={[
        { label: 'SAFE_MODE', value: safeMode },
        { label: 'FEATURE_FREEZE', value: featureFreeze },
      ]}
    />
  );
}

export function EngineStabilityCard({
  status,
  lastHeartbeat,
  message,
}: {
  status: 'ONLINE' | 'OFFLINE';
  lastHeartbeat: string | null;
  message: string;
}) {
  return (
    <ConfidenceCard
      title="Engine Stability"
      icon={<Cpu className="h-5 w-5 text-gray-600" />}
      status={status === 'ONLINE' ? 'AMAN' : 'PERHATIAN'}
      message={message}
      details={lastHeartbeat ? [
        { label: 'Status', value: status },
        { label: 'Last Heartbeat', value: new Date(lastHeartbeat).toLocaleString('id-ID') },
      ] : [
        { label: 'Status', value: status },
      ]}
    />
  );
}

export function DecisionExplainabilityCard({
  explainablePercent,
  status,
  message,
}: {
  explainablePercent: number;
  status: 'EXPLAINABLE' | 'UNKNOWN_DETECTED';
  message: string;
}) {
  return (
    <ConfidenceCard
      title="Decision Explainability"
      icon={<Brain className="h-5 w-5 text-gray-600" />}
      status={status === 'EXPLAINABLE' ? 'AMAN' : 'PERHATIAN'}
      message={message}
      details={[
        { label: 'Explainable', value: `${explainablePercent}%` },
        { label: 'Status', value: status },
      ]}
    />
  );
}

export function MarketingDispatchCard({
  mode,
  eventsToday,
  killSwitchRespected,
  message,
}: {
  mode: 'DRY-RUN' | 'LIVE';
  eventsToday: number;
  killSwitchRespected: boolean;
  message: string;
}) {
  return (
    <ConfidenceCard
      title="Marketing Dispatch Mode"
      icon={<Send className="h-5 w-5 text-gray-600" />}
      status={killSwitchRespected ? 'AMAN' : 'PERHATIAN'}
      message={message}
      details={[
        { label: 'Mode', value: mode },
        { label: 'Events Today', value: eventsToday },
        { label: 'Kill-Switch Respected', value: killSwitchRespected },
      ]}
    />
  );
}

export function ErrorRiskCard({
  errorSpikeDetected,
  autoDisableTriggered,
  message,
}: {
  errorSpikeDetected: boolean;
  autoDisableTriggered: boolean;
  message: string;
}) {
  return (
    <ConfidenceCard
      title="Error & Risk Signal"
      icon={<AlertTriangle className="h-5 w-5 text-gray-600" />}
      status={errorSpikeDetected || autoDisableTriggered ? 'KRITIS' : 'AMAN'}
      message={message}
      details={[
        { label: 'Error Spike Detected', value: errorSpikeDetected },
        { label: 'Auto-Disable Triggered', value: autoDisableTriggered },
      ]}
    />
  );
}
