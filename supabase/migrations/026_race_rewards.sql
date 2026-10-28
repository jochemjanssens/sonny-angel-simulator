-- Turbo Minis: every finished time trial earns a medal and a reward
-- (gold €3, silver €2, bronze €1, finished €0.50); the first 10 races of the
-- day (UTC) pay out. Run once in the Supabase SQL editor, then run catalog.sql
-- again (it sets the medal times).

alter table public.time_trials add column if not exists reward numeric(10, 2) not null default 0;
-- medal times per track (set by catalog.sql)
alter table public.tracks add column if not exists gold_ms int not null default 15000;
alter table public.tracks add column if not exists silver_ms int not null default 20000;
alter table public.tracks add column if not exists bronze_ms int not null default 25000;

-- Saves a finished run. The time can't be faster than the track allows, nor
-- faster than the time that really passed since the run was started. Each run
-- earns a medal (by the track's medal times) and a reward;
-- the first 10 runs of the day (UTC) pay out.
create or replace function public.finish_time_trial(p_session uuid, p_time_ms int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.time_trials;
  floor_ms int;
  elapsed_ms numeric;
  best int;
  rnk int;
  wk timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  tr public.tracks;
  medal text;
  pay numeric;
  paid int;
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

  -- medal and reward: the closer to the fastest possible time, the more
  select * into tr from public.tracks where id = s.track_id;
  medal := case
    when p_time_ms <= tr.gold_ms then 'gold'
    when p_time_ms <= tr.silver_ms then 'silver'
    when p_time_ms <= tr.bronze_ms then 'bronze'
    else 'finish' end;
  select count(*) into paid from public.time_trials t
    where t.user_id = u and t.reward > 0 and t.finished_at >= (now() at time zone 'utc')::date;
  pay := case when paid >= 10 then 0 else case medal when 'gold' then 3 when 'silver' then 2 when 'bronze' then 1 else 0.5 end end;
  update public.time_trials set finished_at = now(), time_ms = p_time_ms, reward = pay where id = p_session;
  if pay > 0 then
    update public.players set wallet = wallet + pay where id = u;
  end if;

  select min(time_ms) into best from public.time_trials
    where user_id = u and track_id = s.track_id and time_ms is not null and finished_at >= wk;
  -- your place this week: players with a better best time, plus one
  select count(*) + 1 into rnk from (
    select user_id, min(time_ms) as t from public.time_trials
    where track_id = s.track_id and time_ms is not null and finished_at >= wk and user_id <> u
    group by user_id
  ) o where o.t < best;
  return jsonb_build_object('time_ms', p_time_ms, 'best', best, 'rank', rnk, 'new_best', best = p_time_ms,
    'medal', medal, 'reward', pay, 'paid_left', greatest(0, 10 - paid - (pay > 0)::int));
end $$;

notify pgrst, 'reload schema';
