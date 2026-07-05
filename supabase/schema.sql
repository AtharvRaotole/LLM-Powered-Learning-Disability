-- Run this in the Supabase SQL Editor after creating your project

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  disability_id text,
  problem text,
  approach text,
  answer text,
  session_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.user_sessions enable row level security;

create policy "Users can view own sessions"
  on public.user_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.user_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.user_sessions for delete
  using (auth.uid() = user_id);

create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);
create index if not exists user_sessions_created_at_idx on public.user_sessions(created_at desc);
