-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp" with schema public;

-- Create users table
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid not null,
  email text not null unique,
  name text not null,
  role text not null check (role in ('admin', 'student', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'pending', 'rejected')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create quizzes table
create table if not exists public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  questions jsonb not null default '[]'::jsonb,
  passing_score integer default 70,
  created_by uuid not null references public.users(id),
  is_published boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create quiz_attempts table
create table if not exists public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.users(id),
  answers jsonb not null default '{}'::jsonb,
  score integer not null,
  passed boolean not null default false,
  completed_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_quizzes_created_by on public.quizzes(created_by);
create index if not exists idx_quiz_attempts_quiz_id on public.quiz_attempts(quiz_id);
create index if not exists idx_quiz_attempts_student_id on public.quiz_attempts(student_id);
create index if not exists idx_users_auth_id on public.users(auth_id);

-- Enable Row Level Security (RLS) for Supabase
alter table public.users enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;

-- Create policies for authenticated access
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = auth_id);

create policy "Admins can view all users" on public.users
  for select using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Public quizzes are viewable by everyone" on public.quizzes
  for select using (is_published = true);

create policy "Admins can manage quizzes" on public.quizzes
  for all using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Students can view their own attempts" on public.quiz_attempts
  for select using (auth.uid() = student_id);

create policy "Admins can view all attempts" on public.quiz_attempts
  for select using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Students can create attempts" on public.quiz_attempts
  for insert with check (auth.uid() = student_id);
