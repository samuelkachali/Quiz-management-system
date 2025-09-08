-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp" with schema public;

-- Create quizzes table
create table if not exists public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  passing_score integer default 70,
  time_limit_minutes integer,
  is_published boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create questions table
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'short_answer')),
  points integer not null default 1,
  explanation text,
  order_index integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create answers table
create table if not exists public.answers (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false,
  order_index integer,
  created_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_questions_quiz_id on public.questions(quiz_id);
create index if not exists idx_answers_question_id on public.answers(question_id);

-- Enable Row Level Security (RLS) for Supabase
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;

-- Create policies for public access (adjust these based on your auth requirements)
create policy "Public quizzes are viewable by everyone." on public.quizzes
  for select using (true);

create policy "Questions are viewable by everyone." on public.questions
  for select using (true);

create policy "Answers are viewable by everyone." on public.answers
  for select using (true);
