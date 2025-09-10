-- Advanced Analytics System Tables
-- This migration adds tables and functions for advanced learning analytics

-- Create learning_patterns table for storing analyzed patterns
create table if not exists public.learning_patterns (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.users(id) on delete cascade,
  pattern_type text not null check (pattern_type in ('performance_trend', 'topic_mastery', 'time_management', 'consistency', 'improvement_rate')),
  subject_area text,
  pattern_data jsonb not null default '{}'::jsonb,
  confidence_score decimal(3,2) check (confidence_score >= 0 and confidence_score <= 1),
  insights text[],
  recommendations text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create predictive_insights table for storing predictions
create table if not exists public.predictive_insights (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.users(id) on delete cascade,
  quiz_id uuid references public.quizzes(id) on delete cascade,
  prediction_type text not null check (prediction_type in ('quiz_score', 'completion_time', 'risk_level', 'topic_performance')),
  predicted_value jsonb not null,
  confidence_interval jsonb,
  factors_considered text[],
  accuracy_score decimal(3,2),
  created_at timestamp with time zone default now()
);

-- Create student_analytics table for aggregated analytics data
create table if not exists public.student_analytics (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.users(id) on delete cascade,
  total_quizzes_taken integer default 0,
  average_score decimal(5,2),
  best_score decimal(5,2),
  worst_score decimal(5,2),
  consistency_rating decimal(3,2),
  improvement_trend text check (improvement_trend in ('improving', 'stable', 'declining')),
  strengths text[],
  weaknesses text[],
  recommended_topics text[],
  study_streak_days integer default 0,
  last_activity_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create quiz_analytics table for quiz-level analytics
create table if not exists public.quiz_analytics (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  total_attempts integer default 0,
  average_score decimal(5,2),
  completion_rate decimal(5,2),
  average_time_seconds integer,
  difficulty_rating decimal(3,2),
  most_missed_questions integer[],
  topic_performance jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists idx_learning_patterns_student_id on public.learning_patterns(student_id);
create index if not exists idx_learning_patterns_type on public.learning_patterns(pattern_type);
create index if not exists idx_predictive_insights_student_id on public.predictive_insights(student_id);
create index if not exists idx_predictive_insights_quiz_id on public.predictive_insights(quiz_id);
create index if not exists idx_student_analytics_student_id on public.student_analytics(student_id);
create index if not exists idx_quiz_analytics_quiz_id on public.quiz_analytics(quiz_id);

-- Enable Row Level Security
alter table public.learning_patterns enable row level security;
alter table public.predictive_insights enable row level security;
alter table public.student_analytics enable row level security;
alter table public.quiz_analytics enable row level security;

-- RLS Policies
create policy "Students can view their own learning patterns" on public.learning_patterns
  for select using (auth.uid() = student_id);

create policy "Admins can view all learning patterns" on public.learning_patterns
  for select using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Students can view their own predictive insights" on public.predictive_insights
  for select using (auth.uid() = student_id);

create policy "Admins can view all predictive insights" on public.predictive_insights
  for select using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Students can view their own analytics" on public.student_analytics
  for select using (auth.uid() = student_id);

create policy "Admins can view all student analytics" on public.student_analytics
  for select using (
    exists (
      select 1 from public.users
      where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Everyone can view quiz analytics" on public.quiz_analytics
  for select using (true);

-- Function to calculate student performance metrics
create or replace function calculate_student_performance_metrics(p_student_id uuid)
returns table (
  total_quizzes integer,
  average_score decimal,
  best_score decimal,
  consistency_rating decimal,
  improvement_trend text
) as $$
declare
  quiz_count integer;
  avg_score decimal;
  max_score decimal;
  score_stddev decimal;
  recent_scores decimal[];
  trend text := 'stable';
begin
  -- Get basic metrics
  select
    count(*)::integer,
    round(avg(score), 2),
    max(score)
  into quiz_count, avg_score, max_score
  from public.quiz_attempts
  where student_id = p_student_id;

  -- Calculate consistency (lower standard deviation = more consistent)
  select stddev(score) into score_stddev
  from public.quiz_attempts
  where student_id = p_student_id;

  -- Calculate improvement trend based on recent performance
  select array_agg(score order by completed_at desc)
  into recent_scores
  from (
    select score, completed_at
    from public.quiz_attempts
    where student_id = p_student_id
    order by completed_at desc
    limit 5
  ) recent;

  if array_length(recent_scores, 1) >= 3 then
    -- Simple trend analysis: compare first half vs second half
    declare
      first_half_avg decimal;
      second_half_avg decimal;
      mid_point integer := array_length(recent_scores, 1) / 2;
    begin
      select avg(score) into first_half_avg
      from unnest(recent_scores[1:mid_point]) as score;

      select avg(score) into second_half_avg
      from unnest(recent_scores[mid_point+1:array_length(recent_scores, 1)]) as score;

      if second_half_avg > first_half_avg + 5 then
        trend := 'improving';
      elsif first_half_avg > second_half_avg + 5 then
        trend := 'declining';
      else
        trend := 'stable';
      end if;
    end;
  end if;

  return query
  select
    quiz_count,
    avg_score,
    max_score,
    case
      when score_stddev is null then 1.0
      when score_stddev = 0 then 1.0
      else round(greatest(0, 1 - (score_stddev / 50)), 2)
    end as consistency_rating,
    trend as improvement_trend;
end;
$$ language plpgsql security definer;

-- Function to analyze topic performance
create or replace function analyze_topic_performance(p_student_id uuid)
returns table (
  topic text,
  average_score decimal,
  attempts_count integer,
  mastery_level text
) as $$
begin
  return query
  with topic_scores as (
    select
      coalesce(q.description, 'General') as topic,
      qa.score,
      qa.completed_at
    from public.quiz_attempts qa
    join public.quizzes q on qa.quiz_id = q.id
    where qa.student_id = p_student_id
  ),
  topic_aggregates as (
    select
      topic,
      round(avg(score), 2) as avg_score,
      count(*) as attempts
    from topic_scores
    group by topic
    having count(*) >= 2
  )
  select
    ta.topic,
    ta.avg_score,
    ta.attempts,
    case
      when ta.avg_score >= 85 then 'mastered'
      when ta.avg_score >= 70 then 'proficient'
      when ta.avg_score >= 50 then 'developing'
      else 'needs_improvement'
    end as mastery_level
  from topic_aggregates ta
  order by ta.avg_score desc;
end;
$$ language plpgsql security definer;

-- Function to predict quiz score based on historical performance
create or replace function predict_quiz_score(
  p_student_id uuid,
  p_quiz_id uuid
)
returns table (
  predicted_score decimal,
  confidence_level decimal,
  factors jsonb
) as $$
declare
  student_avg decimal;
  quiz_avg decimal;
  student_quiz_count integer;
  prediction decimal;
  confidence decimal;
  factors jsonb := '{}'::jsonb;
begin
  -- Get student's overall average
  select round(avg(score), 2) into student_avg
  from public.quiz_attempts
  where student_id = p_student_id;

  -- Get quiz's average score
  select round(avg(score), 2) into quiz_avg
  from public.quiz_attempts
  where quiz_id = p_quiz_id;

  -- Get student's quiz attempt count
  select count(*) into student_quiz_count
  from public.quiz_attempts
  where student_id = p_student_id;

  -- Simple prediction algorithm
  if student_quiz_count = 0 then
    prediction := quiz_avg;
    confidence := 0.3;
    factors := jsonb_build_object(
      'reason', 'no_prior_attempts',
      'quiz_average', quiz_avg
    );
  else
    -- Weighted average of student performance and quiz difficulty
    prediction := round((student_avg * 0.7) + (quiz_avg * 0.3), 2);
    confidence := case
      when student_quiz_count >= 5 then 0.8
      when student_quiz_count >= 3 then 0.6
      else 0.4
    end;

    factors := jsonb_build_object(
      'student_average', student_avg,
      'quiz_average', quiz_avg,
      'attempts_count', student_quiz_count,
      'prediction_method', 'weighted_average'
    );
  end if;

  return query
  select prediction, confidence, factors;
end;
$$ language plpgsql security definer;

-- Function to identify at-risk students
create or replace function identify_at_risk_students()
returns table (
  student_id uuid,
  student_name text,
  risk_level text,
  risk_factors text[],
  last_score decimal,
  average_score decimal,
  days_since_last_attempt integer
) as $$
begin
  return query
  with student_stats as (
    select
      u.id,
      u.name,
      qa.score as last_score,
      round(avg(qa.score) over (partition by u.id), 2) as avg_score,
      extract(day from now() - max(qa.completed_at) over (partition by u.id)) as days_inactive,
      count(*) over (partition by u.id) as total_attempts
    from public.users u
    left join public.quiz_attempts qa on u.id = qa.student_id
    where u.role = 'student'
  ),
  risk_assessment as (
    select
      id,
      name,
      last_score,
      avg_score,
      days_inactive,
      case
        when avg_score < 50 and days_inactive > 7 then 'high'
        when (avg_score < 60 or days_inactive > 14) then 'medium'
        when avg_score < 70 or days_inactive > 30 then 'low'
        else 'none'
      end as risk_level,
      array[
        case when avg_score < 50 then 'low_average_score' else null end,
        case when days_inactive > 14 then 'inactive' else null end,
        case when total_attempts < 3 then 'few_attempts' else null end
      ] as risk_factors
    from student_stats
    where avg_score is not null
  )
  select
    ra.id,
    ra.name,
    ra.risk_level,
    array_remove(ra.risk_factors, null) as risk_factors,
    ra.last_score,
    ra.avg_score,
    ra.days_inactive::integer
  from risk_assessment ra
  where ra.risk_level != 'none'
  order by
    case ra.risk_level
      when 'high' then 1
      when 'medium' then 2
      when 'low' then 3
    end,
    ra.avg_score asc;
end;
$$ language plpgsql security definer;

-- Trigger to update updated_at timestamp
create trigger update_learning_patterns_updated_at
  before update on public.learning_patterns
  for each row execute function update_updated_at_column();

create trigger update_predictive_insights_updated_at
  before update on public.predictive_insights
  for each row execute function update_updated_at_column();

create trigger update_student_analytics_updated_at
  before update on public.student_analytics
  for each row execute function update_updated_at_column();

create trigger update_quiz_analytics_updated_at
  before update on public.quiz_analytics
  for each row execute function update_updated_at_column();