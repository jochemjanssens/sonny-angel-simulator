-- Removes the daily limit on paid puzzles (the minimum solving time stays).
-- Run once in the Supabase SQL editor.

create or replace function public.finish_puzzle(p_session uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  pay numeric;
  min_secs int;
begin
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;

  min_secs := case s.size when 'small' then 20 when 'medium' then 40 else 60 end;
  if now() - s.started_at < make_interval(secs => min_secs) then
    raise exception 'That was suspiciously fast — try solving it for real';
  end if;

  pay := case s.size when 'small' then cfg.puzzle_small when 'medium' then cfg.puzzle_medium else cfg.puzzle_large end;
  update public.puzzle_sessions set finished_at = now(), reward = pay where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

alter table public.game_config drop column if exists puzzle_daily_limit;
