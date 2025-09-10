-- Create study groups tables for real-time chat functionality

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp" with schema public;

-- Create study_groups table
create table if not exists public.study_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  quiz_id uuid references public.quizzes(id) on delete set null,
  created_by uuid not null references public.users(id) on delete cascade,
  max_members integer default 50,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create user_study_groups table (membership)
create table if not exists public.user_study_groups (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.study_groups(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'moderator', 'member')),
  joined_at timestamp with time zone default now(),
  unique(user_id, group_id)
);

-- Create study_group_messages table
create table if not exists public.study_group_messages (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  message_type text not null default 'text' check (message_type in ('text', 'file', 'system', 'announcement')),
  file_url text,
  file_name text,
  file_size bigint,
  parent_message_id uuid references public.study_group_messages(id) on delete cascade,
  is_pinned boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create study_group_message_reactions table
create table if not exists public.study_group_message_reactions (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.study_group_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji text not null,
  created_at timestamp with time zone default now(),
  unique(message_id, user_id, emoji)
);

-- Create indexes for better performance
create index if not exists idx_study_groups_created_by on public.study_groups(created_by);
create index if not exists idx_study_groups_quiz_id on public.study_groups(quiz_id);
create index if not exists idx_study_groups_active on public.study_groups(is_active);
create index if not exists idx_user_study_groups_user_id on public.user_study_groups(user_id);
create index if not exists idx_user_study_groups_group_id on public.user_study_groups(group_id);
create index if not exists idx_study_group_messages_group_id on public.study_group_messages(group_id);
create index if not exists idx_study_group_messages_user_id on public.study_group_messages(user_id);
create index if not exists idx_study_group_messages_created_at on public.study_group_messages(created_at);
create index if not exists idx_study_group_message_reactions_message_id on public.study_group_message_reactions(message_id);

-- Enable Row Level Security (RLS)
alter table public.study_groups enable row level security;
alter table public.user_study_groups enable row level security;
alter table public.study_group_messages enable row level security;
alter table public.study_group_message_reactions enable row level security;

-- Create RLS policies for study_groups
create policy "Anyone can view active study groups" on public.study_groups
  for select using (is_active = true);

create policy "Authenticated users can create study groups" on public.study_groups
  for insert with check (auth.uid() = created_by);

create policy "Group creators can update their groups" on public.study_groups
  for update using (auth.uid() = created_by);

create policy "Group creators can delete their groups" on public.study_groups
  for delete using (auth.uid() = created_by);

-- Create RLS policies for user_study_groups
create policy "Users can view their group memberships" on public.user_study_groups
  for select using (auth.uid() = user_id);

create policy "Users can join groups" on public.user_study_groups
  for insert with check (auth.uid() = user_id);

create policy "Users can leave groups" on public.user_study_groups
  for delete using (auth.uid() = user_id);

create policy "Group admins can manage memberships" on public.user_study_groups
  for all using (
    exists (
      select 1 from public.user_study_groups ug
      where ug.group_id = user_study_groups.group_id
      and ug.user_id = auth.uid()
      and ug.role = 'admin'
    )
  );

-- Create RLS policies for study_group_messages
create policy "Group members can view messages" on public.study_group_messages
  for select using (
    exists (
      select 1 from public.user_study_groups ug
      where ug.group_id = study_group_messages.group_id
      and ug.user_id = auth.uid()
    )
  );

create policy "Group members can send messages" on public.study_group_messages
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.user_study_groups ug
      where ug.group_id = study_group_messages.group_id
      and ug.user_id = auth.uid()
    )
  );

create policy "Users can edit their own messages" on public.study_group_messages
  for update using (auth.uid() = user_id);

create policy "Users can delete their own messages" on public.study_group_messages
  for delete using (auth.uid() = user_id);

