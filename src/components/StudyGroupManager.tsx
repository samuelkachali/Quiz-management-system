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
import { toast } from 'sonner';
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

type StudyGroupManagerProps = {
  embedded?: boolean;
  showDebug?: boolean;
};

export default function StudyGroupManager({ embedded = false, showDebug = false }: StudyGroupManagerProps) {
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
    maxMembers: 50,
  });
  const router = useRouter();

  // Presence tracking
  const { getUsersInRoom } = usePresence();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (!parsedUser.id || !parsedUser.name || !parsedUser.email) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      setUser(parsedUser);
      fetchStudyGroups(token);
      fetchChatRooms(token);
    } catch (err) {
      console.error('Error parsing user data:', err);
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStudyGroups(data.groups || []);
      } else {
        const errorData = await response.json();
        setError(errorData?.message || 'Failed to load study groups');
        setStudyGroups([]);
      }
    } catch (err) {
      setError('Failed to load study groups');
      setStudyGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatRooms = async (token: string) => {
    try {
      const response = await fetch('/api/chat/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setChatRooms(data.rooms || []);
      } else {
        setChatRooms([]);
      }
    } catch (err) {
      setChatRooms([]);
    }
  };

  const handleCreateGroup = async () => {
    if (!createForm.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('/api/chat/study-groups', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Study group created successfully ✅');
        setShowCreateDialog(false);
        setCreateForm({ name: '', description: '', maxMembers: 50 });
        fetchStudyGroups(token);
      } else {
        toast.error(data?.message || 'Failed to create study group');
      }
    } catch (err) {
      toast.error('Unexpected error creating group');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`/api/chat/study-groups/${groupId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Joined study group 🎉');
        fetchStudyGroups(token);
      } else {
        toast.error(data?.message || 'Failed to join study group');
      }
    } catch {
      toast.error('Unexpected error joining group');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm('Leave this study group?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`/api/chat/study-groups/${groupId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Left study group 👋');
        fetchStudyGroups(token);
      } else {
        toast.error(data?.message || 'Failed to leave group');
      }
    } catch {
      toast.error('Unexpected error leaving group');
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
        <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-red-600 mb-2">⚠️ Error Loading Study Groups</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Section Header */}
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Study Groups & Chat</h2>
          {activeTab === 'chat' && activeGroup && (
            <Button variant="outline" onClick={handleBackToManage}>
              ← Back
            </Button>
          )}
        </div>
        <p className="text-gray-600">Collaborate with your peers in real-time</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="manage">📋 Manage Groups</TabsTrigger>
          <TabsTrigger value="chat" disabled={!activeGroup}>
            💬 Group Chat {activeGroup && `(${activeGroup.name})`}
          </TabsTrigger>
        </TabsList>

        {/* Manage Groups */}
        <TabsContent value="manage">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">👥 Study Groups</h3>
            {!embedded && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
                    ➕ Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                    <DialogDescription>Collaborate with classmates</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Max Members</Label>
                      <Input
                        type="number"
                        value={createForm.maxMembers}
                        min={2}
                        max={100}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, maxMembers: parseInt(e.target.value) || 50 })
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateGroup}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Study Groups Grid */}
          {studyGroups.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <h3 className="text-lg font-semibold mb-2">No Study Groups Yet</h3>
              <p className="text-gray-600">Be the first to create one!</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {studyGroups.map((group) => (
                <Card
                  key={group.id}
                  className="bg-white/90 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription>{group.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                      👥 {group.member_count}/{group.max_members}
                      <span>● {getUsersInRoom(group.id).length} online</span>
                    </div>
                    <div className="flex justify-between">
                      {group.is_member ? (
                        <>
                          <Button size="sm" onClick={() => handleOpenGroup(group)}>
                            Open Chat
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200"
                            onClick={() => handleLeaveGroup(group.id)}
                          >
                            Leave
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleJoinGroup(group.id)}
                          disabled={group.member_count >= group.max_members}
                        >
                          {group.member_count >= group.max_members ? 'Full' : 'Join'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Chat */}
        <TabsContent value="chat">
          {activeGroup && user ? (
            <StudyGroupChat groupId={activeGroup.id} studyGroup={activeGroup} currentUser={user} />
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">No Group Selected</h3>
              <p className="text-gray-600 mb-4">Select a group to start chatting</p>
              <Button onClick={() => setActiveTab('manage')}>Browse Groups</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
