-- Fix real-time messaging for study group chat
-- This migration enables proper real-time functionality for the study_group_messages table

-- Enable replica identity for real-time updates
-- This ensures all column changes are broadcast to subscribers
ALTER TABLE public.study_group_messages REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
-- This enables real-time subscriptions for INSERT, UPDATE, DELETE operations
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;

-- Also enable for message reactions table for future use
ALTER TABLE public.study_group_message_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_message_reactions;

-- Add some diagnostic logging
DO $$
BEGIN
    RAISE NOTICE 'Real-time messaging configuration applied successfully';
    RAISE NOTICE 'Tables added to supabase_realtime publication: study_group_messages, study_group_message_reactions';
END $$;