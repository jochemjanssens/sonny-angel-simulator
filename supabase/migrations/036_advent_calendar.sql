-- Advent calendar: one door a day in December with a figure from the advent
-- series. Run once in the Supabase SQL editor, then run catalog.sql again.

-- series that are not sold in the shop (the advent calendar series)
alter table public.series add column if not exists shop boolean not null default true;

-- The server draws the figure, so boxes can't be rigged from the browser.
create or replace function public.open_box(p_series text, out fig_id text, out is_new boolean)
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.series;
begin
  select * into s from public.series where id = p_series;
  if not found then raise exception 'Unknown series'; end if;
  if not s.shop then raise exception 'This series is not sold in the shop'; end if;

  update public.players set wallet = wallet - s.price, opened = opened + 1, spent = spent + s.price
    where id = u and wallet >= s.price;
  if not found then raise exception 'Not enough budget for this box'; end if;

  if random() < 1.0 / s.secret_odds then
    select id into fig_id from public.figures where series_id = s.id and secret;
    update public.players set secrets = secrets + 1 where id = u;
  else
    select id into fig_id from public.figures where series_id = s.id and not secret order by random() limit 1;
  end if;
  is_new := public._give(u, fig_id);
end $$;

drop function if exists public.spin_wheel();
create or replace function public.spin_wheel(p_brand text default 'sonny') returns jsonb
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
      -- a figure from the simulator the player is spinning in
      select f2.id into f from public.figures f2 join public.series s2 on s2.id = f2.series_id
        where f2.secret = (p_kind = 'secret') and s2.brand = p_brand and s2.shop order by random() limit 1;
      figs := figs || f;
      news := news || public._give(u, f);
    end loop;
    if p_kind = 'secret' then update public.players set secrets = secrets + 1 where id = u; end if;
  end if;

  return jsonb_build_object('prize', p_key, 'amount', p_amount, 'figures', to_jsonb(figs), 'new', to_jsonb(news));
end $$;

-- ---------------------------------------------------------------- advent calendar

-- From 1 December one door a day (UTC); missed doors can still be opened until
-- 31 December. Each door holds a blind box of the advent series: a figure you
-- don't have yet, so opening every door completes the set. Door 24 holds the
-- secret.
create table if not exists public.advent_doors (
  user_id uuid not null references auth.users (id) on delete cascade,
  year int not null,
  day int not null check (day between 1 and 24),
  figure_id text not null references public.figures (id),
  opened_at timestamptz not null default now(),
  primary key (user_id, year, day)
);
alter table public.advent_doors enable row level security;
drop policy if exists "own doors" on public.advent_doors;
create policy "own doors" on public.advent_doors for select to authenticated using (user_id = auth.uid());

-- today's date for the calendar (a function, so tests can pretend it's December)
create or replace function public._advent_today() returns date
language sql stable as $$ select (now() at time zone 'utc')::date $$;

create or replace function public.open_advent_door(p_day int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  today date := public._advent_today();
  yr int := extract(year from today)::int;
  fig text;
  fresh boolean;
begin
  if p_day is null or p_day < 1 or p_day > 24 then raise exception 'Unknown door'; end if;
  if extract(month from today) <> 12 or extract(day from today) < p_day then
    raise exception 'This door can''t be opened yet';
  end if;
  if exists (select 1 from public.advent_doors where user_id = u and year = yr and day = p_day) then
    raise exception 'You already opened this door';
  end if;

  if p_day = 24 then
    select id into fig from public.figures where series_id = 'advent' and secret;
    update public.players set secrets = secrets + 1 where id = u;
  else
    -- a figure you don't have yet (on your shelf or behind an earlier door)
    select f.id into fig from public.figures f
      where f.series_id = 'advent' and not f.secret
        and not exists (select 1 from public.inventory i where i.user_id = u and i.figure_id = f.id and i.count > 0)
        and not exists (select 1 from public.advent_doors d where d.user_id = u and d.year = yr and d.figure_id = f.id)
      order by random() limit 1;
    if fig is null then
      select id into fig from public.figures where series_id = 'advent' and not secret order by random() limit 1;
    end if;
  end if;
  if fig is null then raise exception 'The advent calendar isn''t ready yet'; end if;

  insert into public.advent_doors (user_id, year, day, figure_id) values (u, yr, p_day, fig);
  fresh := public._give(u, fig);
  return jsonb_build_object('fig_id', fig, 'is_new', fresh);
end $$;

revoke execute on function public.open_advent_door(int) from public, anon;
grant execute on function public.open_advent_door(int) to authenticated;
revoke execute on function public._advent_today() from public, anon, authenticated;

notify pgrst, 'reload schema';
