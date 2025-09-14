'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { usePresence } from '@/lib/presence';
import { Paperclip, Send, Download, FileText, Image, File, Bot, Smile, X, Reply, Edit, Trash2, MoreVertical } from 'lucide-react';

interface Message {
   id: string;
   group_id: string;
   user_id: string;
   message_type: string;
   content: string;
   file_url?: string;
   file_name?: string;
   file_size?: number;
   file_type?: string;
   is_pinned: boolean;
   reply_to_id?: string;
   created_at: string;
   updated_at: string;
   user_name: string;
   user_email: string;
   user_role: string;
   reaction_count: number;
   user_reactions: string[];
   message_status?: 'sending' | 'sent' | 'delivered' | 'read';
   user?: {
     id: string;
     name: string;
     email: string;
   };
 }

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  created_by: string;
  max_members: number;
  is_active: boolean;
  member_count: number;
  is_member: boolean;
  is_creator: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface StudyGroupChatProps {
  groupId: string;
  studyGroup: StudyGroup;
  currentUser: User;
}

export default function StudyGroupChat({ groupId, studyGroup, currentUser }: StudyGroupChatProps) {
   console.log('StudyGroupChat initialized for group:', groupId, 'user:', currentUser?.name);

   const [messages, setMessages] = useState<Message[]>([]);
   const [newMessage, setNewMessage] = useState('');
   const [loading, setLoading] = useState(true);
   const [sending, setSending] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [userRole, setUserRole] = useState<string>('member');
   const [isTyping, setIsTyping] = useState(false);
   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
   const [selectedFile, setSelectedFile] = useState<File | null>(null);
   const [replyingTo, setReplyingTo] = useState<Message | null>(null);
   const [editingMessage, setEditingMessage] = useState<Message | null>(null);
   const [editContent, setEditContent] = useState('');
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const router = useRouter();

   // Initialize presence tracking
   const { presence, typingUsers, setTyping, getTypingUsers } = usePresence({
     roomId: groupId,
     onTypingChange: (userId, typing) => {
       console.log('Typing change:', userId, typing);
     }
   });

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
  }, [groupId]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      handleTypingStop(); // Stop typing when component unmounts
    };
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!groupId || !currentUser?.id) {
      console.log('Skipping subscription setup - missing groupId or currentUser');
      return;
    }

    console.log('=== Setting up real-time subscription ===');
    console.log('Channel name:', `study_group_${groupId}`);
    console.log('Filter:', `group_id=eq.${groupId}`);
    console.log('Current user:', currentUser);

    let channel: any = null;
    let isSubscribed = false;

    const setupSubscription = () => {
      try {
        // Clean up any existing channel first
        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }

        channel = supabase
          .channel(`study_group_${groupId}`, {
            config: {
              presence: {
                key: currentUser.id,
              },
            },
          })
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'study_group_messages',
              filter: `group_id=eq.${groupId}`,
            },
            (payload) => {
              console.log('=== REAL-TIME MESSAGE RECEIVED ===');
              console.log('Payload:', payload);
              console.log('New message data:', payload.new);
              console.log('Message user_id from payload:', payload.new?.user_id);
              console.log('Current user ID:', currentUser.id);

              // Fetch messages for all users to ensure real-time updates
              console.log('🔍 Fetching messages after real-time INSERT event');
              
              // Add a small delay to ensure database consistency
              setTimeout(() => {
                fetchMessages();
              }, 100);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'study_group_messages',
              filter: `group_id=eq.${groupId}`,
            },
            (payload) => {
              console.log('=== REAL-TIME MESSAGE UPDATED ===');
              console.log('Updated message:', payload.new);
              setTimeout(() => {
                fetchMessages();
              }, 100);
            }
          )
          // Also listen for broadcast events so all clients get instant updates
          .on('broadcast', { event: 'new_message' }, (payload: any) => {
            try {
              const msg = payload?.payload;
              if (!msg) return;
              console.log('📡 Broadcast new_message received:', msg.id);
              setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            } catch (e) {
              console.error('Error handling broadcast payload:', e);
            }
          })
          .subscribe((status, err) => {
            console.log('=== SUBSCRIPTION STATUS CHANGE ===');
            console.log('Subscription status:', status);
            
            if (err) {
              console.error('Subscription error:', err);
              isSubscribed = false;
            }
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to real-time updates for group:', groupId);
              isSubscribed = true;
            } else if (status === 'CLOSED') {
              console.log('❌ Subscription closed for group:', groupId);
              isSubscribed = false;
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Channel error for group:', groupId, err);
              isSubscribed = false;
              // Attempt to reconnect after a delay
              setTimeout(() => {
                if (!isSubscribed) {
                  console.log('🔄 Attempting to reconnect...');
                  setupSubscription();
                }
              }, 3000);
            } else if (status === 'TIMED_OUT') {
              console.log('⏰ Subscription timed out, attempting to reconnect...');
              isSubscribed = false;
              setTimeout(() => {
                if (!isSubscribed) {
                  setupSubscription();
                }
              }, 2000);
            }
          });
      } catch (error) {
        console.error('Error setting up subscription:', error);
        // Retry after a delay
        setTimeout(() => {
          if (!isSubscribed) {
            setupSubscription();
          }
        }, 5000);
      }
    };

    setupSubscription();

    return () => {
      console.log('=== CLEANING UP SUBSCRIPTION ===');
      isSubscribed = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.error('Error removing channel:', error);
        }
        channel = null;
      }
    };
  }, [groupId, currentUser.id]);

  const fetchMessages = async () => {
    console.log('=== FETCHING MESSAGES ===');
    console.log('Group ID:', groupId);
    console.log('Current user:', currentUser);

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found, redirecting to login');
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/chat/study-groups/${groupId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Fetch messages response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched messages data:', data);
        console.log('Messages count:', data.messages?.length);
        console.log('User role:', data.userRole);

        // Log details of each message
        if (data.messages) {
          data.messages.forEach((msg: Message, index: number) => {
            console.log(`Message ${index + 1}:`, {
              id: msg.id,
              user_id: msg.user_id,
              user_name: msg.user_name,
              user_email: msg.user_email,
              content: msg.content?.substring(0, 50),
              created_at: msg.created_at,
              user: msg.user
            });
          });
        }

        // Ensure all messages have proper user information
        const processedMessages = (data.messages || []).map((msg: Message) => ({
          ...msg,
          // Ensure user info is properly set
          user: msg.user || {
            id: msg.user_id,
            name: msg.user_name || 'Unknown User',
            email: msg.user_email || ''
          },
          user_name: msg.user_name || msg.user?.name || 'Unknown User',
          user_email: msg.user_email || msg.user?.email || '',
          user_role: msg.user_role || 'member'
        }));

        console.log('Processed messages:', processedMessages);
        setMessages(processedMessages);
        setUserRole(data.userRole || 'member');
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch messages:', errorData);
        const errorMessage = typeof errorData === 'string'
          ? errorData
          : errorData?.message || 'Failed to load messages';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    if (selectedFile) {
      await sendFileMessage();
      return;
    }

    const messageContent = newMessage.trim();
    const optimisticMessageId = `temp-${Date.now()}`;

    console.log('Sending message from user:', currentUser.name);

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        return;
      }

      // Optimistically add the message to the UI
      const optimisticMessage: Message = {
        id: optimisticMessageId,
        group_id: groupId,
        user_id: currentUser.id,
        message_type: 'text',
        content: messageContent,
        file_url: undefined,
        file_name: undefined,
        file_size: undefined,
        file_type: undefined,
        is_pinned: false,
        reply_to_id: replyingTo?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email
        },
        user_name: currentUser.name,
        user_email: currentUser.email,
        user_role: userRole,
        reaction_count: 0,
        user_reactions: [],
        message_status: 'sending'
      };

      console.log('Optimistic message created:', optimisticMessage);

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setReplyingTo(null); // Clear reply state
      handleTypingStop(); // Stop typing when message is sent

      const response = await fetch(`/api/chat/study-groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          messageType: 'text',
          reply_to_id: replyingTo?.id
        }),
      });

      const data = await response.json();

      console.log('API Response status:', response.status);
      console.log('API Response data:', data);

      if (response.ok) {
        console.log('Message sent successfully');
        console.log('Server message data:', data.messageData);
        console.log('Server message user_id:', data.messageData?.user_id);
        console.log('Server message user_name:', data.messageData?.user_name);
        console.log('Server message user_email:', data.messageData?.user_email);

        // Replace optimistic message with real message from server
        setMessages(prev => {
          const updatedMessages = prev.map(msg => {
            if (msg.id === optimisticMessageId) {
              console.log('Replacing optimistic message with server message');
              return {
                ...data.messageData,
                // Ensure user info is properly set
                user: data.messageData.user || {
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email
                },
                user_name: data.messageData.user_name || currentUser.name,
                user_email: data.messageData.user_email || currentUser.email,
                user_role: data.messageData.user_role || userRole,
                message_status: 'sent'
              };
            }
            return msg;
          });

          // Add bot response if it exists
          if (data.botResponse) {
            console.log('Adding bot response to messages');
            updatedMessages.push({
              ...data.botResponse,
              user: null,
              user_name: 'StudyBot',
              user_email: null,
              user_role: 'bot'
            });
          }

          console.log('Updated messages after send:', updatedMessages);
          return updatedMessages;
        });
      } else {
        console.error('Failed to send message:', data);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessageId));
        const errorMessage = typeof data === 'string'
          ? data
          : data?.message || 'Failed to send message';
        alert(errorMessage);
        setNewMessage(messageContent); // Restore the message
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessageId));
      alert('Failed to send message');
      setNewMessage(messageContent); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      setTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTyping(false);
    }, 3000); // Stop typing after 3 seconds of inactivity
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  // Enhanced input change handler with typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  // Emoji picker functionality
  const emojis = ['😀', '😂', '❤️', '👍', '👎', '👏', '🔥', '💯', '🎉', '🤔', '😢', '😮', '🙌', '🤝', '💪'];

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    handleTypingStart();
  };

  // File upload functionality
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendFileMessage = async () => {
    if (!selectedFile) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // First upload the file
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }

      const uploadData = await uploadResponse.json();

      // Then send the message with file info
      const response = await fetch(`/api/chat/study-groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage || selectedFile.name,
          messageType: 'file',
          file_url: uploadData.url,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
        }),
      });

      if (response.ok) {
        setSelectedFile(null);
        setNewMessage('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchMessages();
      } else {
        alert('Failed to send file message');
      }
    } catch (error) {
      console.error('Error sending file message:', error);
      alert('Failed to send file message');
    } finally {
      setSending(false);
    }
  };

  // Message action handlers
  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setShowEmojiPicker(false);
  };

  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setEditContent(message.content);
    setShowEmojiPicker(false);
  };

  const handleDelete = async (message: Message) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/study-groups/${groupId}/messages/${message.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchMessages();
      } else {
        alert('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/study-groups/${groupId}/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      });

      if (response.ok) {
        setEditingMessage(null);
        setEditContent('');
        fetchMessages();
      } else {
        alert('Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Failed to edit message');
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType?.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading chat...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Chat</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border border-gray-200">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{studyGroup.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{studyGroup.member_count} members</span>
              {(() => {
                const onlineUsers = Object.values(presence).filter(user =>
                  user.status === 'online' && user.active_rooms?.includes(groupId)
                );
                const onlineCount = onlineUsers.length;

                return (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{onlineCount} online</span>
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              userRole === 'admin'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {userRole === 'admin' ? 'Admin' : 'Member'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {/* Typing Indicators */}
        {(() => {
          const typingUsersInRoom = getTypingUsers(groupId);
          const otherTypingUsers = typingUsersInRoom.filter(user => user.user.id !== currentUser.id);

          if (otherTypingUsers.length > 0) {
            const typingNames = otherTypingUsers.map(user => user.user.name || 'Someone').join(', ');
            const isMultiple = otherTypingUsers.length > 1;

            return (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-2 max-w-xs lg:max-w-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500 italic">
                    {typingNames} {isMultiple ? 'are' : 'is'} typing...
                  </span>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h4>
              <p className="text-gray-600">Be the first to send a message!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.user_id === currentUser.id;
              const isSystemMessage = message.message_type === 'system';
              const isBotMessage = message.message_type === 'bot';

              if (isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center my-2">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 max-w-md">
                      <p className="text-yellow-800 text-sm italic text-center">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              }

              if (isBotMessage) {
                return (
                  <div key={message.id} className="flex justify-start mb-4">
                    <div className="flex items-start space-x-2 max-w-xs lg:max-w-md">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            StudyBot
                          </span>
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded">
                            AI Assistant
                          </span>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg px-3 py-2">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1 mt-1 justify-start">
                          <span className="text-xs text-gray-500">
                            {formatTime(message.created_at)}
                          </span>
                          {message.reaction_count > 0 && (
                            <span className="text-xs text-gray-500">
                              {message.reaction_count} reaction{message.reaction_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={message.id} className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-xs lg:max-w-md relative`}>
                    {!isCurrentUser && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {message.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      {!isCurrentUser && (
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {message.user?.name || 'Unknown User'}
                          </span>
                          {message.user_role === 'admin' && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                      )}

                      {message.message_type === 'text' && (
                        <div className={`rounded-lg px-3 py-2 max-w-md relative ${
                          isCurrentUser
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          {/* Message Actions */}
                          <div className={`absolute top-0 ${isCurrentUser ? 'left-0' : 'right-0'} transform -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                            <div className="flex items-center space-x-1 bg-white rounded-md shadow-md p-1 border">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReply(message)}
                                className="h-6 w-6 p-0 text-gray-600 hover:text-blue-600"
                              >
                                <Reply className="w-3 h-3" />
                              </Button>
                              {isCurrentUser && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(message)}
                                    className="h-6 w-6 p-0 text-gray-600 hover:text-yellow-600"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(message)}
                                    className="h-6 w-6 p-0 text-gray-600 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {message.message_type === 'file' && (
                        <div className={`border rounded-lg px-3 py-2 max-w-md ${
                          isCurrentUser
                            ? 'bg-blue-500 text-white border-blue-600'
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-center space-x-2">
                            {getFileIcon(message.file_type || '')}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                isCurrentUser ? 'text-white' : 'text-blue-900'
                              }`}>
                                {message.file_name}
                              </p>
                              <p className={`text-xs ${
                                isCurrentUser ? 'text-blue-100' : 'text-blue-700'
                              }`}>
                                {formatFileSize(message.file_size || 0)}
                              </p>
                            </div>
                            {message.file_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`${
                                  isCurrentUser
                                    ? 'text-blue-100 hover:text-white'
                                    : 'text-blue-600 hover:text-blue-800'
                                }`}
                                onClick={() => window.open(message.file_url, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className={`flex items-center space-x-1 mt-1 ${
                        isCurrentUser ? 'justify-end' : 'justify-start'
                      }`}>
                        <span className={`text-xs ${
                          isCurrentUser ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                        </span>
                        {isCurrentUser && message.message_status && (
                          <div className="flex items-center">
                            {message.message_status === 'sending' && (
                              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                            )}
                            {message.message_status === 'sent' && (
                              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {message.message_status === 'delivered' && (
                              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M20.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L12 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {message.message_status === 'read' && (
                              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M20.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L12 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        )}
                        {message.reaction_count > 0 && (
                          <span className={`text-xs ${
                            isCurrentUser ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {message.reaction_count} reaction{message.reaction_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {/* Reply Context */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Replying to {replyingTo.user_name}</p>
                <p className="text-sm text-blue-700 truncate">
                  {replyingTo.content.length > 100
                    ? `${replyingTo.content.substring(0, 100)}...`
                    : replyingTo.content}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelReply}
                className="text-blue-600 hover:text-blue-800 ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Edit Context */}
        {editingMessage && (
          <div className="mb-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Editing message</p>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="mt-2 min-h-[60px] text-sm"
                  placeholder="Edit your message..."
                />
              </div>
              <div className="flex space-x-2 ml-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEdit}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Selected File Preview */}
        {selectedFile && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedFile.type.startsWith('image/') ? (
                  <Image className="w-4 h-4 text-blue-600" />
                ) : (
                  <File className="w-4 h-4 text-blue-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-xs text-blue-700">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={removeSelectedFile}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mb-3 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <div className="flex-1">
            <Textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... Use @bot to ask StudyBot for help!"
              className="min-h-[40px] max-h-[100px] resize-none"
              disabled={sending}
            />
          </div>
          <div className="flex items-end space-x-2">
            {/* Emoji Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="px-3"
            >
              <Smile className="w-4 h-4" />
            </Button>

            {/* File Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,text/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="px-3"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>

            {/* Send Button */}
            <Button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !selectedFile) || sending}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line • Use @bot to ask StudyBot
          </p>
          {userRole === 'admin' && (
            <p className="text-xs text-purple-600 font-medium">
              Admin: You can share files and resources
            </p>
          )}
        </div>
      </div>
    </div>
  );
}