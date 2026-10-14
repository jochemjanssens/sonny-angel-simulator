-- Times table champion: a separate highscore list (and weekly €50 winner) per
-- size, and pay per correct sum depends on the size: 15, 30 or 45 cents.
-- Run once in the Supabase SQL editor, after 014.

alter table public.game_config add column if not exists tables_small numeric(10, 2) not null default 0.15;
alter table public.game_config add column if not exists tables_medium numeric(10, 2) not null default 0.30;
alter table public.game_config add column if not exists tables_large numeric(10, 2) not null default 0.45;
alter table public.game_config drop column if exists tables_reward;

alter table public.tables_prizes add column if not exists size text not null default 'medium'
  check (size in ('small', 'medium', 'large'));
alter table public.tables_prizes alter column size drop default;
alter table public.tables_prizes drop constraint if exists tables_prizes_pkey;
alter table public.tables_prizes add primary key (week, size);

-- Pays the winner of every finished week, per size, that hasn't been paid yet.
-- Called whenever someone plays or looks at the highscores, so no cron job is
-- needed. On a tie, whoever got the score first wins.
create or replace function public._settle_tables_weeks() returns void
language plpgsql security definer set search_path = public as $$
declare cfg public.game_config;
  w record;
begin
  select * into cfg from public.game_config;
  for w in
    select distinct on (wk, size) wk, size, s.user_id, s.score
    from (
      select date_trunc('week', finished_at at time zone 'UTC')::date as wk, size, user_id, score, finished_at
      from public.puzzle_sessions
      where kind = 'tables' and score > 0 and finished_at < date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
    ) s
    where not exists (select 1 from public.tables_prizes p where p.week = s.wk and p.size = s.size)
    order by wk, size, s.score desc, s.finished_at
  loop
    insert into public.tables_prizes (week, size, user_id, score, prize) values (w.wk, w.size, w.user_id, w.score, cfg.tables_prize)
      on conflict do nothing;
    if found then
      update public.players set wallet = wallet + cfg.tables_prize, puzzle_earned = puzzle_earned + cfg.tables_prize where id = w.user_id;
    end if;
  end loop;
end $$;

-- Times tables pay per correct sum, more for bigger sizes. The minute must
-- really be over, and no more than 90 sums (1.5 per second) count.
create or replace function public.finish_tables(p_session uuid, p_correct int) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  n int := least(greatest(coalesce(p_correct, 0), 0), 90);
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

-- This week's top 10 for one size (each player's best score), your own best,
-- and last week's winner of that size.
drop function if exists public.tables_highscores();
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
    where kind = 'tables' and size = p_size and score > 0 and finished_at >= wk
    order by user_id, score desc, finished_at
  ), ranked as (
    select * from best order by score desc, at limit 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'username', pr.username, 'score', r.score) order by r.score desc, r.at), '[]')
    into top
  from ranked r left join public.profiles pr on pr.id = r.user_id;
  select max(score) into mine from public.puzzle_sessions
    where kind = 'tables' and size = p_size and user_id = u and finished_at >= wk;
  select jsonb_build_object('user_id', p.user_id, 'username', pr.username, 'score', p.score, 'prize', p.prize)
    into last
  from public.tables_prizes p left join public.profiles pr on pr.id = p.user_id
  where p.size = p_size and p.week = (date_trunc('week', now() at time zone 'UTC') - interval '7 days')::date;
  return jsonb_build_object('top', top, 'mine', mine, 'last', last, 'ends_at', wk + interval '7 days',
    'prize', (select tables_prize from public.game_config));
end $$;

revoke execute on function public.tables_highscores(text) from public, anon;
grant execute on function public.tables_highscores(text) to authenticated;
