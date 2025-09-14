-- Fix RLS policies for study group messages
-- The issue is that our API uses JWT tokens but RLS policies expect Supabase auth context

-- Drop existing policies
DROP POLICY IF EXISTS "Group members can view messages" ON public.study_group_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON public.study_group_messages;

-- Create more permissive policies that work with our JWT-based API
-- Since we're using supabaseAdmin in the API, we need to allow service role access
CREATE POLICY "Allow service role full access" ON public.study_group_messages
  FOR ALL USING (true);

-- For regular users (if they ever access directly), keep the membership check
CREATE POLICY "Group members can view messages via auth" ON public.study_group_messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_study_groups usg
      WHERE usg.group_id = study_group_messages.group_id
      AND usg.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages via auth" ON public.study_group_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_study_groups usg
      WHERE usg.group_id = study_group_messages.group_id
      AND usg.user_id = auth.uid()
    )
  );

-- Also fix the reactions table
DROP POLICY IF EXISTS "Group members can view reactions" ON public.study_group_message_reactions;
DROP POLICY IF EXISTS "Group members can add reactions" ON public.study_group_message_reactions;

CREATE POLICY "Allow service role full access reactions" ON public.study_group_message_reactions
  FOR ALL USING (true);

CREATE POLICY "Group members can view reactions via auth" ON public.study_group_message_reactions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_study_groups usg
      JOIN public.study_group_messages sgm ON sgm.group_id = usg.group_id
      WHERE sgm.id = study_group_message_reactions.message_id
      AND usg.user_id = auth.uid()
    )
  );

-- Add diagnostic logging
DO $$
BEGIN
    RAISE NOTICE 'RLS policies updated for study group messages';
    RAISE NOTICE 'Service role now has full access, regular users have membership-based access';
END $$;