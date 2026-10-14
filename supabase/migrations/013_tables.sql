-- Adds "Times table champion": one minute of times tables, paid per correct
-- answer. Run once in the Supabase SQL editor.

alter table public.game_config add column if not exists tables_reward numeric(10, 2) not null default 0.20;

alter table public.puzzle_sessions drop constraint if exists puzzle_sessions_kind_check;
alter table public.puzzle_sessions add constraint puzzle_sessions_kind_check
  check (kind in ('wordsearch', 'swedish', 'binary', 'memory', 'differences', 'tetris', 'coloring', 'tables'));

-- Pays tables_reward per correct sum. The minute must really be over, and no
-- more than 90 sums (1.5 per second) count, so the count can't be inflated.
create or replace function public.finish_tables(p_session uuid, p_correct int) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  pay numeric;
begin
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found or s.kind <> 'tables' then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;
  if now() - s.started_at < interval '58 seconds' then raise exception 'The minute is not over yet'; end if;

  pay := least(greatest(coalesce(p_correct, 0), 0), 90) * cfg.tables_reward;
  update public.puzzle_sessions set finished_at = now(), reward = pay where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

-- the fixed-price payout must not work for times tables
create or replace function public.finish_puzzle(p_session uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  pay numeric;
begin
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found or s.kind = 'tables' then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;

  pay := case s.size when 'small' then cfg.puzzle_small when 'medium' then cfg.puzzle_medium else cfg.puzzle_large end;
  update public.puzzle_sessions set finished_at = now(), reward = pay where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

revoke execute on function public.finish_tables(uuid, int) from public, anon;
grant execute on function public.finish_tables(uuid, int) to authenticated;
