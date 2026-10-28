-- Turbo Minis: blind-box race cars with stats, four tracks, races against the
-- computer and challenges between players (for money or for each other's car).
-- Run once in the Supabase SQL editor, then run catalog.sql again.

-- ---------------------------------------------------------------- catalog

alter table public.series drop constraint if exists series_brand_check;
alter table public.series add constraint series_brand_check check (brand in ('sonny', 'smiski', 'cars'));

-- car stats (1–10); empty for figures that aren't cars
alter table public.figures add column if not exists speed smallint;
alter table public.figures add column if not exists accel smallint;
alter table public.figures add column if not exists grip smallint;
alter table public.figures add column if not exists weight smallint;

-- every player can race on every track; the weights say which stats count
create table if not exists public.tracks (
  id text primary key,
  w_speed numeric not null,
  w_accel numeric not null,
  w_grip numeric not null,
  w_weight numeric not null,
  risk_stat text check (risk_stat in ('speed', 'accel', 'grip', 'weight')),
  risk_below int,
  risk_chance numeric
);
alter table public.tracks enable row level security;
drop policy if exists "catalog readable" on public.tracks;
create policy "catalog readable" on public.tracks for select using (true);

-- ---------------------------------------------------------------- races

-- A challenge: the challenger's car waits at the track (taken off the shelf)
-- until someone accepts it or it's cancelled. Stake: money (both pay, winner
-- takes all) or the cars themselves (winner gets both).
create table if not exists public.race_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  challenger_car text not null references public.figures (id),
  track_id text not null references public.tracks (id),
  stake_kind text not null check (stake_kind in ('money', 'car')),
  stake_amount numeric(10, 2) not null default 0,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  opponent_id uuid references public.profiles (id) on delete set null,
  opponent_car text references public.figures (id),
  result jsonb,
  winner_id uuid,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists race_challenges_status_idx on public.race_challenges (status, created_at);
alter table public.race_challenges enable row level security;
drop policy if exists "challenges readable" on public.race_challenges;
create policy "challenges readable" on public.race_challenges for select to authenticated using (true);

