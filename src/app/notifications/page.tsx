'use client';

import { useEffect, useState } from 'react';
import { useNotifications, type Notification as AppNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Bell, Check, MessageSquare, AtSign, ThumbsUp, Users, Mail, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  useEffect(() => {
    // Mark all notifications as read when the page loads
    if (unreadCount > 0) {
      markAllAsRead();
    }
    setLoading(false);
  }, [markAllAsRead, unreadCount]);

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'new_message':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'mention':
        return <AtSign className="h-5 w-5 text-amber-500" />;
      case 'reaction':
        return <ThumbsUp className="h-5 w-5 text-purple-500" />;
      case 'room_invite':
        return <Users className="h-5 w-5 text-green-500" />;
      case 'quiz_completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'study_group_invite':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'integrity_alert':
        return <Bell className="h-5 w-5 text-red-500" />;
      case 'admin_message':
        return <Mail className="h-5 w-5 text-purple-500" />;
      case 'system_update':
        return <Bell className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notificationId: string) => {
    setSelectedNotification(selectedNotification === notificationId ? null : notificationId);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No notifications yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            When you get notifications, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification: AppNotification) => (
              <li 
                key={notification.id}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                  selectedNotification === notification.id && 'bg-gray-50 dark:bg-gray-700'
                )}
              >
                <div 
                  className="px-4 py-4 sm:px-6 cursor-pointer"
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </span>
                          {!notification.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {notification.message}
                      </p>
                      
                      {notification.metadata?.roomName && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {notification.metadata.roomName}
                          </span>
                        </div>
                      )}
                      
                      {selectedNotification === notification.id && notification.metadata && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-300">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(notification.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
