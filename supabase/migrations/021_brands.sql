-- Smiski simulator: series get a brand, and the wheel and "sell all duplicates"
-- only use figures from the simulator the player is in. Accounts, wallets and
-- the market are shared. Run once in the Supabase SQL editor, then run
-- catalog.sql again (it adds the Smiski series).

alter table public.series add column if not exists brand text not null default 'sonny' check (brand in ('sonny', 'smiski'));

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
        where f2.secret = (p_kind = 'secret') and s2.brand = p_brand order by random() limit 1;
      figs := figs || f;
      news := news || public._give(u, f);
    end loop;
    if p_kind = 'secret' then update public.players set secrets = secrets + 1 where id = u; end if;
  end if;

  return jsonb_build_object('prize', p_key, 'amount', p_amount, 'figures', to_jsonb(figs), 'new', to_jsonb(news));
end $$;

-- Sells every extra copy (of one brand's figures) to the bank in one go: one of
-- each figure stays on the shelf.
drop function if exists public.sell_duplicates_to_bank();
create or replace function public.sell_duplicates_to_bank(p_brand text default 'sonny') returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  n int;
  pay numeric;
begin
  perform 1 from public.inventory where user_id = u and count > 1 for update;
  select coalesce(sum(i.count - 1), 0), coalesce(sum(round(f.value * c.bank_rate, 2) * (i.count - 1)), 0)
    into n, pay
    from public.inventory i join public.figures f on f.id = i.figure_id join public.series s on s.id = f.series_id
      cross join public.game_config c
    where i.user_id = u and i.count > 1 and s.brand = p_brand;
  if n = 0 then raise exception 'You have no duplicates to sell'; end if;
  update public.inventory i set count = 1
    from public.figures f join public.series s on s.id = f.series_id
    where i.user_id = u and i.count > 1 and f.id = i.figure_id and s.brand = p_brand;
  update public.players set wallet = wallet + pay, earned = earned + pay where id = u;
  return jsonb_build_object('sold', n, 'amount', pay);
end $$;

revoke execute on function public.spin_wheel(text), public.sell_duplicates_to_bank(text) from public, anon;
grant execute on function public.spin_wheel(text), public.sell_duplicates_to_bank(text) to authenticated;
