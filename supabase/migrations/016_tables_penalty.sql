-- Times table champion: every wrong answer costs 2 points.
-- Run once in the Supabase SQL editor, after 015.

drop function if exists public.finish_tables(uuid, int);

-- Times tables score one point per correct sum and lose two per wrong one
-- (never below 0). Pay is per point, more for bigger sizes. The minute must
-- really be over, and no more than 90 correct sums (1.5 per second) count.
create or replace function public.finish_tables(p_session uuid, p_correct int, p_wrong int) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  n int := greatest(least(greatest(coalesce(p_correct, 0), 0), 90) - 2 * greatest(coalesce(p_wrong, 0), 0), 0);
  pay numeric;
begin
  perform public._settle_tables_weeks();
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found or s.kind <> 'tables' then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;
  if now() - s.started_at < interval '58 seconds' then raise exception 'The minute is not over yet'; end if;

  pay := n * case s.size when 'small' then cfg.tables_small when 'medium' then cfg.tables_medium else cfg.tables_large end;
  update public.puzzle_sessions set finished_at = now(), reward = pay, score = n where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

revoke execute on function public.finish_tables(uuid, int, int) from public, anon;
grant execute on function public.finish_tables(uuid, int, int) to authenticated;
