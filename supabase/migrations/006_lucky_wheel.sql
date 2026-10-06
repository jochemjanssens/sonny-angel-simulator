-- Daily lucky wheel. Run once in the Supabase SQL editor.

alter table public.players add column if not exists last_spin date;

-- Daily lucky wheel: one spin per player per UTC day, drawn on the server.
create table if not exists public.wheel_prizes (
  key text primary key,
  kind text not null check (kind in ('cash', 'figures', 'secret')),
  amount numeric(10, 2),
  count int,
  weight int not null check (weight > 0),
  sort int not null
);
alter table public.wheel_prizes enable row level security;
drop policy if exists "catalog readable" on public.wheel_prizes;
create policy "catalog readable" on public.wheel_prizes for select using (true);

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
  update public.players set last_spin = today
    where id = u and (last_spin is null or last_spin < today);
  if not found then raise exception 'You already spun the wheel today — come back tomorrow'; end if;

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

revoke execute on function public.spin_wheel() from public, anon;
grant execute on function public.spin_wheel() to authenticated;

-- Prizes and odds (same as WHEEL_PRIZES in src/data/collections.js)
delete from public.wheel_prizes;
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('cash5', 'cash', 5, null, 300, 0);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('fig1', 'figures', null, 1, 200, 1);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('cash10', 'cash', 10, null, 220, 2);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('cash20', 'cash', 20, null, 120, 3);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('fig2', 'figures', null, 2, 50, 4);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('cash15', 'cash', 15, null, 55, 5);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('cash50', 'cash', 50, null, 30, 6);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('fig3', 'figures', null, 3, 15, 7);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('cash100', 'cash', 100, null, 8, 8);
insert into public.wheel_prizes (key, kind, amount, count, weight, sort) values ('secret', 'secret', null, 1, 2, 9);
