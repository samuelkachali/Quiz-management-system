# Notification System

This document provides an overview of the notification system implemented in the Quiz Management System.

## Features

- Real-time notifications using Supabase Realtime
- Multiple notification types (messages, mentions, reactions, room invites)
- Mark notifications as read
- Toast notifications for new notifications
- Unread notification count
- Responsive notification bell component

## Components

### 1. Notification Context (`NotificationContext.tsx`)

The main context that provides notification state and methods to child components.

**Methods:**
- `markAsRead(notificationId: string)`: Mark a single notification as read
- `markAllAsRead()`: Mark all notifications as read
- `createNotification(notification)`: Create a new notification

**State:**
- `notifications`: Array of notification objects
- `unreadCount`: Number of unread notifications
- `initialized`: Whether notifications have been loaded

### 2. Notification Bell (`NotificationBell.tsx`)

A dropdown component that shows the notification list and unread count.

### 3. Notifications Page (`/notifications/page.tsx`)

A dedicated page to view all notifications.

## Hooks

### useChatNotifications

A custom hook to handle chat-related notifications.

```typescript
const { 
  notifyNewMessage, 
  notifyReaction, 
  notifyRoomInvite 
} = useChatNotifications({
  currentUserId: string,
  roomId?: string,
  roomName?: string
});
```

## Database Schema

### `notifications` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Reference to users table |
| type | text | Notification type |
| title | text | Notification title |
| message | text | Notification message |
| read | boolean | Whether the notification has been read |
| metadata | jsonb | Additional data |
| created_at | timestamp | When the notification was created |
| updated_at | timestamp | When the notification was last updated |

## API Endpoints

### `GET /api/notifications`

Get all notifications for the current user.

### `POST /api/notifications`

Mark notifications as read.

**Body:**
```typescript
{
  notificationId?: string; // Mark single notification as read
  markAll?: boolean; // Mark all notifications as read
}
```

## Usage Examples

### Sending a notification

```typescript
const { createNotification } = useNotifications();

// Simple notification
await createNotification({
  type: 'new_message',
  title: 'New Message',
  message: 'You have a new message',
  metadata: { roomId: '123' }
});

// Using the chat notifications hook
const { notifyNewMessage } = useChatNotifications({ 
  currentUserId: user.id,
  roomId: '123',
  roomName: 'General Chat'
});

// When a new message is sent
await notifyNewMessage({
  senderId: 'user-123',
  senderName: 'John Doe',
  message: 'Hello everyone!',
  mentionedUserIds: ['user-456'] // Optional
});
```

## Real-time Updates

The notification system uses Supabase Realtime to receive updates in real-time. When a new notification is created, it will automatically appear in the UI and show a toast.

## Styling

Notifications use the following Tailwind classes for styling:

- Unread: `bg-blue-50 dark:bg-blue-900/20`
- Hover: `hover:bg-gray-50 dark:hover:bg-gray-700`
- Icons: Different colors based on notification type

## Testing

To test the notification system:

1. Log in as a user
2. Send a message in a chat room
3. Verify the notification appears in real-time
4. Mark notifications as read
5. Check the notifications page

## Future Improvements

- Add email notifications for important events
- Add push notifications for mobile devices
- Add notification preferences
- Add the ability to mute specific notification types
