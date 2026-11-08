-- Weekly highscores for endless Tetris (most lines), with free spins for the
-- top 3 like the times tables. Run once in the Supabase SQL editor.

alter table public.tables_prizes drop constraint if exists tables_prizes_size_check;
alter table public.tables_prizes add constraint tables_prizes_size_check check (size in ('small', 'medium', 'large', 'endless'));
create index if not exists puzzle_sessions_endless_idx on public.puzzle_sessions (finished_at) where kind = 'tetris' and size = 'endless';

-- Gives the top 3 of every finished week, per size, their free wheel spins
-- (3, 2 and 1): times tables (points) and endless Tetris (lines). Called whenever someone plays or looks at the highscores, so
-- no cron job is needed. Each player's best score counts; on a tie, whoever
-- got the score first ranks higher.
create or replace function public._settle_tables_weeks() returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  for w in
    select wk, size, user_id, score, rank
    from (
      select wk, size, user_id, score,
        row_number() over (partition by wk, size order by score desc, finished_at) as rank
      from (
        select distinct on (wk, size, user_id) wk, size, user_id, score, finished_at
        from (
          select date_trunc('week', finished_at at time zone 'UTC')::date as wk, size, user_id, score, finished_at
          from public.puzzle_sessions
          where (kind = 'tables' or (kind = 'tetris' and size = 'endless')) and score > 0 and finished_at < date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
        ) s
        order by wk, size, user_id, score desc, finished_at
      ) best
    ) ranked
    where rank <= 3
      and not exists (select 1 from public.tables_prizes p where p.week = ranked.wk and p.size = ranked.size)
  loop
    insert into public.tables_prizes (week, size, rank, user_id, score, spins)
      values (w.wk, w.size, w.rank, w.user_id, w.score, 4 - w.rank)
      on conflict do nothing;
    if found then
      update public.players set bonus_spins = bonus_spins + 4 - w.rank where id = w.user_id;
    end if;
  end loop;
end $$;

-- This week's top 10 for one size (each player's best score), your own best,
-- and last week's top 3 of that size. Size 'endless' is endless Tetris (lines).
create or replace function public.tables_highscores(p_size text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  wk timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  top jsonb;
  mine int;
  last jsonb;
begin
  perform public._settle_tables_weeks();
  with best as (
    select distinct on (user_id) user_id, score, finished_at as at
    from public.puzzle_sessions
    where kind = (case p_size when 'endless' then 'tetris' else 'tables' end) and size = p_size and score > 0 and finished_at >= wk
    order by user_id, score desc, finished_at
  ), ranked as (
    select * from best order by score desc, at limit 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'username', pr.username, 'score', r.score) order by r.score desc, r.at), '[]')
    into top
  from ranked r left join public.profiles pr on pr.id = r.user_id;
  select max(score) into mine from public.puzzle_sessions
    where kind = (case p_size when 'endless' then 'tetris' else 'tables' end) and size = p_size and user_id = u and finished_at >= wk;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'username', pr.username, 'score', p.score, 'spins', p.spins) order by p.rank), '[]')
    into last
  from public.tables_prizes p left join public.profiles pr on pr.id = p.user_id
  where p.size = p_size and p.week = (date_trunc('week', now() at time zone 'UTC') - interval '7 days')::date;
  return jsonb_build_object('top', top, 'mine', mine, 'last', last, 'ends_at', wk + interval '7 days');
end $$;

-- Endless Tetris: play until the blocks reach the top (or stop), paid per
-- cleared line. At most one line per second since the start counts. The best
-- of the week win free spins, like the times tables.
create or replace function public.finish_tetris(p_session uuid, p_lines int) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  n int;
  pay numeric;
begin
  perform public._settle_tables_weeks();
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

notify pgrst, 'reload schema';
