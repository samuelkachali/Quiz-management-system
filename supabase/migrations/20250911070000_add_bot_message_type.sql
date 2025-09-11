-- Add bot message type to study group messages
-- This migration adds support for bot messages in study group chat

-- Allow null user_id for bot messages
alter table public.study_group_messages
alter column user_id drop not null;

-- Update the check constraint to include 'bot' message type
alter table public.study_group_messages
drop constraint if exists study_group_messages_message_type_check;

alter table public.study_group_messages
add constraint study_group_messages_message_type_check
check (message_type in ('text', 'file', 'system', 'announcement', 'bot'));

-- Update the RLS policy to allow bot messages (service role can create them)
create policy "Service role can create bot messages" on public.study_group_messages
  for insert with check (
    auth.role() = 'service_role' and message_type = 'bot'
  );

-- Update existing RLS policies to handle null user_id for bot messages
drop policy if exists "Users can update their own messages" on public.study_group_messages;
create policy "Users can update their own messages" on public.study_group_messages
  for update using (auth.uid() = user_id or (message_type = 'bot' and auth.role() = 'service_role'));