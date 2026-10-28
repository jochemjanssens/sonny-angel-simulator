-- Turbo Minis upgrade boxes: a blind box with one tuning part, which you fit
-- on one of your car models to raise its stats (never above 10).
-- Run once in the Supabase SQL editor, then run catalog.sql again.

alter table public.game_config add column if not exists upgrade_box_price numeric(10, 2) not null default 7.95;

-- the parts that can come out of an upgrade box (filled by catalog.sql)
create table if not exists public.upgrade_parts (
  id text primary key,
  speed smallint not null default 0,
  accel smallint not null default 0,
  grip smallint not null default 0,
  weight smallint not null default 0,
  draw int not null check (draw > 0) -- chance out of the total
);
alter table public.upgrade_parts enable row level security;
drop policy if exists "catalog readable" on public.upgrade_parts;
create policy "catalog readable" on public.upgrade_parts for select using (true);

-- parts you own but haven't fitted yet
create table if not exists public.part_inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  part_id text not null references public.upgrade_parts (id),
  count int not null default 0 check (count >= 0),
  primary key (user_id, part_id)
);
alter table public.part_inventory enable row level security;
drop policy if exists "own parts" on public.part_inventory;
create policy "own parts" on public.part_inventory for select to authenticated using (user_id = auth.uid());

-- what you've fitted on each of your car models (bonus per stat)
create table if not exists public.car_upgrades (
  user_id uuid not null references auth.users (id) on delete cascade,
  figure_id text not null references public.figures (id),
  speed smallint not null default 0,
  accel smallint not null default 0,
  grip smallint not null default 0,
  weight smallint not null default 0,
  primary key (user_id, figure_id)
);
alter table public.car_upgrades enable row level security;
drop policy if exists "own upgrades" on public.car_upgrades;
create policy "own upgrades" on public.car_upgrades for select to authenticated using (user_id = auth.uid());

-- Buys an upgrade box and draws one part (weighted, on the server).
create or replace function public.open_upgrade_box() returns text
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  price numeric;
  roll int;
  part text;
begin
  select upgrade_box_price into price from public.game_config;
  update public.players set wallet = wallet - price, spent = spent + price where id = u and wallet >= price;
  if not found then raise exception 'Not enough budget for this box.'; end if;
  roll := floor(random() * (select sum(draw) from public.upgrade_parts))::int;
  select id into part from (select id, sum(draw) over (order by id) as upto from public.upgrade_parts) p
    where upto > roll order by upto limit 1;
  insert into public.part_inventory (user_id, part_id, count) values (u, part, 1)
    on conflict (user_id, part_id) do update set count = public.part_inventory.count + 1;
  return part;
end $$;

-- Fits a part on one of your car models. Stats never go above 10; a part that
-- wouldn't add anything is refused (and stays in your garage).
create or replace function public.apply_upgrade(p_part text, p_car text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  f public.figures;
  pt public.upgrade_parts;
  cur public.car_upgrades;
  s int; a int; g int; w int;
begin
  perform public._require_car(u, p_car);
  select * into f from public.figures where id = p_car;
  select * into pt from public.upgrade_parts where id = p_part;
  if not found then raise exception 'Unknown part'; end if;
  select * into cur from public.car_upgrades where user_id = u and figure_id = p_car for update;
  -- new bonus per stat, capped so the total stays at most 10
  s := least(coalesce(cur.speed, 0) + pt.speed, 10 - f.speed);
  a := least(coalesce(cur.accel, 0) + pt.accel, 10 - f.accel);
  g := least(coalesce(cur.grip, 0) + pt.grip, 10 - f.grip);
  w := least(coalesce(cur.weight, 0) + pt.weight, 10 - f.weight);
  if s = coalesce(cur.speed, 0) and a = coalesce(cur.accel, 0) and g = coalesce(cur.grip, 0) and w = coalesce(cur.weight, 0) then
    raise exception 'This car is already maxed out for that part';
  end if;
  update public.part_inventory set count = count - 1 where user_id = u and part_id = p_part and count >= 1;
  if not found then raise exception 'You don''t have this part'; end if;
  insert into public.car_upgrades (user_id, figure_id, speed, accel, grip, weight) values (u, p_car, s, a, g, w)
    on conflict (user_id, figure_id) do update set speed = s, accel = a, grip = g, weight = w;
  return jsonb_build_object('speed', s, 'accel', a, 'grip', g, 'weight', w);
end $$;

revoke execute on function public.open_upgrade_box(), public.apply_upgrade(text, text) from public, anon;
grant execute on function public.open_upgrade_box(), public.apply_upgrade(text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.part_inventory, public.car_upgrades;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

notify pgrst, 'reload schema';
