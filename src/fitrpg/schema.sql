-- One row per player. Row-level security: a player reads and writes only their own row.
create table if not exists public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar text,
  progress jsonb not null default '{"xp":0,"doneDays":[],"pending":null}',
  updated_at timestamptz not null default now()
);
alter table public.player_state enable row level security;
create policy "own row read" on public.player_state for select using ((select auth.uid()) = user_id);
create policy "own row insert" on public.player_state for insert with check ((select auth.uid()) = user_id);
create policy "own row update" on public.player_state for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
