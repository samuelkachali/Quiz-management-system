'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudyGroupChat from './StudyGroupChat';
import { usePresence } from '@/lib/presence';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  quiz_id?: string;
  created_by: string;
  max_members: number;
  is_active: boolean;
  created_at: string;
  member_count: number;
  is_member: boolean;
  is_creator: boolean;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ChatRoom {
  quiz_id: string;
  room_name: string;
  room_description: string;
  room_type: string;
  quiz_title: string;
  quiz_description: string;
}

export default function StudyGroupManager() {
  const [user, setUser] = useState<User | null>(null);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [activeTab, setActiveTab] = useState('manage');
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    maxMembers: 50
  });
  const router = useRouter();

  // Initialize presence tracking
  const { presence, getUsersInRoom } = usePresence();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      // Validate user data structure
      if (!parsedUser.id || !parsedUser.name || !parsedUser.email) {
        console.error('Invalid user data structure:', parsedUser);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      console.log('StudyGroupManager - User data loaded:', parsedUser);
      setUser(parsedUser);
      fetchStudyGroups(token);
      fetchChatRooms(token);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const fetchStudyGroups = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/chat/study-groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudyGroups(data.groups || []);
      } else {
        const errorData = await response.json();
        // Ensure we always set a string error message
        const errorMessage = typeof errorData === 'string'
          ? errorData
          : errorData?.message || 'Failed to load study groups';
        setError(errorMessage);
        setStudyGroups([]);
      }
    } catch (error) {
      console.error('Error fetching study groups:', error);
      setError('Failed to load study groups');
      setStudyGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatRooms = async (token: string) => {
    try {
      console.log('Fetching chat rooms...');

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
        setChatRooms([]);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      setChatRooms([]);
    }
  };

  const handleCreateGroup = async () => {
    if (!createForm.name.trim()) {
      alert('Group name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/study-groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          maxMembers: createForm.maxMembers
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Study group created successfully!');
        setShowCreateDialog(false);
        setCreateForm({ name: '', description: '', maxMembers: 50 });
        fetchStudyGroups(token); // Refresh the list
      } else {
        const errorMessage = typeof data === 'string'
          ? data
          : data?.message || 'Failed to create study group';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error creating study group:', error);
      alert('Failed to create study group');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/study-groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert('Successfully joined study group!');
        fetchStudyGroups(token); // Refresh the list
      } else {
        const errorMessage = typeof data === 'string'
          ? data
          : data?.message || 'Failed to join study group';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error joining study group:', error);
      alert('Failed to join study group');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to leave this study group?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/chat/study-groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert('Successfully left study group!');
        fetchStudyGroups(token); // Refresh the list
      } else {
        const errorMessage = typeof data === 'string'
          ? data
          : data?.message || 'Failed to leave study group';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error leaving study group:', error);
      alert('Failed to leave study group');
    }
  };

  const handleOpenGroup = (group: StudyGroup) => {
    setActiveGroup(group);
    setActiveTab('chat');
  };

  const handleBackToManage = () => {
    setActiveGroup(null);
    setActiveTab('manage');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading study groups...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Study Groups</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Study Groups Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">👥 Study Groups</h3>
          <p className="text-gray-600">Collaborative learning spaces</p>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {activeTab === 'chat' && activeGroup ? `Chat: ${activeGroup.name}` : 'Study Groups'}
            </h2>
            <p className="text-gray-600">
              {activeTab === 'chat'
                ? 'Real-time messaging and collaboration'
                : 'Collaborate with fellow students in dedicated study groups'
              }
            </p>
          </div>
          {activeTab === 'chat' && activeGroup ? (
            <Button
              onClick={handleBackToManage}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              ← Back to Groups
            </Button>
          ) : (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Study Group
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Study Group</DialogTitle>
                  <DialogDescription>
                    Create a collaborative study space for you and your classmates
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="group-name">Group Name *</Label>
                    <Input
                      id="group-name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Math Study Group"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="group-description">Description</Label>
                    <Textarea
                      id="group-description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the purpose of this study group..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-members">Maximum Members</Label>
                    <Input
                      id="max-members"
                      type="number"
                      value={createForm.maxMembers}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 50 }))}
                      min="2"
                      max="100"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGroup}>
                      Create Group
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Study Rooms Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">💬 Study Rooms</h3>
          <p className="text-gray-600">Quiz discussion rooms</p>
        </div>

        {/* Debug Info */}
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

        {/* Chat Rooms Grid */}
        {chatRooms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Study Rooms Yet</h3>
            <p className="text-gray-500 mb-6">Chat rooms will be created automatically when quizzes are published</p>
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
                      onClick={() => {
                        // Navigate to quiz-specific chat room
                        router.push(`/chat?room=${room.quiz_id}&type=quiz`);
                      }}
                    >
                      Join Discussion
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Study Groups Management Tabs */}
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="manage" className="text-lg py-3">
            📋 Manage Groups
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-lg py-3" disabled={!activeGroup}>
            💬 Group Chat {activeGroup && `(${activeGroup.name})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-8">
          {/* Study Groups Grid */}
          {studyGroups.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Study Groups Yet</h3>
              <p className="text-gray-500 mb-6">Be the first to create a study group for collaborative learning!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {studyGroups.map((group) => (
                <Card key={group.id} className="bg-white/70 backdrop-blur-sm shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-gray-900 mb-2">{group.name}</CardTitle>
                        <CardDescription className="text-gray-600 mb-3">
                          {group.description || 'No description provided'}
                        </CardDescription>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{group.member_count}/{group.max_members} members</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{(() => {
                              const onlineUsers = getUsersInRoom(group.id);
                              return onlineUsers.length;
                            })()} online</span>
                          </div>
                        </div>
                      </div>
                      {group.is_creator && (
                        <div className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                          Admin
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Created by {group.creator?.name || 'Unknown'}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenGroup(group)}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        >
                          Open Group
                        </Button>
                        {group.is_member ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLeaveGroup(group.id)}
                            className="border-red-200 text-red-700 hover:bg-red-50"
                          >
                            Leave
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleJoinGroup(group.id)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            disabled={group.member_count >= group.max_members}
                          >
                            {group.member_count >= group.max_members ? 'Full' : 'Join'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Section */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Join Study Groups?</h3>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">🤝</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Collaborative Learning</h4>
                  <p className="text-gray-600 text-sm">Learn together and share knowledge with peers</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">📚</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Better Preparation</h4>
                  <p className="text-gray-600 text-sm">Discuss quiz topics and clarify doubts together</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Higher Success</h4>
                  <p className="text-gray-600 text-sm">Group study often leads to better quiz performance</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-8">
          {activeGroup && user ? (
            <StudyGroupChat
              groupId={activeGroup.id}
              studyGroup={activeGroup}
              currentUser={user}
            />
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Group Selected</h3>
              <p className="text-gray-500 mb-6">Select a study group to start chatting</p>
              <Button onClick={() => setActiveTab('manage')}>
                Browse Groups
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}