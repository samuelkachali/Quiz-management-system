-- Quiz Chat Rooms Table
-- This migration creates the quiz_chat_rooms table for automatic chat room creation when quizzes are published

-- Create quiz_chat_rooms table
create table if not exists public.quiz_chat_rooms (
  quiz_id uuid primary key references public.quizzes(id) on delete cascade,
  room_name text not null,
  room_description text,
  room_type text not null default 'quiz_discussion' check (room_type in ('quiz_discussion', 'general', 'announcement')),
  is_active boolean default true,
  allow_discussion boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_quiz_chat_rooms_quiz_id on public.quiz_chat_rooms(quiz_id);
create index if not exists idx_quiz_chat_rooms_is_active on public.quiz_chat_rooms(is_active);
create index if not exists idx_quiz_chat_rooms_room_type on public.quiz_chat_rooms(room_type);

-- Enable Row Level Security
alter table public.quiz_chat_rooms enable row level security;

-- RLS Policies for quiz_chat_rooms
create policy "Anyone can view active chat rooms" on public.quiz_chat_rooms
  for select using (is_active = true);

create policy "Admins can create chat rooms" on public.quiz_chat_rooms
  for insert with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can update chat rooms" on public.quiz_chat_rooms
  for update using (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can delete chat rooms" on public.quiz_chat_rooms
  for delete using (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- Trigger to update updated_at timestamp
create trigger update_quiz_chat_rooms_updated_at
  before update on public.quiz_chat_rooms
  for each row execute function update_updated_at_column();