create policy "Group admins can manage all messages" on public.study_group_messages
  for all using (
    exists (
      select 1 from public.user_study_groups ug
      where ug.group_id = study_group_messages.group_id
      and ug.user_id = auth.uid()
      and ug.role = 'admin'
    )
  );

-- Create RLS policies for study_group_message_reactions
create policy "Group members can view reactions" on public.study_group_message_reactions
  for select using (
    exists (
      select 1 from public.user_study_groups ug
      join public.study_group_messages m on m.group_id = ug.group_id
      where m.id = study_group_message_reactions.message_id
      and ug.user_id = auth.uid()
    )
  );

create policy "Group members can add reactions" on public.study_group_message_reactions
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.user_study_groups ug
      join public.study_group_messages m on m.group_id = ug.group_id
      where m.id = study_group_message_reactions.message_id
      and ug.user_id = auth.uid()
    )
  );

create policy "Users can remove their own reactions" on public.study_group_message_reactions
  for delete using (auth.uid() = user_id);

-- Create service role policies (for admin operations)
create policy "Service role can manage all study groups" on public.study_groups
  for all using (auth.role() = 'service_role');

create policy "Service role can manage all memberships" on public.user_study_groups
  for all using (auth.role() = 'service_role');

create policy "Service role can manage all messages" on public.study_group_messages
  for all using (auth.role() = 'service_role');

create policy "Service role can manage all reactions" on public.study_group_message_reactions
  for all using (auth.role() = 'service_role');

-- Create functions for real-time chat
create or replace function public.handle_new_study_group_member()
returns trigger as $$
begin
  -- Insert a system message when someone joins
  insert into public.study_group_messages (group_id, user_id, content, message_type)
  values (new.group_id, new.user_id, 'joined the group', 'system');

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.handle_leave_study_group_member()
returns trigger as $$
begin
  -- Insert a system message when someone leaves
  insert into public.study_group_messages (old.group_id, old.user_id, 'left the group', 'system');

  return old;
end;
$$ language plpgsql security definer;

-- Create triggers for automatic system messages
drop trigger if exists on_study_group_member_join on public.user_study_groups;
create trigger on_study_group_member_join
  after insert on public.user_study_groups
  for each row execute function public.handle_new_study_group_member();

drop trigger if exists on_study_group_member_leave on public.user_study_groups;
create trigger on_study_group_member_leave
  after delete on public.user_study_groups
  for each row execute function public.handle_leave_study_group_member();

-- Create function to get study group with member info
create or replace function public.get_study_group_with_members(group_uuid uuid)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'group', row_to_json(sg),
    'members', (
      select json_agg(
        json_build_object(
          'user', json_build_object('id', u.id, 'name', u.name, 'email', u.email),
          'role', usg.role,
          'joined_at', usg.joined_at
        )
      )
      from public.user_study_groups usg
      join public.users u on u.id = usg.user_id
      where usg.group_id = sg.id
    ),
    'messages', (
      select json_agg(
        json_build_object(
          'id', m.id,
          'content', m.content,
          'message_type', m.message_type,
          'user', json_build_object('id', u.id, 'name', u.name, 'email', u.email),
          'created_at', m.created_at,
          'reactions', (
            select json_agg(
              json_build_object(
                'emoji', r.emoji,
                'user_id', r.user_id
              )
            )
            from public.study_group_message_reactions r
            where r.message_id = m.id
          )
        ) order by m.created_at
      )
      from public.study_group_messages m
      join public.users u on u.id = m.user_id
      where m.group_id = sg.id
    )
  ) into result
  from public.study_groups sg
  where sg.id = group_uuid and sg.is_active = true;

  return result;
end;
$$ language plpgsql security definer;

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.study_groups to anon, authenticated;
grant all on public.user_study_groups to anon, authenticated;
grant all on public.study_group_messages to anon, authenticated;
grant all on public.study_group_message_reactions to anon, authenticated;

-- Grant execute permissions on functions
grant execute on function public.get_study_group_with_members(uuid) to anon, authenticated;