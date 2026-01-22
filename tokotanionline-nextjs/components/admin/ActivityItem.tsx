'use client';

import { Clock, FileText, Package, Settings, Zap } from 'lucide-react';

interface ActivityItemProps {
  id: string;
  type: 'system' | 'content' | 'product' | 'engine';
  category: string;
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

// Helper: Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  
  // Format date if older than 7 days
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Helper: Get icon based on type
function getIcon(type: string) {
  switch (type) {
    case 'content':
      return <FileText className="w-5 h-5 text-blue-500" />;
    case 'product':
      return <Package className="w-5 h-5 text-green-500" />;
    case 'engine':
      return <Zap className="w-5 h-5 text-yellow-500" />;
    case 'system':
    default:
      return <Settings className="w-5 h-5 text-gray-500" />;
  }
}

// Helper: Get color based on type
function getColorClass(type: string): string {
  switch (type) {
    case 'content':
      return 'border-l-blue-500';
    case 'product':
      return 'border-l-green-500';
    case 'engine':
      return 'border-l-yellow-500';
    case 'system':
    default:
      return 'border-l-gray-500';
  }
}

export default function ActivityItem({
  type,
  category,
  title,
  description,
  timestamp,
}: ActivityItemProps) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${getColorClass(type)} hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-800 leading-tight">
              {title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(timestamp)}</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 mb-2">
            {description}
          </p>
          
          <div className="text-xs text-gray-400">
            {category}
          </div>
        </div>
      </div>
    </div>
  );
}

