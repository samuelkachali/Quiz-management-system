-- Smart Notifications System Tables
-- This migration adds tables and functions for the smart notifications system

-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('quiz_completed', 'study_group_invite', 'integrity_alert', 'admin_message', 'system_update')),
  title text not null,
  message text not null,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  read boolean default false,
  metadata jsonb default '{}'::jsonb,
  action_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create notification_settings table
create table if not exists public.notification_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  email_notifications boolean default true,
  push_notifications boolean default true,
  quiz_completion_alerts boolean default true,
  study_group_notifications boolean default true,
  integrity_alerts boolean default true,
  admin_messages boolean default true,
  system_updates boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_type on public.notifications(type);
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_notifications_created_at on public.notifications(created_at);
create index if not exists idx_notifications_priority on public.notifications(priority);

create index if not exists idx_notification_settings_user_id on public.notification_settings(user_id);

-- Enable Row Level Security
alter table public.notifications enable row level security;
alter table public.notification_settings enable row level security;

-- RLS Policies for notifications
create policy "Users can view their own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update their own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "System can create notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');

-- RLS Policies for notification_settings
create policy "Users can view their own settings" on public.notification_settings
  for select using (auth.uid() = user_id);

create policy "Users can update their own settings" on public.notification_settings
  for all using (auth.uid() = user_id);

-- Function to create notification for user
create or replace function create_user_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_priority text default 'medium',
  p_metadata jsonb default '{}'::jsonb,
  p_action_url text default null
)
returns uuid as $$
declare
  notification_id uuid;
begin
  insert into public.notifications (
    user_id, type, title, message, priority, metadata, action_url
  ) values (
    p_user_id, p_type, p_title, p_message, p_priority, p_metadata, p_action_url
  )
  returning id into notification_id;

  return notification_id;
end;
$$ language plpgsql security definer;

-- Function to create notification for multiple users
create or replace function create_bulk_notifications(
  p_user_ids uuid[],
  p_type text,
  p_title text,
  p_message text,
  p_priority text default 'medium',
  p_metadata jsonb default '{}'::jsonb,
  p_action_url text default null
)
returns integer as $$
declare
  notification_count integer := 0;
  user_id uuid;
begin
  foreach user_id in array p_user_ids loop
    perform create_user_notification(
      user_id, p_type, p_title, p_message, p_priority, p_metadata, p_action_url
    );
    notification_count := notification_count + 1;
  end loop;

  return notification_count;
end;
$$ language plpgsql security definer;

-- Function to get unread notification count for user
create or replace function get_unread_notification_count(p_user_id uuid)
returns integer as $$
declare
  unread_count integer;
begin
  select count(*) into unread_count
  from public.notifications
  where user_id = p_user_id and read = false;

  return unread_count;
end;
$$ language plpgsql security definer;

-- Function to mark notifications as read
create or replace function mark_notifications_read(
  p_user_id uuid,
  p_notification_ids uuid[] default null
)
returns integer as $$
declare
  updated_count integer;
begin
  if p_notification_ids is null then
    -- Mark all notifications as read
    with updated_rows as (
      update public.notifications
      set read = true, updated_at = now()
      where user_id = p_user_id and read = false
      returning id
    )
    select count(*) into updated_count from updated_rows;
  else
    -- Mark specific notifications as read
    with updated_rows as (
      update public.notifications
      set read = true, updated_at = now()
      where user_id = p_user_id
        and id = any(p_notification_ids)
        and read = false
      returning id
    )
    select count(*) into updated_count from updated_rows;
  end if;

  return updated_count;
end;
$$ language plpgsql security definer;

-- Function to clean up old notifications (keep last 100 per user)
create or replace function cleanup_old_notifications()
returns integer as $$
declare
  total_deleted_count integer := 0;
  user_record record;
  deleted_count integer;
begin
  for user_record in select distinct user_id from public.notifications loop
    -- Delete old notifications, keeping only the most recent 100
    with deleted_rows as (
      delete from public.notifications
      where user_id = user_record.user_id
        and id not in (
          select id from public.notifications
          where user_id = user_record.user_id
          order by created_at desc
          limit 100
        )
      returning id
    )
    select count(*) into deleted_count from deleted_rows;

    total_deleted_count := total_deleted_count + deleted_count;
  end loop;

  return total_deleted_count;
end;
$$ language plpgsql security definer;

-- Trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_notifications_updated_at
  before update on public.notifications
  for each row execute function update_updated_at_column();

create trigger update_notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function update_updated_at_column();