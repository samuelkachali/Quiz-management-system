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
   quiz_id: string;
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

interface ChatRoom {
  quiz_id: string;
  room_name: string;
  room_description: string;
  room_type: string;
  quiz_title: string;
  quiz_description: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface QuizChatProps {
  quizRoom: ChatRoom;
  currentUser: User;
}

export default function QuizChat({ quizRoom, currentUser }: QuizChatProps) {
   console.log('QuizChat initialized for room:', quizRoom.quiz_id, 'user:', currentUser?.name);

   const [messages, setMessages] = useState<Message[]>([]);
   const [newMessage, setNewMessage] = useState('');
   const [loading, setLoading] = useState(true);
   const [sending, setSending] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [userRole, setUserRole] = useState<string>('student');
   const [isTyping, setIsTyping] = useState(false);
   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
   const [selectedFile, setSelectedFile] = useState<File | null>(null);
   const [replyingTo, setReplyingTo] = useState<Message | null>(null);
   const [editingMessage, setEditingMessage] = useState<Message | null>(null);
   const [editContent, setEditContent] = useState('');
   const [conversationId, setConversationId] = useState<string | null>(null);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const router = useRouter();

   // Initialize presence tracking
   const { presence, typingUsers, setTyping, getTypingUsers } = usePresence({
     roomId: quizRoom.quiz_id,
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
    if (conversationId || quizRoom.quiz_id) {
      fetchMessages();
    }
  }, [quizRoom.quiz_id, conversationId]);

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
    if (!quizRoom.quiz_id || !currentUser?.id) {
      console.log('Skipping subscription setup - missing quizId or currentUser');
      return;
    }

    console.log('=== Setting up real-time subscription ===');
    console.log('Channel name:', `quiz_room_${quizRoom.quiz_id}`);
    console.log('Filter:', `quiz_id=eq.${quizRoom.quiz_id}`);
    console.log('Current user:', currentUser);

    let channel: any = null;

    const setupSubscription = () => {
      channel = supabase
        .channel(`quiz_room_${quizRoom.quiz_id}`, {
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
            table: 'quiz_room_messages',
            filter: `quiz_id=eq.${quizRoom.quiz_id}`,
          },
          (payload) => {
            console.log('=== REAL-TIME MESSAGE RECEIVED ===');
            console.log('Payload:', payload);
            console.log('New message data:', payload.new);
            console.log('Message user_id from payload:', payload.new?.user_id);
            console.log('Current user ID:', currentUser.id);

            // Only fetch if the message is not from the current user (to avoid duplication)
            if (payload.new?.user_id !== currentUser.id) {
              console.log('Fetching messages after real-time update from other user...');
              fetchMessages();
            } else {
              console.log('Skipping fetch - message is from current user');
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'quiz_room_messages',
            filter: `quiz_id=eq.${quizRoom.quiz_id}`,
          },
          (payload) => {
            console.log('=== REAL-TIME MESSAGE UPDATED ===');
            console.log('Updated message:', payload.new);
            fetchMessages();
          }
        )
        .subscribe((status, err) => {
          console.log('=== SUBSCRIPTION STATUS CHANGE ===');
          console.log('Subscription status:', status);
          if (err) {
            console.error('Subscription error:', err);
          }
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time updates for quiz room:', quizRoom.quiz_id);
          } else if (status === 'CLOSED') {
            console.log('Subscription closed for quiz room:', quizRoom.quiz_id);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel error for quiz room:', quizRoom.quiz_id, err);
          } else if (status === 'TIMED_OUT') {
            console.log('Subscription timed out, attempting to reconnect...');
            // Attempt to reconnect after a delay
            setTimeout(() => {
              if (channel) {
                supabase.removeChannel(channel);
                setupSubscription();
              }
            }, 5000);
          }
        });
    };

    setupSubscription();

    return () => {
      console.log('=== CLEANING UP SUBSCRIPTION ===');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [quizRoom.quiz_id, currentUser.id]);

  const fetchMessages = async () => {
    console.log('=== FETCHING QUIZ ROOM MESSAGES ===');
    console.log('Quiz ID:', quizRoom.quiz_id);
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

      // First, ensure we have a conversation for this quiz room
      if (!conversationId) {
        await createOrGetConversation(token);
      }

      // If we still don't have a conversation ID, create a welcome message
      if (!conversationId) {
        const welcomeMessage: Message = {
          id: 'welcome',
          quiz_id: quizRoom.quiz_id,
          user_id: 'system',
          message_type: 'system',
          content: `Welcome to the discussion room for "${quizRoom.quiz_title}". Start chatting with StudyBot!`,
          file_url: undefined,
          file_name: undefined,
          file_size: undefined,
          file_type: undefined,
          is_pinned: false,
          reply_to_id: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_name: 'System',
          user_email: 'system@quizhub.com',
          user_role: 'system',
          reaction_count: 0,
          user_reactions: [],
          user: undefined
        };

        setMessages([welcomeMessage]);
        setUserRole('student');
        return;
      }

      // Fetch messages from the chatbot API
      const response = await fetch(`/api/chatbot/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Chatbot messages loaded:', data.messages);

        // Transform chatbot messages to our format
        const transformedMessages: Message[] = (data.messages || []).map((msg: any) => ({
          id: msg.id,
          quiz_id: quizRoom.quiz_id,
          user_id: msg.role === 'user' ? currentUser.id : 'bot',
          message_type: msg.role === 'assistant' ? 'bot' : 'text',
          content: msg.content,
          file_url: undefined,
          file_name: undefined,
          file_size: undefined,
          file_type: undefined,
          is_pinned: false,
          reply_to_id: undefined,
          created_at: msg.created_at,
          updated_at: msg.created_at,
          user_name: msg.role === 'user' ? currentUser.name : 'StudyBot',
          user_email: msg.role === 'user' ? currentUser.email : 'bot@quizhub.com',
          user_role: msg.role === 'user' ? 'student' : 'bot',
          reaction_count: 0,
          user_reactions: [],
          user: msg.role === 'user' ? {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email
          } : undefined
        }));

        // Add a welcome message if no messages exist
        if (transformedMessages.length === 0) {
          const welcomeMessage: Message = {
            id: 'welcome',
            quiz_id: quizRoom.quiz_id,
            user_id: 'system',
            message_type: 'system',
            content: `Welcome to the discussion room for "${quizRoom.quiz_title}". Start chatting with StudyBot!`,
            file_url: undefined,
            file_name: undefined,
            file_size: undefined,
            file_type: undefined,
            is_pinned: false,
            reply_to_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_name: 'System',
            user_email: 'system@quizhub.com',
            user_role: 'system',
            reaction_count: 0,
            user_reactions: [],
            user: undefined
          };
          transformedMessages.unshift(welcomeMessage);
        }

        setMessages(transformedMessages);
        setUserRole('student');
      } else {
        console.error('Failed to fetch chatbot messages');
        // Fallback to welcome message
        const welcomeMessage: Message = {
          id: 'welcome',
          quiz_id: quizRoom.quiz_id,
          user_id: 'system',
          message_type: 'system',
          content: `Welcome to the discussion room for "${quizRoom.quiz_title}". Start chatting with StudyBot!`,
          file_url: undefined,
          file_name: undefined,
          file_size: undefined,
          file_type: undefined,
          is_pinned: false,
          reply_to_id: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_name: 'System',
          user_email: 'system@quizhub.com',
          user_role: 'system',
          reaction_count: 0,
          user_reactions: [],
          user: undefined
        };

        setMessages([welcomeMessage]);
        setUserRole('student');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const createOrGetConversation = async (token: string) => {
    try {
      console.log('Creating or getting conversation for quiz:', quizRoom.quiz_id);

      // Create a new conversation for this quiz room
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Quiz Discussion: ${quizRoom.room_name}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Conversation created:', data.conversation.id);
        setConversationId(data.conversation.id);
      } else {
        console.error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

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

      // Ensure we have a conversation
      if (!conversationId) {
        await createOrGetConversation(token);
        if (!conversationId) {
          alert('Failed to create conversation. Please try again.');
          return;
        }
      }

      // Optimistically add the user message to the UI
      const optimisticMessage: Message = {
        id: optimisticMessageId,
        quiz_id: quizRoom.quiz_id,
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
      setReplyingTo(null);
      handleTypingStop();

      // Send message to chatbot API
      const response = await fetch(`/api/chatbot/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Chatbot response received:', data);

        // Update the user message status
        setMessages(prev => prev.map(msg => {
          if (msg.id === optimisticMessageId) {
            return {
              ...msg,
              message_status: 'sent'
            };
          }
          return msg;
        }));

        // Add the AI response to the messages
        if (data.aiMessage && data.response) {
          const aiMessage: Message = {
            id: data.aiMessage.id,
            quiz_id: quizRoom.quiz_id,
            user_id: 'bot',
            message_type: 'bot',
            content: data.response,
            file_url: undefined,
            file_name: undefined,
            file_size: undefined,
            file_type: undefined,
            is_pinned: false,
            reply_to_id: undefined,
            created_at: data.aiMessage.created_at,
            updated_at: data.aiMessage.created_at,
            user_name: 'StudyBot',
            user_email: 'bot@quizhub.com',
            user_role: 'bot',
            reaction_count: 0,
            user_reactions: [],
            user: undefined
          };

          setMessages(prev => [...prev, aiMessage]);
        }
      } else {
        console.error('Failed to send message to chatbot');
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessageId));
        alert('Failed to send message. Please try again.');
        setNewMessage(messageContent);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessageId));
      alert('Failed to send message. Please try again.');
      setNewMessage(messageContent);
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
    }, 3000);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading quiz chat...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Quiz Chat</h2>
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
            <h3 className="text-lg font-semibold text-gray-900">{quizRoom.room_name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{quizRoom.quiz_title}</span>
              {(() => {
                const onlineUsers = Object.values(presence).filter(user =>
                  user.status === 'online' && user.active_rooms?.includes(quizRoom.quiz_id)
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
              {userRole === 'admin' ? 'Admin' : 'Student'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {/* Typing Indicators */}
        {(() => {
          const typingUsersInRoom = getTypingUsers(quizRoom.quiz_id);
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
              <p className="text-gray-600">Be the first to start the discussion!</p>
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

                      <div className={`rounded-lg px-3 py-2 max-w-md ${
                        isCurrentUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>

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
                          </div>
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
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... Use @bot to ask StudyBot for help!"
              className="min-h-[40px] max-h-[100px] resize-none"
              disabled={sending}
            />
          </div>
          <div className="flex items-end space-x-2">
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
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}