-- Times table champion: instead of €50, the top 3 of every week (per size) win
-- free spins on the lucky wheel: 3, 2 and 1. Run once in the Supabase SQL
-- editor, after 016.

alter table public.players add column if not exists bonus_spins int not null default 0 check (bonus_spins >= 0);
alter table public.game_config drop column if exists tables_prize;

-- weeks already paid in money stay recorded as rank 1 with 0 spins
alter table public.tables_prizes add column if not exists rank int not null default 1 check (rank between 1 and 3);
alter table public.tables_prizes add column if not exists spins int not null default 0;
alter table public.tables_prizes alter column rank drop default;
alter table public.tables_prizes alter column spins drop default;
alter table public.tables_prizes drop column if exists prize;
alter table public.tables_prizes drop constraint if exists tables_prizes_pkey;
alter table public.tables_prizes add primary key (week, size, rank);

-- Gives the top 3 of every finished week, per size, their free wheel spins
-- (3, 2 and 1). Called whenever someone plays or looks at the highscores, so
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
          where kind = 'tables' and score > 0 and finished_at < date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
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
-- and last week's top 3 of that size.
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
  select coalesce(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'username', pr.username, 'score', p.score, 'spins', p.spins) order by p.rank), '[]')
    into last
  from public.tables_prizes p left join public.profiles pr on pr.id = p.user_id
  where p.size = p_size and p.week = (date_trunc('week', now() at time zone 'UTC') - interval '7 days')::date;
  return jsonb_build_object('top', top, 'mine', mine, 'last', last, 'ends_at', wk + interval '7 days');
end $$;

create or replace function public.spin_wheel() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  today date := (now() at time zone 'utc')::date;
  roll int;
  p_key text;
  p_kind text;
  p_amount numeric;
  p_count int;
  figs text[] := '{}';
  news boolean[] := '{}';
  f text;
begin
  -- the free daily spin first, then any bonus spins won with times tables
  update public.players set last_spin = today
    where id = u and (last_spin is null or last_spin < today);
  if not found then
    update public.players set bonus_spins = bonus_spins - 1 where id = u and bonus_spins > 0;
    if not found then raise exception 'You already spun the wheel today — come back tomorrow'; end if;
  end if;

  -- weighted draw: walk the running total until it passes a random roll
  roll := floor(random() * (select sum(weight) from public.wheel_prizes))::int;
  select key, kind, amount, count into p_key, p_kind, p_amount, p_count
    from (select *, sum(weight) over (order by sort) as upto from public.wheel_prizes) w
    where upto > roll order by sort limit 1;

  if p_kind = 'cash' then
    update public.players set wallet = wallet + p_amount where id = u;
  else
    for i in 1 .. coalesce(p_count, 1) loop
      select id into f from public.figures where secret = (p_kind = 'secret') order by random() limit 1;
      figs := figs || f;
      news := news || public._give(u, f);
    end loop;
    if p_kind = 'secret' then update public.players set secrets = secrets + 1 where id = u; end if;
  end if;

  return jsonb_build_object('prize', p_key, 'amount', p_amount, 'figures', to_jsonb(figs), 'new', to_jsonb(news));
end $$;
