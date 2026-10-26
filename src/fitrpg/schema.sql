-- One row per player. Row-level security: a player reads and writes only their own row.
-- Only game data is stored (avatar id + XP/progress). No health records, no email, no names.
create table if not exists public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar text check (avatar is null or length(avatar) <= 40),
  progress jsonb not null default '{"xp":0,"doneDays":[],"pending":null}' check (pg_column_size(progress) <= 60000),
  updated_at timestamptz not null default now()
);
alter table public.player_state enable row level security;
revoke all on public.player_state from anon, public;
grant select, insert, update on public.player_state to authenticated;
create policy "own row read" on public.player_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "own row insert" on public.player_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own row update" on public.player_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
