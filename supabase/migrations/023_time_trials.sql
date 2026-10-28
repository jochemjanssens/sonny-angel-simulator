-- Turbo Minis time trials: drive a track yourself, fastest time per track per
-- week wins free wheel spins (3, 2, 1), just like times tables.
-- Run once in the Supabase SQL editor, then run catalog.sql again.

-- the fastest time anyone could possibly drive on a track (set by catalog.sql)
alter table public.tracks add column if not exists min_ms int not null default 5000;

create table if not exists public.time_trials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null references public.tracks (id),
  car text not null references public.figures (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  time_ms int
);
create index if not exists time_trials_track_idx on public.time_trials (track_id, finished_at) where time_ms is not null;
alter table public.time_trials enable row level security;
drop policy if exists "own time trials" on public.time_trials;
create policy "own time trials" on public.time_trials for select to authenticated using (user_id = auth.uid());

-- The top 3 of every finished week and track, and the free wheel spins they got.
create table if not exists public.trial_prizes (
  week date not null,
  track_id text not null references public.tracks (id),
  rank int not null check (rank between 1 and 3),
  user_id uuid not null references auth.users (id) on delete cascade,
  time_ms int not null,
  spins int not null,
  paid_at timestamptz not null default now(),
  primary key (week, track_id, rank)
);
alter table public.trial_prizes enable row level security;

-- Gives the top 3 of every finished week, per track, their free wheel spins
-- (3, 2 and 1). Called whenever someone races or looks at the highscores, so no
-- cron job is needed. Each player's best time counts; on a tie, whoever drove
-- it first ranks higher.
create or replace function public._settle_trial_weeks() returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  for w in
    select wk, track_id, user_id, time_ms, rank
    from (
      select wk, track_id, user_id, time_ms,
        row_number() over (partition by wk, track_id order by time_ms, finished_at) as rank
      from (
        select distinct on (wk, track_id, user_id) wk, track_id, user_id, time_ms, finished_at
        from (
          select date_trunc('week', finished_at at time zone 'UTC')::date as wk, track_id, user_id, time_ms, finished_at
          from public.time_trials
          where time_ms is not null and finished_at < date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
        ) s
        order by wk, track_id, user_id, time_ms, finished_at
      ) best
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

create or replace function public.start_time_trial(p_track text, p_car text) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  sid uuid;
begin
  perform public._require_car(u, p_car);
  if not exists (select 1 from public.tracks where id = p_track) then raise exception 'Unknown track'; end if;
  insert into public.time_trials (user_id, track_id, car) values (u, p_track, p_car) returning id into sid;
  return sid;
end $$;

-- Saves a finished run. The time can't be faster than the track allows, nor
-- faster than the time that really passed since the run was started.
create or replace function public.finish_time_trial(p_session uuid, p_time_ms int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.time_trials;
  floor_ms int;
  elapsed_ms numeric;
  best int;
  rnk int;
  wk timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
begin
  perform public._settle_trial_weeks();
  select * into s from public.time_trials where id = p_session and user_id = u for update;
  if not found then raise exception 'Race not found'; end if;
  if s.finished_at is not null then raise exception 'This race was already saved'; end if;
  select min_ms into floor_ms from public.tracks where id = s.track_id;
  elapsed_ms := extract(epoch from now() - s.started_at) * 1000;
  if p_time_ms is null or p_time_ms < floor_ms or p_time_ms > elapsed_ms + 1000 or p_time_ms > 900000 then
    raise exception 'That time is not possible';
  end if;
  update public.time_trials set finished_at = now(), time_ms = p_time_ms where id = p_session;

  select min(time_ms) into best from public.time_trials
    where user_id = u and track_id = s.track_id and time_ms is not null and finished_at >= wk;
  -- your place this week: players with a better best time, plus one
  select count(*) + 1 into rnk from (
    select user_id, min(time_ms) as t from public.time_trials
    where track_id = s.track_id and time_ms is not null and finished_at >= wk and user_id <> u
    group by user_id
  ) o where o.t < best;
  return jsonb_build_object('time_ms', p_time_ms, 'best', best, 'rank', rnk, 'new_best', best = p_time_ms);
end $$;

-- This week's top 10 for one track (each player's best time), your own best,
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
  with best as (
    select distinct on (user_id) user_id, time_ms, car, finished_at as at
    from public.time_trials
    where track_id = p_track and time_ms is not null and finished_at >= wk
    order by user_id, time_ms, finished_at
  ), ranked as (
    select * from best order by time_ms, at limit 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'username', pr.username, 'time_ms', r.time_ms, 'car', r.car) order by r.time_ms, r.at), '[]')
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

revoke execute on function public._settle_trial_weeks() from public, anon, authenticated;
revoke execute on function public.start_time_trial(text, text), public.finish_time_trial(uuid, int), public.trial_highscores(text) from public, anon;
grant execute on function public.start_time_trial(text, text), public.finish_time_trial(uuid, int), public.trial_highscores(text) to authenticated;

-- let the API see the new tables and functions straight away
notify pgrst, 'reload schema';
