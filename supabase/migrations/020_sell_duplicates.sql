-- Sell all duplicates to the bank in one batch.
-- Run once in the Supabase SQL editor.

-- Sells every extra copy to the bank in one go: one of each figure stays on the shelf.
create or replace function public.sell_duplicates_to_bank() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  n int;
  pay numeric;
begin
  perform 1 from public.inventory where user_id = u and count > 1 for update;
  select coalesce(sum(i.count - 1), 0), coalesce(sum(round(f.value * c.bank_rate, 2) * (i.count - 1)), 0)
    into n, pay
    from public.inventory i join public.figures f on f.id = i.figure_id cross join public.game_config c
    where i.user_id = u and i.count > 1;
  if n = 0 then raise exception 'You have no duplicates to sell'; end if;
  update public.inventory set count = 1 where user_id = u and count > 1;
  update public.players set wallet = wallet + pay, earned = earned + pay where id = u;
  return jsonb_build_object('sold', n, 'amount', pay);
end $$;

revoke execute on function public.sell_duplicates_to_bank() from public, anon;
grant execute on function public.sell_duplicates_to_bank() to authenticated;
