-- Chatbot Conversations and Messages System
-- This migration adds tables for AI chatbot conversations and messages

-- Create chatbot_conversations table for storing conversation sessions
create table if not exists public.chatbot_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create chatbot_messages table for storing individual messages
create table if not exists public.chatbot_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.chatbot_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_chatbot_conversations_user_id on public.chatbot_conversations(user_id);
create index if not exists idx_chatbot_conversations_created_at on public.chatbot_conversations(created_at);
create index if not exists idx_chatbot_conversations_user_status on public.chatbot_conversations(user_id, status);
create index if not exists idx_chatbot_messages_conversation_id on public.chatbot_messages(conversation_id);
create index if not exists idx_chatbot_messages_created_at on public.chatbot_messages(created_at);
create index if not exists idx_chatbot_messages_conversation_created on public.chatbot_messages(conversation_id, created_at);

-- Enable Row Level Security
alter table public.chatbot_conversations enable row level security;
alter table public.chatbot_messages enable row level security;

-- RLS Policies for chatbot_conversations
create policy "Users can view their own conversations" on public.chatbot_conversations
  for select using (auth.uid() = user_id);

create policy "Users can create their own conversations" on public.chatbot_conversations
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own conversations" on public.chatbot_conversations
  for update using (auth.uid() = user_id);

create policy "Users can delete their own conversations" on public.chatbot_conversations
  for delete using (auth.uid() = user_id);

-- RLS Policies for chatbot_messages
create policy "Users can view messages from their conversations" on public.chatbot_messages
  for select using (
    exists (
      select 1 from public.chatbot_conversations
      where id = chatbot_messages.conversation_id
      and user_id = auth.uid()
    )
  );

create policy "Users can create messages in their conversations" on public.chatbot_messages
  for insert with check (
    exists (
      select 1 from public.chatbot_conversations
      where id = chatbot_messages.conversation_id
      and user_id = auth.uid()
    )
  );

create policy "Users can update messages in their conversations" on public.chatbot_messages
  for update using (
    exists (
      select 1 from public.chatbot_conversations
      where id = chatbot_messages.conversation_id
      and user_id = auth.uid()
    )
  );

create policy "Users can delete messages in their conversations" on public.chatbot_messages
  for delete using (
    exists (
      select 1 from public.chatbot_conversations
      where id = chatbot_messages.conversation_id
      and user_id = auth.uid()
    )
  );

-- Function to get conversation messages with user info
create or replace function get_chatbot_conversation_messages(
  p_conversation_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  conversation_id uuid,
  role text,
  content text,
  metadata jsonb,
  created_at timestamp with time zone
) as $$
begin
  -- Check if user owns the conversation
  if not exists (
    select 1 from public.chatbot_conversations
    where id = p_conversation_id and user_id = auth.uid()
  ) then
    raise exception 'Access denied: conversation not found or not owned by user';
  end if;

  return query
  select
    cm.id,
    cm.conversation_id,
    cm.role,
    cm.content,
    cm.metadata,
    cm.created_at
  from public.chatbot_messages cm
  where cm.conversation_id = p_conversation_id
  order by cm.created_at asc
  limit p_limit offset p_offset;
end;
$$ language plpgsql security definer;

-- Function to get user's conversations
create or replace function get_user_chatbot_conversations(
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  message_count bigint
) as $$
begin
  return query
  select
    cc.id,
    cc.user_id,
    cc.title,
    cc.status,
    cc.created_at,
    cc.updated_at,
    coalesce(msg_counts.message_count, 0) as message_count
  from public.chatbot_conversations cc
  left join (
    select conversation_id, count(*) as message_count
    from public.chatbot_messages
    group by conversation_id
  ) msg_counts on cc.id = msg_counts.conversation_id
  where cc.user_id = auth.uid()
  order by cc.updated_at desc
  limit p_limit offset p_offset;
end;
$$ language plpgsql security definer;

-- Trigger to update updated_at timestamp on conversations
create trigger update_chatbot_conversations_updated_at
  before update on public.chatbot_conversations
  for each row execute function update_updated_at_column();