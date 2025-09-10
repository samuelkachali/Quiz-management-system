import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

interface UserData {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

interface UserPresenceData {
  user: UserData;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
  active_rooms: string[];
  isTyping: boolean;
}

type PresenceState = Record<string, UserPresenceData>;

// Type for the presence data that comes from the server
interface RawPresenceData {
  user: UserData;
  status?: 'online' | 'offline' | 'away';
  last_seen?: string;
  active_rooms?: string[];
  isTyping?: boolean;
}

interface UsePresenceOptions {
  roomId?: string;
  onPresenceChange?: (state: PresenceState) => void;
  onTypingChange?: (userId: string, isTyping: boolean) => void;
}

export function usePresence({ roomId, onPresenceChange, onTypingChange }: UsePresenceOptions = {}) {
  const supabase = createClientComponentClient();
  const [presence, setPresence] = useState<PresenceState>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  
  // Track user's online status
  useEffect(() => {
    // Set up presence channel
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'user_id',
        },
      },
    });
    
    // Set up presence tracking
    const trackPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Track user's presence
      const presenceTrackStatus = await presenceChannel.track({
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || '',
        status: 'online',
        last_seen: new Date().toISOString(),
        active_rooms: roomId ? [roomId] : [],
        isTyping: false,
      });
      
      console.log('Presence tracking status:', presenceTrackStatus);
      
      // Sync presence state
      presenceChannel.on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState<RawPresenceData>();
        const updatedPresence: PresenceState = {};

        Object.values(newState).forEach((presences) => {
          presences.forEach((rawPresence) => {
            if (!rawPresence?.user?.id) return;

            const userId = rawPresence.user.id;
            updatedPresence[userId] = {
              user: {
                id: userId,
                email: rawPresence.user.email,
                name: rawPresence.user.name,
                avatar_url: rawPresence.user.avatar_url,
              },
              status: rawPresence.status || 'offline',
              last_seen: rawPresence.last_seen || new Date().toISOString(),
              active_rooms: rawPresence.active_rooms || [],
              isTyping: rawPresence.isTyping || false,
            };
          });
        });

        setPresence(updatedPresence);
        onPresenceChange?.(updatedPresence);
      });
      
      // Handle typing indicators
      presenceChannel.on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, isTyping, room_id } = payload.payload;
        
        if (roomId && room_id !== roomId) return;
        
        setPresence(prev => ({
          ...prev,
          [user_id]: {
            ...prev[user_id],
            isTyping,
          },
        }));
        
        setTypingUsers(prev => ({
          ...prev,
          [user_id]: isTyping,
        }));
        
        onTypingChange?.(user_id, isTyping);
      });
      
      // Handle user leaving
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          // User is leaving the page
          presenceChannel.track({
            user_id: user.id,
            status: 'away',
            last_seen: new Date().toISOString(),
            active_rooms: [],
            isTyping: false,
          });
        } else {
          // User is back
          presenceChannel.track({
            user_id: user.id,
            status: 'online',
            last_seen: new Date().toISOString(),
            active_rooms: roomId ? [roomId] : [],
            isTyping: false,
          });
        }
      };
      
      // Set up event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        // Clean up
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        presenceChannel.untrack();
        presenceChannel.unsubscribe();
      };
    };
    
    trackPresence();
    
    return () => {
      presenceChannel.unsubscribe();
    };
  }, [roomId, supabase, onPresenceChange, onTypingChange]);
  
  // Update active room when roomId changes
  useEffect(() => {
    if (!channel || !roomId) return;
    
    const updateActiveRoom = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await channel.track({
        user_id: user.id,
        active_rooms: [roomId],
      });
    };
    
    updateActiveRoom();
  }, [roomId, channel, supabase]);
  
  // Send typing indicator
  const setTyping = async (isTyping: boolean) => {
    if (!channel || !roomId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        room_id: roomId,
        isTyping,
      },
    });
    
    // Update local state
    setPresence(prev => ({
      ...prev,
      [user.id]: {
        ...prev[user.id],
        isTyping,
      },
    }));
  };
  
  // Get users currently in the room
  const getUsersInRoom = (roomId: string) => {
    return Object.values(presence).filter(
      user => user.active_rooms?.includes(roomId)
    );
  };
  
  // Get users who are currently typing
  const getTypingUsers = (roomId?: string) => {
    return Object.entries(presence)
      .filter(([_, user]) => {
        const isInRoom = roomId ? user.active_rooms?.includes(roomId) : true;
        return isInRoom && user.isTyping;
      })
      .map(([_, user]) => user);
  };
  
  return {
    presence,
    typingUsers,
    setTyping,
    getUsersInRoom,
    getTypingUsers,
  };
}
