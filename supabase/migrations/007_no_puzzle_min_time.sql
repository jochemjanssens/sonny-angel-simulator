-- Removes the minimum solving time on puzzles: a puzzle pays out as soon
-- as it is finished (still only once). Run once in the Supabase SQL editor.

create or replace function public.finish_puzzle(p_session uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  pay numeric;
begin
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;

  pay := case s.size when 'small' then cfg.puzzle_small when 'medium' then cfg.puzzle_medium else cfg.puzzle_large end;
  update public.puzzle_sessions set finished_at = now(), reward = pay where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;
