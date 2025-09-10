import { supabaseAdmin } from './supabase';

export interface NotificationData {
  userId: string;
  type: 'quiz_completed' | 'study_group_invite' | 'integrity_alert' | 'admin_message' | 'system_update';
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
  actionUrl?: string;
}

// Create a single notification
export async function createNotification(notification: NotificationData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority || 'medium',
        metadata: notification.metadata || {},
        action_url: notification.actionUrl,
        read: false
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Notification created:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Failed to create notification:', error);
    throw error;
  }
}

// Create notifications for multiple users
export async function createBulkNotifications(notifications: NotificationData[]) {
  try {
    const notificationInserts = notifications.map(notification => ({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority || 'medium',
      metadata: notification.metadata || {},
      action_url: notification.actionUrl,
      read: false
    }));

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notificationInserts)
      .select();

    if (error) throw error;

    console.log(`✅ Created ${data.length} notifications`);
    return data;
  } catch (error) {
    console.error('❌ Failed to create bulk notifications:', error);
    throw error;
  }
}

// Predefined notification templates
export const notificationTemplates = {
  quizCompleted: (userId: string, quizTitle: string, score: number) => ({
    userId,
    type: 'quiz_completed' as const,
    title: 'Quiz Completed! 🎉',
    message: `Congratulations! You completed "${quizTitle}" with a score of ${score}%.`,
    priority: 'medium' as const,
    metadata: { quizTitle, score },
    actionUrl: '/student/dashboard'
  }),

  studyGroupInvite: (userId: string, groupName: string, inviterName: string) => ({
    userId,
    type: 'study_group_invite' as const,
    title: 'Study Group Invitation 📚',
    message: `${inviterName} invited you to join the study group "${groupName}".`,
    priority: 'medium' as const,
    metadata: { groupName, inviterName },
    actionUrl: '/chat'
  }),

  integrityAlert: (userId: string, violationType: string, severity: string) => ({
    userId,
    type: 'integrity_alert' as const,
    title: 'Academic Integrity Alert ⚠️',
    message: `Integrity violation detected: ${violationType} (${severity} severity)`,
    priority: severity === 'high' ? 'urgent' as const : 'high' as const,
    metadata: { violationType, severity },
    actionUrl: '/student/dashboard'
  }),

  adminMessage: (userId: string, adminName: string, message: string) => ({
    userId,
    type: 'admin_message' as const,
    title: 'Message from Administrator 📢',
    message: `${adminName}: ${message}`,
    priority: 'high' as const,
    metadata: { adminName, message },
    actionUrl: '/notifications'
  }),

  systemUpdate: (userId: string, updateTitle: string, description: string) => ({
    userId,
    type: 'system_update' as const,
    title: `System Update: ${updateTitle} 🔄`,
    message: description,
    priority: 'low' as const,
    metadata: { updateTitle, description },
    actionUrl: '/notifications'
  })
};

// Helper functions for common notification scenarios
export async function notifyQuizCompletion(userId: string, quizTitle: string, score: number) {
  return createNotification(notificationTemplates.quizCompleted(userId, quizTitle, score));
}

export async function notifyStudyGroupInvite(userId: string, groupName: string, inviterName: string) {
  return createNotification(notificationTemplates.studyGroupInvite(userId, groupName, inviterName));
}

export async function notifyIntegrityViolation(userId: string, violationType: string, severity: string) {
  return createNotification(notificationTemplates.integrityAlert(userId, violationType, severity));
}

export async function notifyAdminMessage(userId: string, adminName: string, message: string) {
  return createNotification(notificationTemplates.adminMessage(userId, adminName, message));
}

export async function notifySystemUpdate(userId: string, updateTitle: string, description: string) {
  return createNotification(notificationTemplates.systemUpdate(userId, updateTitle, description));
}

// Notify all users of a system update
export async function notifyAllUsersSystemUpdate(updateTitle: string, description: string) {
  try {
    // Get all users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('status', 'active');

    if (error) throw error;

    if (!users || users.length === 0) {
      console.log('No active users to notify');
      return [];
    }

    // Create notifications for all users
    const notifications = users.map(user =>
      notificationTemplates.systemUpdate(user.id, updateTitle, description)
    );

    return createBulkNotifications(notifications);
  } catch (error) {
    console.error('❌ Failed to notify all users:', error);
    throw error;
  }
}

// Notify all admins of an integrity alert
export async function notifyAdminsIntegrityAlert(violationType: string, severity: string, studentName: string) {
  try {
    // Get all admin users
    const { data: admins, error } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('role', ['admin', 'super_admin'])
      .eq('status', 'active');

    if (error) throw error;

    if (!admins || admins.length === 0) {
      console.log('No active admins to notify');
      return [];
    }

    // Create notifications for all admins
    const notifications = admins.map(admin => ({
      userId: admin.id,
      type: 'integrity_alert' as const,
      title: 'Integrity Alert: Student Violation ⚠️',
      message: `${studentName} committed a ${violationType} violation (${severity} severity)`,
      priority: severity === 'high' ? 'urgent' as const : 'high' as const,
      metadata: { violationType, severity, studentName },
      actionUrl: '/admin/dashboard?section=integrity'
    }));

    return createBulkNotifications(notifications);
  } catch (error) {
    console.error('❌ Failed to notify admins:', error);
    throw error;
  }
}

// Legacy functions for backward compatibility with NotificationContext
export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to mark all notifications as read:', error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('❌ Failed to get unread notification count:', error);
    throw error;
  }
}
