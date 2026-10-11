-- Swap offers (a figure instead of money) and public profiles.
-- Run once in the Supabase SQL editor.

-- ---------------------------------------------------------------- barter & profiles

-- An offer is either money (amount) or a figure from the buyer's shelf (offered_figure).
alter table public.offers add column if not exists offered_figure text references public.figures (id);
alter table public.offers alter column amount drop not null;
alter table public.offers drop constraint if exists offers_has_value;
alter table public.offers add constraint offers_has_value check ((amount is null) <> (offered_figure is null));
-- what a listing was swapped for, shown in the seller's history
alter table public.listings add column if not exists sold_figure text references public.figures (id);

-- Anyone signed in can see another player's shelf (for profiles and swaps).
create or replace function public.public_shelf(p_user uuid) returns table (figure_id text, count int)
language sql stable security definer set search_path = public as $$
  select i.figure_id, i.count from public.inventory i where i.user_id = p_user and i.count > 0;
$$;

create or replace function public._require_figure(p_user uuid, p_figure text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.inventory where user_id = p_user and figure_id = p_figure and count >= 1) then
    raise exception 'The buyer doesn''t have that figure on their shelf';
  end if;
end $$;

-- Swaps the listed figure for the buyer's offered figure.
create or replace function public._swap(p_listing uuid, p_buyer uuid, p_figure text) returns void
language plpgsql security definer set search_path = public as $$
declare l public.listings;
begin
  select * into l from public.listings where id = p_listing for update;
  if not found or l.status <> 'active' then raise exception 'This listing is no longer available'; end if;
  if l.seller_id = p_buyer then raise exception 'You cannot buy your own figure'; end if;
  update public.inventory set count = count - 1 where user_id = p_buyer and figure_id = p_figure and count >= 1;
  if not found then raise exception 'The buyer no longer has that figure'; end if;
  perform public._give(l.seller_id, p_figure);
  perform public._give(p_buyer, l.figure_id);
  update public.listings set status = 'sold', buyer_id = p_buyer, sold_figure = p_figure, closed_at = now()
    where id = p_listing;
  update public.offers set status = 'closed' where listing_id = p_listing and status = 'pending';
end $$;

drop function if exists public.make_offer(uuid, numeric);
create or replace function public.make_offer(p_listing uuid, p_amount numeric default null, p_figure text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  l public.listings;
  oid uuid;
begin
  perform public._require_username(u);
  select * into l from public.listings where id = p_listing;
  if not found or l.status <> 'active' then raise exception 'This listing is no longer available'; end if;
  if l.seller_id = u then raise exception 'You cannot make an offer on your own figure'; end if;
  if p_figure is not null then
    perform public._require_figure(u, p_figure);
  elsif p_amount is null or p_amount <= 0 then
    raise exception 'Choose an amount or a figure to offer';
  end if;
  -- a fresh offer replaces your previous open one on this listing
  update public.offers set status = 'withdrawn' where listing_id = p_listing and buyer_id = u and status = 'pending';
  insert into public.offers (listing_id, buyer_id, amount, offered_figure, proposed_by)
    values (p_listing, u, case when p_figure is null then round(p_amount, 2) end, p_figure, 'buyer') returning id into oid;
  return oid;
end $$;

drop function if exists public.counter_offer(uuid, numeric);
create or replace function public.counter_offer(p_offer uuid, p_amount numeric default null, p_figure text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare r record;
  oid uuid;
begin
  select * into r from public._offer_role(p_offer, public._uid());
  if r.role = (r.o).proposed_by then raise exception 'Wait for the other player to respond'; end if;
  -- a swap counter always names a figure from the buyer's shelf
  if p_figure is not null then
    perform public._require_figure((r.o).buyer_id, p_figure);
  elsif p_amount is null or p_amount <= 0 then
    raise exception 'Choose an amount or a figure to offer';
  end if;
  update public.offers set status = 'countered' where id = p_offer;
  insert into public.offers (listing_id, buyer_id, amount, offered_figure, proposed_by)
    values ((r.o).listing_id, (r.o).buyer_id, case when p_figure is null then round(p_amount, 2) end, p_figure, r.role)
    returning id into oid;
  return oid;
end $$;

create or replace function public.accept_offer(p_offer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public._offer_role(p_offer, public._uid());
  if r.role = (r.o).proposed_by then raise exception 'Wait for the other player to respond'; end if;
  update public.offers set status = 'accepted' where id = p_offer;
  if (r.o).offered_figure is not null then
    perform public._swap((r.o).listing_id, (r.o).buyer_id, (r.o).offered_figure);
  else
    perform public._trade((r.o).listing_id, (r.o).buyer_id, (r.o).amount);
  end if;
end $$;

revoke execute on function public._require_figure(uuid, text), public._swap(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.public_shelf(uuid), public.make_offer(uuid, numeric, text), public.counter_offer(uuid, numeric, text) from public, anon;
grant execute on function public.public_shelf(uuid), public.make_offer(uuid, numeric, text), public.counter_offer(uuid, numeric, text) to authenticated;
