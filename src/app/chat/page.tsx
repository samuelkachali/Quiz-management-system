'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudyGroupManager from '@/components/StudyGroupManager';
import QuizChat from '@/components/QuizChat';

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

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuizRoom, setActiveQuizRoom] = useState<ChatRoom | null>(null);
  const [activeTab, setActiveTab] = useState('rooms');
  const router = useRouter();

  useEffect(() => {
    console.log('Chat page useEffect triggered');

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    console.log('Token exists:', !!token);
    console.log('User data exists:', !!userData);

    if (!token || !userData) {
      console.log('Missing token or user data, redirecting to login');
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      console.log('Parsed user:', parsedUser);
      setUser(parsedUser);

      console.log('Calling fetchChatRooms...');
      fetchChatRooms(token);

      // Check for room parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get('room');
      const roomType = urlParams.get('type');

      if (roomId && roomType === 'quiz') {
        console.log('Room parameter found, looking for quiz room:', roomId);
        // Find the room in the chat rooms and set it as active
        // We'll handle this after chat rooms are loaded
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  // Handle URL parameters after chat rooms are loaded
  useEffect(() => {
    if (chatRooms.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get('room');
      const roomType = urlParams.get('type');

      if (roomId && roomType === 'quiz') {
        console.log('URL parameter detected, looking for room:', roomId);
        const room = chatRooms.find(r => r.quiz_id === roomId);
        if (room) {
          console.log('Found room, joining:', room.room_name);
          handleJoinQuizRoom(room);
          // Clear URL parameters to avoid re-triggering
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          console.log('Room not found:', roomId);
        }
      }
    }
  }, [chatRooms]);

  const fetchChatRooms = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching chat rooms...');

      // Fetch available chat rooms
      const response = await fetch('/api/chat/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Chat rooms API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Chat rooms API response data:', data);
        console.log('Number of rooms received:', data.rooms?.length || 0);

        if (data.rooms && data.rooms.length > 0) {
          console.log('Sample room:', data.rooms[0]);
        }

        setChatRooms(data.rooms || []);
      } else {
        const errorData = await response.json();
        console.error('Chat rooms API error:', errorData);

        // Ensure we always set a string error message
        const errorMessage = typeof errorData === 'string'
          ? errorData
          : errorData?.message || 'Failed to load chat rooms';
        setError(errorMessage);
        setChatRooms([]);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      setError('Failed to load chat rooms');
      setChatRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQuizRoom = (room: ChatRoom) => {
    console.log('Joining quiz room:', room.room_name, room.quiz_id);
    setActiveQuizRoom(room);
    setActiveTab('quiz-chat');
    console.log('Active tab set to quiz-chat, active room:', room.room_name);
  };

  const handleBackToRooms = () => {
    setActiveQuizRoom(null);
    setActiveTab('rooms');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading chat rooms...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">Warning</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Chat</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">💬</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Study Collaboration Hub
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <span className="text-gray-600 text-sm">Welcome back,</span>
                <span className="text-gray-900 font-semibold ml-1">{user?.name}</span>
              </div>
              <Link
                href={user?.role === 'admin' || user?.role === 'super_admin' ? '/admin/dashboard' : '/student/dashboard'}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                ← Back to Dashboard
              </Link>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <span className="text-white text-3xl">💬</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Study Collaboration Hub
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect with fellow students, join study groups, and discuss quiz topics in dedicated collaborative spaces
            </p>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
            console.log('Tab changed to:', value);
            setActiveTab(value);
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="groups" className="text-lg py-3">
                👥 Study Groups
              </TabsTrigger>
              <TabsTrigger value="rooms" className="text-lg py-3">
                📚 Quiz Rooms
              </TabsTrigger>
              <TabsTrigger
                value="quiz-chat"
                className="text-lg py-3"
                disabled={!activeQuizRoom}
              >
                💬 {activeQuizRoom ? `Quiz: ${activeQuizRoom.room_name}` : 'Quiz Chat'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="space-y-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">👥 Study Groups</h3>
                <p className="text-gray-600">Collaborative learning spaces</p>
              </div>
              <StudyGroupManager />
            </TabsContent>

            <TabsContent value="rooms" className="space-y-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">💬 Quiz Discussion Rooms</h3>
                <p className="text-gray-600">Discuss quiz topics in dedicated rooms</p>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Debug Info</h4>
                <p className="text-sm text-yellow-700">
                  Chat Rooms: {chatRooms.length} | Loading: {loading ? 'Yes' : 'No'} | Error: {error || 'None'}
                </p>
                {chatRooms.length > 0 && (
                  <p className="text-sm text-yellow-700 mt-1">
                    First room: {chatRooms[0]?.room_name}
                  </p>
                )}
              </div>
                {chatRooms.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Study Rooms Yet</h3>
                    <p className="text-gray-500 mb-6">Chat rooms will be created automatically when quizzes are published</p>
                    <Link
                      href={user?.role === 'admin' || user?.role === 'super_admin' ? '/admin/dashboard' : '/student/dashboard'}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <span>📝</span>
                      <span>Go to Dashboard</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {chatRooms.map((room, index) => (
                      <Card key={room.quiz_id} className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg text-gray-900 mb-2">{room.room_name}</CardTitle>
                              <CardDescription className="text-gray-600 mb-3">
                                {room.room_description}
                              </CardDescription>
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  📚 {room.quiz_title}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Study Group</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                              onClick={() => handleJoinQuizRoom(room)}
                            >
                              Join Discussion
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="quiz-chat" className="space-y-8">
                {activeQuizRoom && user ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{activeQuizRoom.room_name}</h3>
                        <p className="text-gray-600">{activeQuizRoom.room_description}</p>
                        <p className="text-sm text-gray-500 mt-1">Quiz: {activeQuizRoom.quiz_title}</p>
                      </div>
                      <Button
                        onClick={handleBackToRooms}
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        ← Back to Rooms
                      </Button>
                    </div>

                    {/* Quiz Chat Interface */}
                    <QuizChat
                      quizRoom={activeQuizRoom}
                      currentUser={user}
                    />
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">💬</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Quiz Room Selected</h4>
                    <p className="text-gray-600 mb-6">Select a quiz discussion room to start chatting</p>
                    <Button onClick={() => setActiveTab('rooms')}>
                      Browse Quiz Rooms
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

          <div className="mt-16 bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">How Study Collaboration Works</h3>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">📚</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Quiz-Linked Rooms</h4>
                  <p className="text-gray-600 text-sm">Each quiz automatically creates a dedicated discussion room</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">👥</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Study Groups</h4>
                  <p className="text-gray-600 text-sm">Create and join collaborative study groups for better learning</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Academic Integrity</h4>
                  <p className="text-gray-600 text-sm">Safe environment for learning without compromising quiz integrity</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}