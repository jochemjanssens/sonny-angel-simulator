-- Advent calendar: a door can only be opened on its own day. Run once in the
-- Supabase SQL editor.

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
  if extract(day from today) > p_day then raise exception 'This door could only be opened on its own day'; end if;
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

notify pgrst, 'reload schema';
