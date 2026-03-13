-- User data table: one row per authenticated user
-- Stores all app state as JSONB columns (mirrors the localStorage blob structure)

create table public.user_data (
  id                 uuid primary key references auth.users(id) on delete cascade,
  shifts             jsonb not null default '[]',
  positions          jsonb not null default '[]',
  people             jsonb not null default '[]',
  schedules          jsonb not null default '[]',
  active_schedule_id text,
  min_break_hours    integer not null default 12,
  updated_at         timestamptz not null default now()
);

-- Row-level security: each user can only access their own row
alter table public.user_data enable row level security;

create policy "own"
  on public.user_data
  using (auth.uid() = id)
  with check (auth.uid() = id);
