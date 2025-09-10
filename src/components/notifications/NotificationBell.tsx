'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X, MessageSquare, AtSign, ThumbsUp, Users, Mail } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import type { Notification as NotificationType } from '../../contexts/NotificationContext';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'new_message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-amber-500" />;
      case 'reaction':
        return <ThumbsUp className="h-4 w-4 text-purple-500" />;
      case 'room_invite':
        return <Users className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  const handleNotificationClick = useCallback((notification: NotificationType) => {
    markAsRead(notification.id);
    setIsOpen(false);
  }, [markAsRead]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-medium">Notifications</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  aria-label="Mark all as read"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ScrollArea className="max-h-96">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification: NotificationType) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors',
                      !notification.read && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {notification.message}
                        </p>
                        <div className="mt-1 text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </div>
                        {notification.metadata?.roomName && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {notification.metadata.roomName}
                            </span>
                          </div>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="ml-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-center">
              <button
                onClick={() => {
                  // Navigate to notifications page
                  window.location.href = '/notifications';
                }}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
