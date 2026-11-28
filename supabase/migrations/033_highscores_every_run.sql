-- Highscores: every score counts, but everyone's best comes first, then
-- everyone's second best, and so on. Run once in the Supabase SQL editor.

-- Gives the top 3 of every finished week, per size, their free wheel spins
-- (3, 2 and 1): times tables (points) and endless Tetris (lines). Called
-- whenever someone plays or looks at the highscores, so no cron job is needed.
-- Every score counts, but everyone's best comes first, then everyone's second
-- best, and so on: with only two players, one of them can be 1st and 3rd. On a
-- tie, whoever got the score first ranks higher.
create or replace function public._settle_tables_weeks() returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  for w in
    select wk, size, user_id, score, rank
    from (
      select wk, size, user_id, score,
        row_number() over (partition by wk, size order by n, score desc, finished_at) as rank
      from (
        -- n: 1 for a player's best score of the week, 2 for the next one, ...
        select wk, size, user_id, score, finished_at,
          row_number() over (partition by wk, size, user_id order by score desc, finished_at) as n
        from (
          select date_trunc('week', finished_at at time zone 'UTC')::date as wk, size, user_id, score, finished_at
          from public.puzzle_sessions
          where (kind = 'tables' or (kind = 'tetris' and size = 'endless')) and score > 0 and finished_at < date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
        ) s
      ) runs
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

-- This week's top 10 for one size, your own best, and last week's top 3 of
-- that size. Size 'endless' is endless Tetris (lines). Ranked like the prizes:
-- everyone's best first, then everyone's second best, and so on.
create or replace function public.tables_highscores(p_size text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  wk timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  top jsonb;
  mine int;
  last jsonb;
begin
  perform public._settle_tables_weeks();
  with runs as (
    select user_id, score, finished_at as at,
      row_number() over (partition by user_id order by score desc, finished_at) as n
    from public.puzzle_sessions
    where kind = (case p_size when 'endless' then 'tetris' else 'tables' end) and size = p_size and score > 0 and finished_at >= wk
  ), ranked as (
    select * from runs order by n, score desc, at limit 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'username', pr.username, 'score', r.score) order by r.n, r.score desc, r.at), '[]')
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

-- Gives the top 3 of every finished week, per track, their free wheel spins
-- (3, 2 and 1). Called whenever someone races or looks at the highscores, so no
-- cron job is needed. Every time counts, but everyone's best comes first, then
-- everyone's second best, and so on: with only two players, one of them can be
-- 1st and 3rd. On a tie, whoever drove it first ranks higher.
create or replace function public._settle_trial_weeks() returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  for w in
    select wk, track_id, user_id, time_ms, rank
    from (
      select wk, track_id, user_id, time_ms,
        row_number() over (partition by wk, track_id order by n, time_ms, finished_at) as rank
      from (
        -- n: 1 for a player's best time of the week, 2 for the next one, ...
        select wk, track_id, user_id, time_ms, finished_at,
          row_number() over (partition by wk, track_id, user_id order by time_ms, finished_at) as n
        from (
          select date_trunc('week', finished_at at time zone 'UTC')::date as wk, track_id, user_id, time_ms, finished_at
          from public.time_trials
          where time_ms is not null and finished_at < date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
        ) s
      ) runs
    ) ranked
    where rank <= 3
      and not exists (select 1 from public.trial_prizes p where p.week = ranked.wk and p.track_id = ranked.track_id)
  loop
    insert into public.trial_prizes (week, track_id, rank, user_id, time_ms, spins)
      values (w.wk, w.track_id, w.rank, w.user_id, w.time_ms, 4 - w.rank)
      on conflict do nothing;
    if found then
      update public.players set bonus_spins = bonus_spins + 4 - w.rank where id = w.user_id;
    end if;
  end loop;
end $$;

-- This week's top 10 for one track (everyone's best first, then second bests), your own best,
-- and last week's top 3 of that track.
create or replace function public.trial_highscores(p_track text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  wk timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  top jsonb;
  mine int;
  last jsonb;
begin
  perform public._settle_trial_weeks();
  -- everyone's best time first, then everyone's second best, and so on
  with runs as (
    select user_id, time_ms, car, laps, finished_at as at,
      row_number() over (partition by user_id order by time_ms, finished_at) as n
    from public.time_trials
    where track_id = p_track and time_ms is not null and finished_at >= wk
  ), ranked as (
    select * from runs order by n, time_ms, at limit 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'username', pr.username, 'time_ms', r.time_ms, 'car', r.car, 'laps', r.laps) order by r.n, r.time_ms, r.at), '[]')
    into top
  from ranked r left join public.profiles pr on pr.id = r.user_id;
  select min(time_ms) into mine from public.time_trials
    where track_id = p_track and user_id = u and time_ms is not null and finished_at >= wk;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'username', pr.username, 'time_ms', p.time_ms, 'spins', p.spins) order by p.rank), '[]')
    into last
  from public.trial_prizes p left join public.profiles pr on pr.id = p.user_id
  where p.track_id = p_track and p.week = (date_trunc('week', now() at time zone 'UTC') - interval '7 days')::date;
  return jsonb_build_object('top', top, 'mine', mine, 'last', last, 'ends_at', wk + interval '7 days');
end $$;

notify pgrst, 'reload schema';
