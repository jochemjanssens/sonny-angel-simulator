-- Swaps only with duplicates (you always keep at least one of the figure you give),
-- and only for figures both players don't have yet. Includes everything from 011,
-- so it's fine to run this one even if 011 wasn't run. Run once in the Supabase SQL editor.

-- Does this player have the figure, on their shelf or listed on the market?
create or replace function public._owns(p_user uuid, p_figure text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.inventory where user_id = p_user and figure_id = p_figure and count > 0)
      or exists (select 1 from public.listings where seller_id = p_user and figure_id = p_figure and status = 'active');
$$;

-- A swap is only allowed when both players get a figure they don't have yet,
-- and the buyer only gives away a duplicate (they keep at least one).
create or replace function public._check_swap(p_listing uuid, p_buyer uuid, p_figure text) returns void
language plpgsql stable security definer set search_path = public as $$
declare l public.listings;
begin
  select * into l from public.listings where id = p_listing;
  perform public._require_figure(p_buyer, p_figure);
  if not exists (select 1 from public.inventory where user_id = p_buyer and figure_id = p_figure and count >= 2) then
    raise exception 'Only duplicates can be swapped: the buyer needs at least two of that figure';
  end if;
  if public._owns(p_buyer, l.figure_id) then
    raise exception 'The buyer already has the listed figure, so only money offers are possible';
  end if;
  if public._owns(l.seller_id, p_figure) then
    raise exception 'The seller already has that figure, pick one they don''t have yet';
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
  perform public._check_swap(p_listing, p_buyer, p_figure);
  update public.inventory set count = count - 1 where user_id = p_buyer and figure_id = p_figure and count >= 1;
  if not found then raise exception 'The buyer no longer has that figure'; end if;
  perform public._give(l.seller_id, p_figure);
  perform public._give(p_buyer, l.figure_id);
  update public.listings set status = 'sold', buyer_id = p_buyer, sold_figure = p_figure, closed_at = now()
    where id = p_listing;
  update public.offers set status = 'closed' where listing_id = p_listing and status = 'pending';
end $$;

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
    perform public._check_swap(p_listing, u, p_figure);
  elsif p_amount is null or p_amount <= 0 then
    raise exception 'Choose an amount or a figure to offer';
  end if;
  -- a fresh offer replaces your previous open one on this listing
  update public.offers set status = 'withdrawn' where listing_id = p_listing and buyer_id = u and status = 'pending';
  insert into public.offers (listing_id, buyer_id, amount, offered_figure, proposed_by)
    values (p_listing, u, case when p_figure is null then round(p_amount, 2) end, p_figure, 'buyer') returning id into oid;
  return oid;
end $$;

create or replace function public.counter_offer(p_offer uuid, p_amount numeric default null, p_figure text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare r record;
  oid uuid;
begin
  select * into r from public._offer_role(p_offer, public._uid());
  if r.role = (r.o).proposed_by then raise exception 'Wait for the other player to respond'; end if;
  -- a swap counter always names a figure from the buyer's shelf
  if p_figure is not null then
    perform public._check_swap((r.o).listing_id, (r.o).buyer_id, p_figure);
  elsif p_amount is null or p_amount <= 0 then
    raise exception 'Choose an amount or a figure to offer';
  end if;
  update public.offers set status = 'countered' where id = p_offer;
  insert into public.offers (listing_id, buyer_id, amount, offered_figure, proposed_by)
    values ((r.o).listing_id, (r.o).buyer_id, case when p_figure is null then round(p_amount, 2) end, p_figure, r.role)
    returning id into oid;
  return oid;
end $$;

revoke execute on function public._owns(uuid, text), public._check_swap(uuid, uuid, text) from public, anon, authenticated;
