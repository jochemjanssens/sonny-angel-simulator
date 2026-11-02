-- Buy and open 10 blind boxes at once. Run once in the Supabase SQL editor.

-- Several blind boxes at once (at most 10): everything or nothing, so you never
-- get half of them when your budget runs out. Each box draws like open_box.
create or replace function public.open_boxes(p_series text, p_count int default 10) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  price numeric;
  r record;
  drawn jsonb := '[]';
begin
  if p_count is null or p_count < 1 or p_count > 10 then raise exception 'You can open at most 10 boxes at once'; end if;
  select s.price into price from public.series s where s.id = p_series;
  if not found then raise exception 'Unknown series'; end if;
  if (select wallet from public.players where id = u for update) < price * p_count then
    raise exception 'Not enough budget for these boxes';
  end if;
  for i in 1 .. p_count loop
    select * into r from public.open_box(p_series);
    drawn := drawn || jsonb_build_object('fig_id', r.fig_id, 'is_new', r.is_new);
  end loop;
  return drawn;
end $$;

revoke execute on function public.open_boxes(text, int) from public, anon;
grant execute on function public.open_boxes(text, int) to authenticated;

notify pgrst, 'reload schema';
