'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  message: string;
  type?: NotificationType;
  duration?: number;
  onClose?: () => void;
}

export default function Notification({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      default:
        return 'text-blue-800';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div
        className={`
          pointer-events-auto
          ${getBgColor()}
          border-2
          rounded-lg
          shadow-2xl
          p-4
          min-w-[300px]
          max-w-[500px]
          transform
          transition-all
          duration-300
          ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className={`flex-1 ${getTextColor()}`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={handleClose}
            className={`
              flex-shrink-0
              p-1
              rounded
              hover:bg-black/5
              transition-colors
              ${getTextColor()}
            `}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook untuk menggunakan notification
let notificationQueue: Array<{
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}> = [];
let currentNotification: string | null = null;

export function showNotification(
  message: string,
  type: NotificationType = 'info',
  duration: number = 3000
) {
  // Only work on client-side
  if (typeof window === 'undefined') {
    return '';
  }
  
  const id = `notification-${Date.now()}-${Math.random()}`;
  notificationQueue.push({ id, message, type, duration });
  
  if (!currentNotification) {
    processQueue();
  }
  
  return id;
}

function processQueue() {
  if (notificationQueue.length === 0) {
    currentNotification = null;
    return;
  }

  const notification = notificationQueue.shift()!;
  currentNotification = notification.id;

  // Trigger custom event untuk render notification
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-notification', {
      detail: notification,
    });
    window.dispatchEvent(event);
  }

  // Process next after duration
  setTimeout(() => {
    currentNotification = null;
    processQueue();
  }, notification.duration || 3000);
}

// Component untuk render notifications
export function NotificationContainer() {
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
    duration?: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleShowNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      setNotification(customEvent.detail);
    };

    window.addEventListener('show-notification', handleShowNotification);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('show-notification', handleShowNotification);
      }
    };
  }, []);

  if (!notification) return null;

  return (
    <Notification
      message={notification.message}
      type={notification.type}
      duration={notification.duration}
      onClose={() => setNotification(null)}
    />
  );
}


