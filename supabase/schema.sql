-- Sonny Angel Simulator — Supabase schema
-- Run this whole file once in the Supabase SQL editor, then run catalog.sql.
--
-- Players can only READ through row level security. Every change (opening a
-- box, listing, offering, trading) goes through the security-definer functions
-- below, so nobody can edit their own budget or shelf from the browser.

-- ---------------------------------------------------------------- catalog

create table if not exists public.game_config (
  id int primary key default 1 check (id = 1),
  starting_wallet numeric(10, 2) not null,
  daily_allowance numeric(10, 2) not null,
  welcome_bonus numeric(10, 2) not null default 20
);

create table if not exists public.series (
  id text primary key,
  price numeric(10, 2) not null,
  secret_odds int not null
);

create table if not exists public.figures (
  id text primary key,
  series_id text not null references public.series (id),
  value numeric(10, 2) not null,
  secret boolean not null default false
);

-- ---------------------------------------------------------------- players

-- Public: just the username shown on listings and offers.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

-- Private: budget and stats, readable only by the player themselves.
create table if not exists public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  wallet numeric(10, 2) not null check (wallet >= 0),
  last_claim date,
  imported boolean not null default false,
  welcome_bonus boolean not null default false, -- one-time gift claimed?
  opened int not null default 0,
  spent numeric(10, 2) not null default 0,
  earned numeric(10, 2) not null default 0,
  secrets int not null default 0
);

-- A row with count 0 means "had it once" (shown as Sold in the line-up).
create table if not exists public.inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  figure_id text not null references public.figures (id),
  count int not null default 0 check (count >= 0),
  first_seen timestamptz not null default now(),
  primary key (user_id, figure_id)
);

-- ---------------------------------------------------------------- market

-- A listed figure is held in escrow: it leaves the seller's shelf until the
-- listing is sold (goes to the buyer) or cancelled (goes back).
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  figure_id text not null references public.figures (id),
  price numeric(10, 2) not null check (price > 0 and price <= 100000),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references public.profiles (id),
  sold_price numeric(10, 2),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- One negotiation = all offers for (listing, buyer). Each counter-offer adds a
