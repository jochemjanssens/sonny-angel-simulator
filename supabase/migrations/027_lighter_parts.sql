-- The weight parts now make a car lighter (lighter = quicker): Lightweight
-- Body -1, Carbon Chassis -2, and the Tuning Kit -1 weight. Upgrades already
-- fitted as extra weight are turned into the same amount less weight (never
-- below 1). Run once in the Supabase SQL editor, then run catalog.sql again.

update public.car_upgrades cu
  set weight = greatest(-cu.weight, 1 - f.weight)
  from public.figures f
  where f.id = cu.figure_id and cu.weight > 0;

-- Fits a part on one of your car models. Speed, acceleration and grip go up to
-- at most 10; the light parts lower the weight, to at least 1. A part that
-- wouldn't change anything is refused (and stays in your garage).
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
  -- new bonus per stat: up to 10 for a positive part, down to 1 for a negative one
  s := least(coalesce(cur.speed, 0) + pt.speed, 10 - f.speed);
  a := least(coalesce(cur.accel, 0) + pt.accel, 10 - f.accel);
  g := least(coalesce(cur.grip, 0) + pt.grip, 10 - f.grip);
  w := case when pt.weight < 0 then greatest(coalesce(cur.weight, 0) + pt.weight, 1 - f.weight)
            else least(coalesce(cur.weight, 0) + pt.weight, 10 - f.weight) end;
  if s = coalesce(cur.speed, 0) and a = coalesce(cur.accel, 0) and g = coalesce(cur.grip, 0) and w = coalesce(cur.weight, 0) then
    raise exception 'This car is already maxed out for that part';
  end if;
  update public.part_inventory set count = count - 1 where user_id = u and part_id = p_part and count >= 1;
  if not found then raise exception 'You don''t have this part'; end if;
  insert into public.car_upgrades (user_id, figure_id, speed, accel, grip, weight) values (u, p_car, s, a, g, w)
    on conflict (user_id, figure_id) do update set speed = s, accel = a, grip = g, weight = w;
  return jsonb_build_object('speed', s, 'accel', a, 'grip', g, 'weight', w);
end $$;

notify pgrst, 'reload schema';
