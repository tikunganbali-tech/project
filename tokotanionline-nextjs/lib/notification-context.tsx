'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
  duration?: number;
  isBackground?: boolean; // Jika true, muncul di icon notif, bukan popup
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  backgroundNotifications: Notification[];
  showNotification: (
    message: string,
    type?: NotificationType,
    options?: {
      title?: string;
      duration?: number;
      isBackground?: boolean;
    }
  ) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [backgroundNotifications, setBackgroundNotifications] = useState<Notification[]>([]);
  const notificationIdCounter = useRef(0);

  const showNotification = useCallback((
    message: string,
    type: NotificationType = 'info',
    options: {
      title?: string;
      duration?: number;
      isBackground?: boolean;
    } = {}
  ): string => {
    const id = `notif-${Date.now()}-${notificationIdCounter.current++}`;
    const notification: Notification = {
      id,
      message,
      type,
      title: options.title,
      duration: options.duration ?? (type === 'error' ? 5000 : 3000),
      isBackground: options.isBackground ?? false,
      timestamp: Date.now(),
    };

    if (notification.isBackground) {
      // Background notification - muncul di icon notif
      setBackgroundNotifications((prev) => {
        // Keep max 50 background notifications
        const updated = [notification, ...prev].slice(0, 50);
        return updated;
      });
    } else {
      // Real-time notification - muncul sebagai popup
      setNotifications((prev) => [...prev, notification]);

      // Auto-remove setelah duration
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, notification.duration);
      }
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setBackgroundNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setBackgroundNotifications([]);
  }, []);

  const unreadCount = backgroundNotifications.length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        backgroundNotifications,
        showNotification,
        removeNotification,
        clearAll,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

// Notification Icon Component (untuk background processes)
export function NotificationIcon() {
  const { backgroundNotifications, unreadCount, clearAll } = useNotification();
  const [isOpen, setIsOpen] = useState(false);

  if (unreadCount === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifikasi ({unreadCount})
              </h3>
              <button
                onClick={clearAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Hapus Semua
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {backgroundNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Tidak ada notifikasi
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {backgroundNotifications.map((notif) => (
                    <NotificationItem key={notif.id} notification={notif} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const { removeNotification } = useNotification();

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      default:
        return 'bg-blue-50';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return new Date(timestamp).toLocaleDateString('id-ID');
  };

  return (
    <div className={`p-3 ${getBgColor()} hover:bg-opacity-80 transition-colors`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-xs font-semibold text-gray-900 mb-1">
              {notification.title}
            </p>
          )}
          <p className="text-xs text-gray-700">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatTime(notification.timestamp)}
          </p>
        </div>
        <button
          onClick={() => removeNotification(notification.id)}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// Notification Popup Component (untuk real-time notifications)
export function NotificationPopup() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <NotificationPopupItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

function NotificationPopupItem({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
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
    switch (notification.type) {
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
    switch (notification.type) {
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

  return (
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
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className={`flex-1 ${getTextColor()}`}>
          {notification.title && (
            <p className="text-sm font-semibold mb-1">{notification.title}</p>
          )}
          <p className="text-sm font-medium">{notification.message}</p>
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
  );
}