-- new row; only the latest row is 'pending', and only the other side may
-- accept, reject or counter it.
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0 and amount <= 100000),
  proposed_by text not null check (proposed_by in ('buyer', 'seller')),
  status text not null default 'pending'
    check (status in ('pending', 'countered', 'accepted', 'rejected', 'withdrawn', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists listings_status_idx on public.listings (status, created_at desc);
create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists offers_thread_idx on public.offers (listing_id, buyer_id, created_at);
create index if not exists offers_buyer_idx on public.offers (buyer_id);

-- ---------------------------------------------------------------- row level security

alter table public.game_config enable row level security;
alter table public.series enable row level security;
alter table public.figures enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.inventory enable row level security;
alter table public.listings enable row level security;
alter table public.offers enable row level security;

drop policy if exists "catalog readable" on public.game_config;
create policy "catalog readable" on public.game_config for select using (true);
drop policy if exists "catalog readable" on public.series;
create policy "catalog readable" on public.series for select using (true);
drop policy if exists "catalog readable" on public.figures;
create policy "catalog readable" on public.figures for select using (true);

drop policy if exists "usernames readable" on public.profiles;
create policy "usernames readable" on public.profiles for select to authenticated using (true);

drop policy if exists "own player row" on public.players;
create policy "own player row" on public.players for select to authenticated using (id = auth.uid());

drop policy if exists "own inventory" on public.inventory;
create policy "own inventory" on public.inventory for select to authenticated using (user_id = auth.uid());

drop policy if exists "market readable" on public.listings;
create policy "market readable" on public.listings for select to authenticated using (true);

drop policy if exists "offers for participants" on public.offers;
create policy "offers for participants" on public.offers for select to authenticated using (
  buyer_id = auth.uid()
  or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
);

-- ---------------------------------------------------------------- new players

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.players (id, wallet)
    select new.id, starting_wallet from public.game_config
    on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- internal helpers

create or replace function public._uid() returns uuid
language plpgsql stable as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Please sign in first'; end if;
  return u;
end $$;

create or replace function public._require_username(p_user uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if (select username from public.profiles where id = p_user) is null then
    raise exception 'Pick a username before trading';
  end if;
end $$;

-- Adds one figure to a shelf; returns true when it is new (count was 0).
create or replace function public._give(p_user uuid, p_fig text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.inventory (user_id, figure_id, count) values (p_user, p_fig, 1)
  on conflict (user_id, figure_id) do update set count = public.inventory.count + 1
  returning count into c;
  return c = 1;
end $$;

-- Moves the listed figure to the buyer and the money to the seller.
create or replace function public._trade(p_listing uuid, p_buyer uuid, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare l public.listings;
begin
  select * into l from public.listings where id = p_listing for update;
  if not found or l.status <> 'active' then raise exception 'This listing is no longer available'; end if;
  if l.seller_id = p_buyer then raise exception 'You cannot buy your own figure'; end if;

  update public.players set wallet = wallet - p_amount, spent = spent + p_amount
    where id = p_buyer and wallet >= p_amount;
  if not found then raise exception 'The buyer does not have enough budget'; end if;
  update public.players set wallet = wallet + p_amount, earned = earned + p_amount where id = l.seller_id;

  perform public._give(p_buyer, l.figure_id);
  update public.listings set status = 'sold', buyer_id = p_buyer, sold_price = p_amount, closed_at = now()
    where id = p_listing;
  update public.offers set status = 'closed' where listing_id = p_listing and status = 'pending';
end $$;

-- Loads an offer and works out whether the caller is its buyer or seller.
create or replace function public._offer_role(p_offer uuid, p_user uuid, out o public.offers, out role text)
language plpgsql security definer set search_path = public as $$
declare l public.listings;
begin
  select * into o from public.offers where id = p_offer for update;
  if not found then raise exception 'Offer not found'; end if;
  select * into l from public.listings where id = o.listing_id;
  if o.status <> 'pending' or l.status <> 'active' then raise exception 'This offer is no longer open'; end if;
  role := case when p_user = o.buyer_id then 'buyer' when p_user = l.seller_id then 'seller' end;
  if role is null then raise exception 'This is not your negotiation'; end if;
end $$;

-- ---------------------------------------------------------------- player actions

create or replace function public.set_username(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set username = trim(p_name) where id = public._uid();
exception when unique_violation then
  raise exception 'That username is already taken';
when check_violation then
  raise exception 'Use 3–20 letters, numbers or underscores';
end $$;

create or replace function public.claim_daily() returns numeric
language plpgsql security definer set search_path = public as $$
declare w numeric;
  today date := (now() at time zone 'utc')::date;
begin
  update public.players
    set wallet = wallet + (select daily_allowance from public.game_config), last_claim = today
    where id = public._uid() and (last_claim is null or last_claim < today)
    returning wallet into w;
  if w is null then raise exception 'You already claimed today''s allowance'; end if;
  return w;
end $$;

-- One-time welcome gift, claimed on the player's first login.
create or replace function public.claim_welcome_bonus() returns numeric
language plpgsql security definer set search_path = public as $$
declare bonus numeric := (select welcome_bonus from public.game_config);
begin
  update public.players set wallet = wallet + bonus, welcome_bonus = true
    where id = public._uid() and not welcome_bonus;
  return case when found then bonus end; -- null when it was already claimed
end $$;

-- The server draws the figure, so boxes can't be rigged from the browser.
create or replace function public.open_box(p_series text, out fig_id text, out is_new boolean)
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.series;
begin
  select * into s from public.series where id = p_series;
  if not found then raise exception 'Unknown series'; end if;

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

-- One-time import of a browser save, only before playing online.
create or replace function public.import_local_save(p_wallet numeric, p_inventory jsonb, p_stats jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  p public.players;
  k text;
  v text;
begin
  select * into p from public.players where id = u for update;
  if p.imported then raise exception 'Your save was already imported'; end if;
  if p.opened > 0 or exists (select 1 from public.listings where seller_id = u)
     or exists (select 1 from public.offers where buyer_id = u) then
    raise exception 'Import is only possible before you start playing online';
  end if;

  for k, v in select key, value from jsonb_each_text(coalesce(p_inventory, '{}'::jsonb)) loop
    if exists (select 1 from public.figures where id = k) then
      insert into public.inventory (user_id, figure_id, count)
        values (u, k, least(greatest(coalesce(v::int, 0), 0), 99))
        on conflict (user_id, figure_id) do update set count = excluded.count;
    end if;
  end loop;

  update public.players set
    wallet = least(greatest(coalesce(p_wallet, 0), 0), 100000),
    imported = true,
    opened = greatest(coalesce((p_stats ->> 'opened')::int, 0), 0),
    spent = greatest(coalesce((p_stats ->> 'spent')::numeric, 0), 0),
    earned = greatest(coalesce((p_stats ->> 'earned')::numeric, 0), 0),
    secrets = greatest(coalesce((p_stats ->> 'secrets')::int, 0), 0)
  where id = u;
end $$;

create or replace function public.create_listing(p_fig text, p_price numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  lid uuid;
begin
  perform public._require_username(u);
  update public.inventory set count = count - 1 where user_id = u and figure_id = p_fig and count >= 1;
  if not found then raise exception 'You don''t have this figure on your shelf'; end if;
  insert into public.listings (seller_id, figure_id, price) values (u, p_fig, round(p_price, 2)) returning id into lid;
  return lid;
end $$;

create or replace function public.update_listing_price(p_listing uuid, p_price numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.listings set price = round(p_price, 2)
    where id = p_listing and seller_id = public._uid() and status = 'active';
  if not found then raise exception 'You can only change your own active listings'; end if;
end $$;

create or replace function public.cancel_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  fig text;
begin
  update public.listings set status = 'cancelled', closed_at = now()
    where id = p_listing and seller_id = u and status = 'active'
    returning figure_id into fig;
  if fig is null then raise exception 'You can only cancel your own active listings'; end if;
  perform public._give(u, fig);
  update public.offers set status = 'closed' where listing_id = p_listing and status = 'pending';
end $$;

create or replace function public.buy_now(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  perform public._require_username(u);
  perform public._trade(p_listing, u, (select price from public.listings where id = p_listing));
end $$;

create or replace function public.make_offer(p_listing uuid, p_amount numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  l public.listings;
  oid uuid;
begin
  perform public._require_username(u);
  select * into l from public.listings where id = p_listing;
  if not found or l.status <> 'active' then raise exception 'This listing is no longer available'; end if;
  if l.seller_id = u then raise exception 'You cannot make an offer on your own figure'; end if;
  -- a fresh offer replaces your previous open one on this listing
  update public.offers set status = 'withdrawn' where listing_id = p_listing and buyer_id = u and status = 'pending';
  insert into public.offers (listing_id, buyer_id, amount, proposed_by)
    values (p_listing, u, round(p_amount, 2), 'buyer') returning id into oid;
  return oid;
end $$;

create or replace function public.counter_offer(p_offer uuid, p_amount numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare r record;
  oid uuid;
begin
  select * into r from public._offer_role(p_offer, public._uid());
  if r.role = (r.o).proposed_by then raise exception 'Wait for the other player to respond'; end if;
  update public.offers set status = 'countered' where id = p_offer;
  insert into public.offers (listing_id, buyer_id, amount, proposed_by)
    values ((r.o).listing_id, (r.o).buyer_id, round(p_amount, 2), r.role) returning id into oid;
  return oid;
end $$;

create or replace function public.accept_offer(p_offer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public._offer_role(p_offer, public._uid());
  if r.role = (r.o).proposed_by then raise exception 'Wait for the other player to respond'; end if;
  update public.offers set status = 'accepted' where id = p_offer;
  perform public._trade((r.o).listing_id, (r.o).buyer_id, (r.o).amount);
end $$;

create or replace function public.reject_offer(p_offer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public._offer_role(p_offer, public._uid());
  if r.role = (r.o).proposed_by then raise exception 'You can withdraw your own offer instead'; end if;
  update public.offers set status = 'rejected' where id = p_offer;
end $$;

create or replace function public.withdraw_offer(p_offer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public._offer_role(p_offer, public._uid());
  if r.role <> (r.o).proposed_by then raise exception 'Only the player who made this offer can withdraw it'; end if;
  update public.offers set status = 'withdrawn' where id = p_offer;
end $$;

-- ---------------------------------------------------------------- permissions

-- Supabase grants table access to its roles by default; RLS above limits reads,
-- and with no insert/update/delete policies, direct writes are refused.
revoke insert, update, delete on all tables in schema public from anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.set_username(text),
  public.claim_daily(),
  public.claim_welcome_bonus(),
  public.open_box(text),
  public.import_local_save(numeric, jsonb, jsonb),
  public.create_listing(text, numeric),
  public.update_listing_price(uuid, numeric),
  public.cancel_listing(uuid),
  public.buy_now(uuid),
  public.make_offer(uuid, numeric),
  public.counter_offer(uuid, numeric),
  public.accept_offer(uuid),
  public.reject_offer(uuid),
  public.withdraw_offer(uuid)
to authenticated;
-- RLS policies call auth.uid(); _uid is used inside the functions above.
grant execute on function public._uid() to authenticated;

-- ---------------------------------------------------------------- live updates

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.listings, public.offers, public.players, public.inventory;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
