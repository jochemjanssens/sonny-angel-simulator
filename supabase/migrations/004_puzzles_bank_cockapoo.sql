-- Puzzles that pay out, selling to the bank, and the Cockapoo.
-- Run once in the Supabase SQL editor.

alter table public.game_config
  add column if not exists bank_rate numeric(4, 2) not null default 0.70,
  add column if not exists puzzle_small numeric(10, 2) not null default 5,
  add column if not exists puzzle_medium numeric(10, 2) not null default 10,
  add column if not exists puzzle_large numeric(10, 2) not null default 15,
  add column if not exists puzzle_daily_limit int not null default 20;
alter table public.players
  add column if not exists puzzles int not null default 0,
  add column if not exists puzzle_earned numeric(10, 2) not null default 0;

-- Puzzles pay out from the server. A session starts when the puzzle opens;
-- finishing it pays only after a minimum solving time, up to a daily limit.
create table if not exists public.puzzle_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('wordsearch', 'swedish', 'binary')),
  size text not null check (size in ('small', 'medium', 'large')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  reward numeric(10, 2)
);
create index if not exists puzzle_sessions_user_idx on public.puzzle_sessions (user_id, finished_at);
alter table public.puzzle_sessions enable row level security;
drop policy if exists "own puzzles" on public.puzzle_sessions;
create policy "own puzzles" on public.puzzle_sessions for select to authenticated using (user_id = auth.uid());

create or replace function public.start_puzzle(p_kind text, p_size text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  insert into public.puzzle_sessions (user_id, kind, size) values (public._uid(), p_kind, p_size) returning id into sid;
  return sid;
end $$;

create or replace function public.finish_puzzle(p_session uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  pay numeric;
  min_secs int;
  done_today int;
begin
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;

  min_secs := case s.size when 'small' then 20 when 'medium' then 40 else 60 end;
  if now() - s.started_at < make_interval(secs => min_secs) then
    raise exception 'That was suspiciously fast — try solving it for real';
  end if;
  select count(*) into done_today from public.puzzle_sessions
    where user_id = u and finished_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  if done_today >= cfg.puzzle_daily_limit then
    raise exception 'Daily puzzle limit reached — come back tomorrow';
  end if;

  pay := case s.size when 'small' then cfg.puzzle_small when 'medium' then cfg.puzzle_medium else cfg.puzzle_large end;
  update public.puzzle_sessions set finished_at = now(), reward = pay where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

-- The bank always buys, for a fixed share of the market value.
create or replace function public.sell_to_bank(p_fig text) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  pay numeric;
begin
  select round(f.value * c.bank_rate, 2) into pay from public.figures f, public.game_config c where f.id = p_fig;
  if pay is null then raise exception 'Unknown figure'; end if;
  update public.inventory set count = count - 1 where user_id = u and figure_id = p_fig and count >= 1;
  if not found then raise exception 'You don''t have this figure on your shelf'; end if;
  update public.players set wallet = wallet + pay, earned = earned + pay where id = u;
  return pay;
end $$;

revoke execute on function public.start_puzzle(text, text), public.finish_puzzle(uuid), public.sell_to_bank(text) from public, anon;
grant execute on function public.start_puzzle(text, text), public.finish_puzzle(uuid), public.sell_to_bank(text) to authenticated;

-- New figure in the Dog Time series
insert into public.figures (id, series_id, value, secret) values ('dog-12', 'dog', 13, false)
  on conflict (id) do update set value = excluded.value;
