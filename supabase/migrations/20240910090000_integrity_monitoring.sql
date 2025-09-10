-- Academic Integrity Monitoring Tables
-- This migration adds tables and functions for monitoring quiz integrity

-- Create integrity_violations table
create table if not exists public.integrity_violations (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  violation_type text not null check (violation_type in ('tab_switch', 'copy_paste', 'time_anomaly', 'suspicious_activity')),
  description text not null,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Create quiz_sessions table for tracking quiz attempts with integrity monitoring
create table if not exists public.quiz_sessions (
  id text primary key,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration_seconds integer,
  flagged_for_review boolean default false,
  risk_level text default 'low' check (risk_level in ('low', 'medium', 'high')),
  violation_count integer default 0,
  status text default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_integrity_violations_session_id on public.integrity_violations(session_id);
create index if not exists idx_integrity_violations_quiz_id on public.integrity_violations(quiz_id);
create index if not exists idx_integrity_violations_student_id on public.integrity_violations(student_id);
create index if not exists idx_integrity_violations_created_at on public.integrity_violations(created_at);

create index if not exists idx_quiz_sessions_quiz_id on public.quiz_sessions(quiz_id);
create index if not exists idx_quiz_sessions_student_id on public.quiz_sessions(student_id);
create index if not exists idx_quiz_sessions_status on public.quiz_sessions(status);
create index if not exists idx_quiz_sessions_flagged on public.quiz_sessions(flagged_for_review);

-- Enable Row Level Security
alter table public.integrity_violations enable row level security;
alter table public.quiz_sessions enable row level security;

-- RLS Policies for integrity_violations
create policy "Students can view their own violations" on public.integrity_violations
  for select using (auth.uid() = student_id);

create policy "Admins can view all violations" on public.integrity_violations
  for select using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "System can insert violations" on public.integrity_violations
  for insert with check (auth.role() = 'authenticated');

-- RLS Policies for quiz_sessions
create policy "Students can view their own sessions" on public.quiz_sessions
  for select using (auth.uid() = student_id);

create policy "Students can create their own sessions" on public.quiz_sessions
  for insert with check (auth.uid() = student_id);

create policy "Students can update their own sessions" on public.quiz_sessions
  for update using (auth.uid() = student_id);

create policy "Admins can view all sessions" on public.quiz_sessions
  for select using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can update all sessions" on public.quiz_sessions
  for update using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

-- Function to automatically update violation count
create or replace function update_violation_count()
returns trigger as $$
begin
  update public.quiz_sessions
  set
    violation_count = (
      select count(*) from public.integrity_violations
      where session_id = new.session_id
    ),
    updated_at = now()
  where id = new.session_id;

  return new;
end;
$$ language plpgsql;

-- Trigger to update violation count when new violations are added
create trigger trigger_update_violation_count
  after insert on public.integrity_violations
  for each row execute function update_violation_count();

-- Function to calculate session duration
create or replace function calculate_session_duration(session_id text)
returns integer as $$
declare
  start_time timestamp with time zone;
  end_time timestamp with time zone;
  duration integer;
begin
  select qs.start_time, qs.end_time into start_time, end_time
  from public.quiz_sessions qs
  where qs.id = session_id;

  if end_time is null then
    duration := extract(epoch from (now() - start_time))::integer;
  else
    duration := extract(epoch from (end_time - start_time))::integer;
  end if;

  return duration;
end;
$$ language plpgsql;

-- Function to get integrity report for a quiz
create or replace function get_quiz_integrity_report(quiz_uuid uuid)
returns table (
  total_sessions bigint,
  flagged_sessions bigint,
  total_violations bigint,
  high_severity_violations bigint,
  avg_violations_per_session numeric
) as $$
begin
  return query
  select
    count(distinct qs.id) as total_sessions,
    count(distinct case when qs.flagged_for_review then qs.id end) as flagged_sessions,
    count(iv.id) as total_violations,
    count(case when iv.severity = 'high' then 1 end) as high_severity_violations,
    round(avg(qs.violation_count), 2) as avg_violations_per_session
  from public.quizzes q
  left join public.quiz_sessions qs on q.id = qs.quiz_id
  left join public.integrity_violations iv on qs.id = iv.session_id
  where q.id = quiz_uuid;
end;
$$ language plpgsql;