-- Races against the computer (a few wins a day pay a little).
create table if not exists public.cpu_races (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  car text not null references public.figures (id),
  cpu_car text not null references public.figures (id),
  track_id text not null references public.tracks (id),
  won boolean not null,
  prize numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cpu_races_user_idx on public.cpu_races (user_id, created_at);
alter table public.cpu_races enable row level security;
drop policy if exists "own cpu races" on public.cpu_races;
create policy "own cpu races" on public.cpu_races for select to authenticated using (user_id = auth.uid());

-- One car's run on a track: a finish time in seconds (lower is better) and
-- whether it spun out. Better stats for the track mean a faster time, with a
-- little luck on top, so the underdog can still win.
create or replace function public._car_run(p_car text, p_track text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare f public.figures;
  tr public.tracks;
  perf numeric;
  t numeric;
  stat int;
  crashed boolean := false;
begin
  select * into f from public.figures where id = p_car;
  if f.speed is null then raise exception 'That is not a race car'; end if;
  select * into tr from public.tracks where id = p_track;
  if not found then raise exception 'Unknown track'; end if;
  perf := tr.w_speed * f.speed + tr.w_accel * f.accel + tr.w_grip * f.grip + tr.w_weight * f.weight;
  t := 6 * (1 + (10 - perf) * 0.06) * (1 + (random() * 2 - 1) * 0.05);
  if tr.risk_stat is not null then
    stat := case tr.risk_stat when 'speed' then f.speed when 'accel' then f.accel when 'grip' then f.grip else f.weight end;
    if stat < tr.risk_below and random() < tr.risk_chance then
      crashed := true;
      t := t + 1.5;
    end if;
  end if;
  return jsonb_build_object('car', p_car, 'time', round(t, 2), 'crashed', crashed);
end $$;

create or replace function public._require_car(p_user uuid, p_car text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.figures where id = p_car and speed is not null) then
    raise exception 'That is not a race car';
  end if;
  if not exists (select 1 from public.inventory where user_id = p_user and figure_id = p_car and count >= 1) then
    raise exception 'You don''t have this car on your shelf';
  end if;
end $$;

create or replace function public.race_cpu(p_car text, p_track text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  cpu text;
  me jsonb;
  them jsonb;
  is_win boolean;
  paid int;
  pay numeric := 0;
begin
  perform public._require_car(u, p_car);
  -- any regular car as the opponent
  select id into cpu from public.figures where speed is not null and not secret and id <> p_car order by random() limit 1;
  me := public._car_run(p_car, p_track);
  them := public._car_run(cpu, p_track);
  is_win := (me ->> 'time')::numeric < (them ->> 'time')::numeric;
  select count(*) into paid from public.cpu_races r
    where r.user_id = u and r.prize > 0 and r.created_at >= (now() at time zone 'utc')::date;
  if is_win and paid < 5 then
    pay := 2;
    update public.players set wallet = wallet + pay, earned = earned + pay where id = u;
  end if;
  insert into public.cpu_races (user_id, car, cpu_car, track_id, won, prize) values (u, p_car, cpu, p_track, is_win, pay);
  return jsonb_build_object('me', me, 'cpu', them, 'won', is_win, 'prize', pay, 'paid_left', greatest(0, 5 - paid - (pay > 0)::int));
end $$;

create or replace function public.create_race_challenge(p_car text, p_track text, p_kind text, p_amount numeric default 0) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  amt numeric := 0;
  cid uuid;
begin
  perform public._require_username(u);
  perform public._require_car(u, p_car);
  if not exists (select 1 from public.tracks where id = p_track) then raise exception 'Unknown track'; end if;
  if p_kind not in ('money', 'car') then raise exception 'Choose money or the car as the stake'; end if;
  if (select count(*) from public.race_challenges where challenger_id = u and status = 'open') >= 5 then
    raise exception 'You can have at most 5 open challenges';
  end if;
  if p_kind = 'money' then
    amt := round(coalesce(p_amount, 0), 2);
    if amt <= 0 then raise exception 'Choose an amount to race for'; end if;
    update public.players set wallet = wallet - amt where id = u and wallet >= amt;
    if not found then raise exception 'Not enough budget for this stake'; end if;
  end if;
  -- the car waits at the track until the race
  update public.inventory set count = count - 1 where user_id = u and figure_id = p_car and count >= 1;
  insert into public.race_challenges (challenger_id, challenger_car, track_id, stake_kind, stake_amount)
    values (u, p_car, p_track, p_kind, amt) returning id into cid;
  return cid;
end $$;

create or replace function public.cancel_race_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  ch public.race_challenges;
begin
  select * into ch from public.race_challenges where id = p_challenge and challenger_id = u and status = 'open' for update;
  if not found then raise exception 'This challenge is no longer open'; end if;
  update public.race_challenges set status = 'cancelled', finished_at = now() where id = p_challenge;
  perform public._give(u, ch.challenger_car);
  if ch.stake_kind = 'money' then
    update public.players set wallet = wallet + ch.stake_amount where id = u;
  end if;
end $$;

create or replace function public.accept_race_challenge(p_challenge uuid, p_car text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  ch public.race_challenges;
  a jsonb;
  b jsonb;
  winner uuid;
  res jsonb;
begin
  perform public._require_username(u);
  select * into ch from public.race_challenges where id = p_challenge for update;
  if not found or ch.status <> 'open' then raise exception 'This challenge is no longer open'; end if;
  if ch.challenger_id = u then raise exception 'You cannot race against yourself'; end if;
  perform public._require_car(u, p_car);
  if ch.stake_kind = 'money' then
    update public.players set wallet = wallet - ch.stake_amount where id = u and wallet >= ch.stake_amount;
    if not found then raise exception 'Not enough budget for this stake'; end if;
  else
    -- pink slips: your car is on the line too
    update public.inventory set count = count - 1 where user_id = u and figure_id = p_car and count >= 1;
  end if;

  a := public._car_run(ch.challenger_car, ch.track_id);
  b := public._car_run(p_car, ch.track_id);
  winner := case when (b ->> 'time')::numeric < (a ->> 'time')::numeric then u else ch.challenger_id end;
  res := jsonb_build_object('challenger', a, 'opponent', b);

  if ch.stake_kind = 'money' then
    update public.players set wallet = wallet + ch.stake_amount * 2 where id = winner;
    perform public._give(ch.challenger_id, ch.challenger_car);
  else
    perform public._give(winner, ch.challenger_car);
    perform public._give(winner, p_car);
  end if;

  update public.race_challenges
    set status = 'done', opponent_id = u, opponent_car = p_car, result = res, winner_id = winner, finished_at = now()
    where id = p_challenge;
  return res || jsonb_build_object('winner', winner);
end $$;

revoke execute on function public._car_run(text, text), public._require_car(uuid, text) from public, anon, authenticated;
revoke execute on function public.race_cpu(text, text), public.create_race_challenge(text, text, text, numeric),
  public.cancel_race_challenge(uuid), public.accept_race_challenge(uuid, text) from public, anon;
grant execute on function public.race_cpu(text, text), public.create_race_challenge(text, text, text, numeric),
  public.cancel_race_challenge(uuid), public.accept_race_challenge(uuid, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.race_challenges;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- let the API see the new tables and functions straight away
notify pgrst, 'reload schema';
