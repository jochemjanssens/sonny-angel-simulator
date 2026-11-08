-- Endless Tetris, paid per cleared line. Run once in the Supabase SQL editor.

-- endless Tetris (paid per line) has its own size
alter table public.puzzle_sessions drop constraint if exists puzzle_sessions_size_check;
alter table public.puzzle_sessions add constraint puzzle_sessions_size_check
  check (size in ('small', 'medium', 'large') or (size = 'endless' and kind = 'tetris'));
alter table public.game_config add column if not exists tetris_line numeric(10, 2) not null default 0.25;

-- the fixed-size payout is not for endless games
create or replace function public.finish_puzzle(p_session uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  pay numeric;
begin
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found or s.kind = 'tables' or s.size = 'endless' then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;

  pay := case s.size when 'small' then cfg.puzzle_small when 'medium' then cfg.puzzle_medium else cfg.puzzle_large end;
  update public.puzzle_sessions set finished_at = now(), reward = pay where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

-- Endless Tetris: play until the blocks reach the top (or stop), paid per
-- cleared line. At most one line per second since the start counts.
create or replace function public.finish_tetris(p_session uuid, p_lines int) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  n int;
  pay numeric;
begin
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found or s.kind <> 'tetris' or s.size <> 'endless' then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;
  n := greatest(coalesce(p_lines, 0), 0);
  if n > extract(epoch from now() - s.started_at) then raise exception 'That many lines aren''t possible in this time'; end if;

  pay := n * (select tetris_line from public.game_config);
  update public.puzzle_sessions set finished_at = now(), reward = pay, score = n where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

revoke execute on function public.finish_tetris(uuid, int) from public, anon;
grant execute on function public.finish_tetris(uuid, int) to authenticated;

notify pgrst, 'reload schema';
