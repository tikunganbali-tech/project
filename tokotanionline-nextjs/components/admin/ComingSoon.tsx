/**
 * ComingSoon Component
 * 
 * Displays a status page for features that are:
 * - Not yet enabled
 * - Read-only mode
 * - Locked (engine not ready)
 */

import { AlertCircle, Lock, Eye, Wrench } from 'lucide-react';

type StatusType = 'read-only' | 'locked' | 'coming-soon' | 'disabled';

interface ComingSoonProps {
  title?: string;
  status: StatusType;
  note?: string;
  icon?: React.ReactNode;
}

const statusConfig: Record<StatusType, { 
  icon: React.ReactNode; 
  bgColor: string; 
  borderColor: string; 
  textColor: string;
  defaultTitle: string;
}> = {
  'read-only': {
    icon: <Eye className="w-5 h-5" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-900',
    defaultTitle: 'Read-Only Mode',
  },
  'locked': {
    icon: <Lock className="w-5 h-5" />,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-900',
    defaultTitle: 'Feature Locked',
  },
  'coming-soon': {
    icon: <Wrench className="w-5 h-5" />,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-900',
    defaultTitle: 'Coming Soon',
  },
  'disabled': {
    icon: <AlertCircle className="w-5 h-5" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-900',
    defaultTitle: 'Feature Disabled',
  },
};

export default function ComingSoon({ 
  title, 
  status, 
  note,
  icon 
}: ComingSoonProps) {
  const config = statusConfig[status];
  const displayIcon = icon || config.icon;
  const displayTitle = title || config.defaultTitle;

  return (
    <div className="p-6 space-y-4">
      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-6`}>
        <div className="flex items-start gap-4">
          <div className={`${config.textColor} flex-shrink-0 mt-0.5`}>
            {displayIcon}
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-semibold ${config.textColor} mb-2`}>
              {displayTitle}
            </h2>
            {note && (
              <p className={`text-sm ${config.textColor.replace('900', '700')} mt-1`}>
                {note}
              </p>
            )}
            {status === 'read-only' && (
              <p className={`text-sm ${config.textColor.replace('900', '700')} mt-2`}>
                This page is available in read-only mode. You can view information but cannot make changes.
              </p>
            )}
            {status === 'locked' && (
              <p className={`text-sm ${config.textColor.replace('900', '700')} mt-2`}>
                This feature requires the engine to be active. Please check engine status.
              </p>
            )}
            {status === 'coming-soon' && (
              <p className={`text-sm ${config.textColor.replace('900', '700')} mt-2`}>
                This feature is currently under development and will be available soon.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
