'use client';

import * as React from 'react';
import { createContext, useContext, useEffect, useCallback, useState } from 'react';
type ReactNode = React.ReactNode;
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useUser } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';
import { 
  createNotification as createNotificationUtil,
  markNotificationAsRead as markNotificationAsReadUtil,
  markAllNotificationsAsRead as markAllNotificationsAsReadUtil,
  getUnreadNotificationCount as getUnreadNotificationCountUtil
} from '@/lib/notifications';

type NotificationType = 'new_message' | 'mention' | 'reaction' | 'new_member' | 'room_invite' | 'quiz_completed' | 'study_group_invite' | 'integrity_alert' | 'admin_message' | 'system_update';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, any>;
  userId: string;
}

interface NotificationContextType {
  notifications: Notification[];
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>) => Promise<Notification | null>;
  unreadCount: number;
  initialized: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const supabase = createClientComponentClient<Database>();
  const user = useUser();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialized, setInitialized] = useState(false);
  
  // Create a new notification
  const createNewNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>) => {
    if (!user?.id) return null;

    // For chat notifications, don't create system notifications
    // These are handled in-memory for real-time chat features
    const chatTypes: NotificationType[] = ['new_message', 'mention', 'reaction', 'new_member', 'room_invite'];

    if (chatTypes.includes(notification.type)) {
      // Create in-memory notification
      const newNotification: Notification = {
        id: `chat_${Date.now()}_${Math.random()}`,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: new Date(),
        read: false,
        metadata: notification.metadata || {},
        userId: user.id
      };

      // Add to local state
      setNotifications(prev => [newNotification, ...prev]);

      return newNotification;
    }

    try {
      // For system notifications, use the utility function
      const systemTypes = ['quiz_completed', 'study_group_invite', 'integrity_alert', 'admin_message', 'system_update'] as const;
      if (systemTypes.includes(notification.type as any)) {
        const newNotification = await createNotificationUtil({
          userId: user.id,
          type: notification.type as any,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata || {},
        });

        return newNotification;
      }

      return null;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }, [user?.id]);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      
      setNotifications(data.map((notif: any) => ({
        ...notif,
        timestamp: new Date(notif.created_at || new Date().toISOString()),
        read: notif.read,
        metadata: notif.metadata || {},
        userId: notif.user_id
      })));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setInitialized(true);
    }
  }, [user]);
  
  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;
    
    try {
      await markNotificationAsReadUtil(notificationId, user.id);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      
      // Update unread count in the UI
      const newUnreadCount = await getUnreadNotificationCountUtil(user.id);
      // You can add additional state updates or callbacks here if needed
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert the optimistic update
      setNotifications(prev => prev);
    }
  }, [user?.id]);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await markAllNotificationsAsReadUtil(user.id);
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      // Update unread count in the UI
      const newUnreadCount = await getUnreadNotificationCountUtil(user.id);
      // You can add additional state updates or callbacks here if needed
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Revert the optimistic update
      setNotifications(prev => prev);
    }
  }, [user?.id]);
  
  // Handle real-time notifications + chat broadcasts
  useEffect(() => {
    if (!user?.id) return;
    
    const supabaseClient = createClientComponentClient<Database>();
    
    // Subscribe to DB-backed notifications
    const channel = supabaseClient
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id as string,
            type: payload.new.type as NotificationType,
            title: payload.new.title as string,
            message: payload.new.message as string,
            timestamp: new Date(payload.new.created_at as string || new Date().toISOString()),
            read: payload.new.read as boolean,
            metadata: (payload.new.metadata as Record<string, any>) || {},
            userId: payload.new.user_id as string
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          showNotificationToast(newNotification);
        }
      )
      .subscribe();

    // Subscribe to chat broadcast events for new messages across groups the user is in
    const groupChannel = supabaseClient
      .channel(`user_chat_notifications_${user.id}`)
      .on('broadcast', { event: 'new_message' }, (payload: any) => {
        try {
          const msg = payload?.payload;
          if (!msg) return;

          // Skip if message author is current user (avoid self-notify) 
          if (msg.user_id === user.id) return;

          const roomId = msg.group_id;
          const senderName = msg.sender_name || 'Someone';
          const roomName = msg.group_name || 'chat';
          const text = msg.preview || msg.content || '[message]';

          const notification: Notification = {
            id: `chat_${msg.id}`,
            type: 'new_message',
            title: `New message in ${roomName}`,
            message: `${senderName}: ${text}`,
            timestamp: new Date(),
            read: false,
            metadata: { roomId, roomName, senderName, messageId: msg.id },
            userId: user.id,
          };

          setNotifications(prev => [notification, ...prev]);
          showNotificationToast(notification);
        } catch (e) {
          console.error('Error handling chat broadcast for notifications:', e);
        }
      })
      .subscribe();
    
    return () => {
      channel.unsubscribe();
      groupChannel.unsubscribe();
    };
  }, [user?.id]);
  
  // Show toast notification
  const showNotificationToast = useCallback((notification: Notification) => {
    const { type, title, message, metadata } = notification;
    
    const notificationConfig = {
      title,
      description: message,
      variant: 'default' as const,
      action: (
        <ToastAction altText="View" onClick={() => handleNotificationClick(notification)}>
          View
        </ToastAction>
      )
    };
    
    switch (type) {
      case 'new_message':
        toast({
          ...notificationConfig,
          title: `New message in ${metadata?.roomName || 'chat'}`,
          description: `${metadata?.senderName || 'Someone'}: ${message}`,
        });
        break;
        
      case 'mention':
        toast({
          ...notificationConfig,
          variant: 'destructive',
          title: `You were mentioned by ${metadata?.senderName || 'someone'}`,
          description: message,
        });
        break;
        
      case 'reaction':
        toast({
          ...notificationConfig,
          title: `${metadata?.senderName || 'Someone'} reacted with ${metadata?.reaction || 'an emoji'}`,
          description: `to your message in ${metadata?.roomName || 'chat'}`,
        });
        break;
        
      case 'room_invite':
        toast({
          ...notificationConfig,
          title: `Invitation to join ${metadata?.roomName || 'a room'}`,
          description: `You've been invited to join ${metadata?.roomName || 'a room'} by ${metadata?.inviterName || 'a user'}`,
        });
        break;
        
      default:
        toast(notificationConfig);
    }
  }, []);
  
  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    // Mark as read when clicked
    markAsRead(notification.id);
    
    // Navigate to the relevant page based on notification type
    const { type, metadata } = notification;
    
    switch (type) {
      case 'new_message':
      case 'mention':
      case 'reaction':
        if (metadata?.roomId) {
          router.push(`/chat/${metadata.roomId}`);
        }
        break;
        
      case 'room_invite':
        if (metadata?.roomId) {
          router.push(`/chat/invite/${metadata.roomId}`);
        }
        break;
        
      default:
        break;
    }
  }, [markAsRead, router]);
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Initial fetch
  useEffect(() => {
    if (user && !initialized) {
      fetchNotifications();
    }
  }, [user, initialized, fetchNotifications]);
  
  return (
    <NotificationContext.Provider 
      value={{
        notifications,
        markAsRead,
        markAllAsRead,
        createNotification: createNewNotification,
        unreadCount: notifications.filter(n => !n.read).length,
        initialized,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
