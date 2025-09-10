'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, BellOff, Settings, CheckCircle, AlertCircle, Info, MessageCircle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'quiz_completed' | 'study_group_invite' | 'integrity_alert' | 'admin_message' | 'system_update';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  created_at: string;
  metadata?: any;
  action_url?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  quiz_completion_alerts: boolean;
  study_group_notifications: boolean;
  integrity_alerts: boolean;
  admin_messages: boolean;
  system_updates: boolean;
}

export default function SmartNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    quiz_completion_alerts: true,
    study_group_notifications: true,
    integrity_alerts: true,
    admin_messages: true,
    system_updates: false
  });
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const router = useRouter();
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    fetchSettings();

    // Set up real-time notifications
    const interval = setInterval(() => {
      checkForNewNotifications();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read).length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || settings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const checkForNewNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/check', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.newNotifications > 0) {
          fetchNotifications();
          showBrowserNotification('New Notifications', `You have ${data.newNotifications} new notification(s)`);
        }
      }
    } catch (error) {
      console.error('Error checking for new notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: { ...settings, ...newSettings } }),
      });

      if (response.ok) {
        setSettings(prev => ({ ...prev, ...newSettings }));
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateSettings({ push_notifications: true });
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quiz_completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'study_group_invite': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'integrity_alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'admin_message': return <Info className="w-5 h-5 text-purple-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-700 bg-red-100';
      case 'high': return 'text-orange-700 bg-orange-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      default: return 'text-blue-700 bg-blue-100';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={notificationRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-600" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            <p className="text-gray-600">Stay updated with your latest activities</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark All Read
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">Notification Settings</CardTitle>
            <CardDescription>Customize how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Delivery Methods</h4>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => updateSettings({ email_notifications: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Email notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.push_notifications}
                    onChange={(e) => {
                      if (e.target.checked) {
                        requestNotificationPermission();
                      } else {
                        updateSettings({ push_notifications: false });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Browser push notifications</span>
                </label>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Notification Types</h4>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.quiz_completion_alerts}
                    onChange={(e) => updateSettings({ quiz_completion_alerts: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Quiz completion alerts</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.study_group_notifications}
                    onChange={(e) => updateSettings({ study_group_notifications: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Study group notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.integrity_alerts}
                    onChange={(e) => updateSettings({ integrity_alerts: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Integrity alerts</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.admin_messages}
                    onChange={(e) => updateSettings({ admin_messages: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Admin messages</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tabs */}
      <Tabs defaultValue="unread" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unread">
            Unread ({unreadNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Notifications ({notifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-4">
          {unreadNotifications.length === 0 ? (
            <Card className="bg-green-50/50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <BellOff className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">All Caught Up!</h3>
                  <p className="text-green-700">You have no unread notifications.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            unreadNotifications.map((notification) => (
              <Card key={notification.id} className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        <Badge className={`${getPriorityColor(notification.priority)} border-0 text-xs`}>
                          {notification.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        <div className="flex space-x-2">
                          {notification.action_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(notification.action_url!)}
                            >
                              View
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark Read
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {notifications.length === 0 ? (
            <Card className="bg-gray-50/50 border-gray-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Notifications</h3>
                  <p className="text-gray-500">You haven't received any notifications yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`bg-white/70 backdrop-blur-sm shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 ${
                  !notification.read ? 'ring-2 ring-blue-200' : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-semibold truncate ${
                          notification.read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h4>
                        <Badge className={`${getPriorityColor(notification.priority)} border-0 text-xs`}>
                          {notification.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className={`text-sm mt-1 ${
                        notification.read ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        <div className="flex space-x-2">
                          {notification.action_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(notification.action_url!)}
                            >
                              View
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}