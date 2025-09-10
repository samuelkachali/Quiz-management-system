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
import { Paperclip, Send, Download, FileText, Image, File } from 'lucide-react';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`study_group_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          // Fetch the complete message with user info
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/chat/study-groups/${groupId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setUserRole(data.userRole || 'member');
      } else {
        const errorData = await response.json();
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
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    const optimisticMessageId = `temp-${Date.now()}`;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      if (!token) return;

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
        reply_to_id: undefined,
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
        user_reactions: []
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      const response = await fetch(`/api/chat/study-groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          messageType: 'text'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Replace optimistic message with real message from server
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticMessageId ? data.messageData : msg
        ));
      } else {
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
            <p className="text-sm text-gray-600">{studyGroup.member_count} members</p>
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

              return (
                <div key={message.id} className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-xs lg:max-w-md`}>
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
                        <div className={`rounded-lg px-3 py-2 max-w-md ${
                          isCurrentUser
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
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
        <div className="flex space-x-2">
          <div className="flex-1">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="min-h-[40px] max-h-[100px] resize-none"
              disabled={sending}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
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