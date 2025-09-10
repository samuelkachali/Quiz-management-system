-- Study Group Chat and File Sharing System
-- This migration adds tables and functions for real-time study group messaging and file sharing

-- Create study_group_messages table for storing chat messages
create table if not exists public.study_group_messages (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message_type text not null check (message_type in ('text', 'file', 'system', 'announcement')),
  content text,
  file_url text,
  file_name text,
  file_size integer,
  file_type text,
  is_pinned boolean default false,
  reply_to_id uuid references public.study_group_messages(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create study_group_message_reactions table for message reactions
create table if not exists public.study_group_message_reactions (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.study_group_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamp with time zone default now(),
  unique(message_id, user_id, reaction_type)
);

-- Create study_group_files table for shared resources
create table if not exists public.study_group_files (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  uploaded_by uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size integer not null,
  file_type text not null,
  description text,
  is_public boolean default true,
  download_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_study_group_messages_group_id on public.study_group_messages(group_id);
create index if not exists idx_study_group_messages_user_id on public.study_group_messages(user_id);
create index if not exists idx_study_group_messages_created_at on public.study_group_messages(created_at);
create index if not exists idx_study_group_message_reactions_message_id on public.study_group_message_reactions(message_id);
create index if not exists idx_study_group_files_group_id on public.study_group_files(group_id);
create index if not exists idx_study_group_files_uploaded_by on public.study_group_files(uploaded_by);

-- Enable Row Level Security
alter table public.study_group_messages enable row level security;
alter table public.study_group_message_reactions enable row level security;
alter table public.study_group_files enable row level security;

-- RLS Policies for study_group_messages
create policy "Group members can view messages" on public.study_group_messages
  for select using (
    exists (
      select 1 from public.user_study_groups usg
      where usg.group_id = study_group_messages.group_id
      and usg.user_id = auth.uid()
    )
  );

create policy "Group members can send messages" on public.study_group_messages
  for insert with check (
    exists (
      select 1 from public.user_study_groups usg
      where usg.group_id = study_group_messages.group_id
      and usg.user_id = auth.uid()
    )
  );

create policy "Users can update their own messages" on public.study_group_messages
  for update using (auth.uid() = user_id);

create policy "Group admins can delete messages" on public.study_group_messages
  for delete using (
    exists (
      select 1 from public.user_study_groups usg
      where usg.group_id = study_group_messages.group_id
      and usg.user_id = auth.uid()
      and usg.role = 'admin'
    )
  );

-- RLS Policies for study_group_message_reactions
create policy "Group members can view reactions" on public.study_group_message_reactions
  for select using (
    exists (
      select 1 from public.user_study_groups usg
      join public.study_group_messages sgm on sgm.group_id = usg.group_id
      where sgm.id = study_group_message_reactions.message_id
      and usg.user_id = auth.uid()
    )
  );

create policy "Group members can add reactions" on public.study_group_message_reactions
  for insert with check (
    exists (
      select 1 from public.user_study_groups usg
      join public.study_group_messages sgm on sgm.group_id = usg.group_id
      where sgm.id = study_group_message_reactions.message_id
      and usg.user_id = auth.uid()
    )
  );

create policy "Users can remove their own reactions" on public.study_group_message_reactions
  for delete using (auth.uid() = user_id);

-- RLS Policies for study_group_files
create policy "Group members can view files" on public.study_group_files
  for select using (
    exists (
      select 1 from public.user_study_groups usg
      where usg.group_id = study_group_files.group_id
      and usg.user_id = auth.uid()
    )
  );

create policy "Group members can upload files" on public.study_group_files
  for insert with check (
    exists (
      select 1 from public.user_study_groups usg
      where usg.group_id = study_group_files.group_id
      and usg.user_id = auth.uid()
    )
  );

create policy "File uploaders can update their files" on public.study_group_files
  for update using (auth.uid() = uploaded_by);

create policy "File uploaders can delete their files" on public.study_group_files
  for delete using (auth.uid() = uploaded_by);

-- Function to get recent messages for a study group
create or replace function get_study_group_messages(
  p_group_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  group_id uuid,
  user_id uuid,
  message_type text,
  content text,
  file_url text,
  file_name text,
  file_size integer,
  file_type text,
  is_pinned boolean,
  reply_to_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_name text,
  user_email text,
  user_role text,
  reaction_count integer,
  user_reactions text[]
) as $$
begin
  return query
  select
    sgm.id,
    sgm.group_id,
    sgm.user_id,
    sgm.message_type,
    sgm.content,
    sgm.file_url,
    sgm.file_name,
    sgm.file_size,
    sgm.file_type,
    sgm.is_pinned,
    sgm.reply_to_id,
    sgm.created_at,
    sgm.updated_at,
    u.name as user_name,
    u.email as user_email,
    usg.role as user_role,
    coalesce(rc.reaction_count, 0) as reaction_count,
    coalesce(ur.user_reactions, array[]::text[]) as user_reactions
  from public.study_group_messages sgm
  join public.users u on sgm.user_id = u.id
  join public.user_study_groups usg on sgm.group_id = usg.group_id and sgm.user_id = usg.user_id
  left join (
    select message_id, count(*) as reaction_count
    from public.study_group_message_reactions
    group by message_id
  ) rc on sgm.id = rc.message_id
  left join (
    select message_id, array_agg(reaction_type) as user_reactions
    from public.study_group_message_reactions
    where user_id = auth.uid()
    group by message_id
  ) ur on sgm.id = ur.message_id
  where sgm.group_id = p_group_id
  order by sgm.created_at desc
  limit p_limit offset p_offset;
end;
$$ language plpgsql security definer;

-- Function to get study group members
create or replace function get_study_group_members(p_group_id uuid)
returns table (
  user_id uuid,
  user_name text,
  user_email text,
  role text,
  joined_at timestamp with time zone,
  is_online boolean
) as $$
begin
  return query
  select
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    usg.role,
    usg.joined_at,
    true as is_online -- For now, assume all members are online
  from public.user_study_groups usg
  join public.users u on usg.user_id = u.id
  where usg.group_id = p_group_id
  order by usg.joined_at asc;
end;
$$ language plpgsql security definer;

-- Function to check if user is member of study group
create or replace function is_study_group_member(p_group_id uuid, p_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_study_groups
    where group_id = p_group_id and user_id = p_user_id
  );
end;
$$ language plpgsql security definer;

-- Trigger to update updated_at timestamp
create trigger update_study_group_messages_updated_at
  before update on public.study_group_messages
  for each row execute function update_updated_at_column();

create trigger update_study_group_files_updated_at
  before update on public.study_group_files
  for each row execute function update_updated_at_column();