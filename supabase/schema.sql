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
  welcome_bonus numeric(10, 2) not null default 20,
  bank_rate numeric(4, 2) not null default 0.70,
  puzzle_small numeric(10, 2) not null default 5,
  puzzle_medium numeric(10, 2) not null default 10,
  puzzle_large numeric(10, 2) not null default 15,
  tables_small numeric(10, 2) not null default 0.08, -- times tables, per point
  tables_medium numeric(10, 2) not null default 0.10,
  tables_large numeric(10, 2) not null default 0.12
);

create table if not exists public.series (
  id text primary key,
  price numeric(10, 2) not null,
  secret_odds int not null
);
-- which simulator a series belongs to: the Sonny Angel or the Smiski one
alter table public.series add column if not exists brand text not null default 'sonny' check (brand in ('sonny', 'smiski', 'cars'));

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
  secrets int not null default 0,
  puzzles int not null default 0,
  puzzle_earned numeric(10, 2) not null default 0,
  last_spin date,
  bonus_spins int not null default 0 check (bonus_spins >= 0) -- extra wheel spins, won with times tables
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

-- Recreates a player's profile and budget rows if they are missing (e.g. the
-- account existed before this schema was installed, or the rows were deleted).
create or replace function public.ensure_player() returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  insert into public.profiles (id) values (u) on conflict do nothing;
  insert into public.players (id, wallet)
    select u, starting_wallet from public.game_config
    on conflict do nothing;
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

-- Puzzles pay out from the server. A session starts when the puzzle opens
-- and pays out once when it is finished.
create table if not exists public.puzzle_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('wordsearch', 'swedish', 'binary', 'memory', 'differences', 'tetris', 'coloring', 'tables')),
  size text not null check (size in ('small', 'medium', 'large')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  reward numeric(10, 2),
  score int -- times tables: correct sums
);
create index if not exists puzzle_sessions_user_idx on public.puzzle_sessions (user_id, finished_at);
create index if not exists puzzle_sessions_tables_idx on public.puzzle_sessions (kind, finished_at) where kind = 'tables';
alter table public.puzzle_sessions enable row level security;
drop policy if exists "own puzzles" on public.puzzle_sessions;
create policy "own puzzles" on public.puzzle_sessions for select to authenticated using (user_id = auth.uid());

create or replace function public.start_puzzle(p_kind text, p_size text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  insert into public.puzzle_sessions (user_id, kind, size) values (public._uid(), p_kind, p_size) returning id into sid;
  return sid;
end $$;

create or replace function public.finish_puzzle(p_session uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  pay numeric;
begin
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found or s.kind = 'tables' then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;

  pay := case s.size when 'small' then cfg.puzzle_small when 'medium' then cfg.puzzle_medium else cfg.puzzle_large end;
  update public.puzzle_sessions set finished_at = now(), reward = pay where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

-- The top 3 of every finished week and size, and the free wheel spins they got.
create table if not exists public.tables_prizes (
  week date not null,
  size text not null check (size in ('small', 'medium', 'large')),
  rank int not null check (rank between 1 and 3),
  user_id uuid not null references auth.users (id) on delete cascade,
  score int not null,
  spins int not null,
  paid_at timestamptz not null default now(),
  primary key (week, size, rank)
);
alter table public.tables_prizes enable row level security;

-- Gives the top 3 of every finished week, per size, their free wheel spins
-- (3, 2 and 1). Called whenever someone plays or looks at the highscores, so
-- no cron job is needed. Each player's best score counts; on a tie, whoever
-- got the score first ranks higher.
create or replace function public._settle_tables_weeks() returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  for w in
    select wk, size, user_id, score, rank
    from (
      select wk, size, user_id, score,
        row_number() over (partition by wk, size order by score desc, finished_at) as rank
      from (
        select distinct on (wk, size, user_id) wk, size, user_id, score, finished_at
        from (
          select date_trunc('week', finished_at at time zone 'UTC')::date as wk, size, user_id, score, finished_at
          from public.puzzle_sessions
          where kind = 'tables' and score > 0 and finished_at < date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
        ) s
        order by wk, size, user_id, score desc, finished_at
      ) best
    ) ranked
    where rank <= 3
      and not exists (select 1 from public.tables_prizes p where p.week = ranked.wk and p.size = ranked.size)
  loop
    insert into public.tables_prizes (week, size, rank, user_id, score, spins)
      values (w.wk, w.size, w.rank, w.user_id, w.score, 4 - w.rank)
      on conflict do nothing;
    if found then
      update public.players set bonus_spins = bonus_spins + 4 - w.rank where id = w.user_id;
    end if;
  end loop;
end $$;

-- Times tables score one point per correct sum and lose two per wrong one
-- (never below 0). Pay is per point, more for bigger sizes. The minute must
-- really be over, and no more than 90 correct sums (1.5 per second) count.
create or replace function public.finish_tables(p_session uuid, p_correct int, p_wrong int) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.puzzle_sessions;
  cfg public.game_config;
  n int := greatest(least(greatest(coalesce(p_correct, 0), 0), 90) - 2 * greatest(coalesce(p_wrong, 0), 0), 0);
  pay numeric;
begin
  perform public._settle_tables_weeks();
  select * into cfg from public.game_config;
  select * into s from public.puzzle_sessions where id = p_session and user_id = u for update;
  if not found or s.kind <> 'tables' then raise exception 'Puzzle not found'; end if;
  if s.finished_at is not null then raise exception 'This puzzle was already paid out'; end if;
  if now() - s.started_at < interval '58 seconds' then raise exception 'The minute is not over yet'; end if;

  pay := n * case s.size when 'small' then cfg.tables_small when 'medium' then cfg.tables_medium else cfg.tables_large end;
  update public.puzzle_sessions set finished_at = now(), reward = pay, score = n where id = p_session;
  update public.players set wallet = wallet + pay, puzzles = puzzles + 1, puzzle_earned = puzzle_earned + pay where id = u;
  return pay;
end $$;

-- This week's top 10 for one size (each player's best score), your own best,
-- and last week's top 3 of that size.
create or replace function public.tables_highscores(p_size text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  wk timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  top jsonb;
  mine int;
  last jsonb;
begin
  perform public._settle_tables_weeks();
  with best as (
    select distinct on (user_id) user_id, score, finished_at as at
    from public.puzzle_sessions
    where kind = 'tables' and size = p_size and score > 0 and finished_at >= wk
    order by user_id, score desc, finished_at
  ), ranked as (
    select * from best order by score desc, at limit 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'username', pr.username, 'score', r.score) order by r.score desc, r.at), '[]')
    into top
  from ranked r left join public.profiles pr on pr.id = r.user_id;
  select max(score) into mine from public.puzzle_sessions
    where kind = 'tables' and size = p_size and user_id = u and finished_at >= wk;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'username', pr.username, 'score', p.score, 'spins', p.spins) order by p.rank), '[]')
    into last
  from public.tables_prizes p left join public.profiles pr on pr.id = p.user_id
  where p.size = p_size and p.week = (date_trunc('week', now() at time zone 'UTC') - interval '7 days')::date;
  return jsonb_build_object('top', top, 'mine', mine, 'last', last, 'ends_at', wk + interval '7 days');
end $$;

-- The bank always buys, for a fixed share of the market value.
create or replace function public.sell_to_bank(p_fig text) returns numeric
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  pay numeric;
begin
  select round(f.value * c.bank_rate, 2) into pay from public.figures f, public.game_config c where f.id = p_fig;
  if pay is null then raise exception 'Unknown figure'; end if;
  update public.inventory set count = count - 1 where user_id = u and figure_id = p_fig and count >= 1;
  if not found then raise exception 'You don''t have this figure on your shelf'; end if;
  update public.players set wallet = wallet + pay, earned = earned + pay where id = u;
  return pay;
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

-- Daily lucky wheel: one spin per player per UTC day (plus any bonus spins),
-- drawn on the server.
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

-- ---------------------------------------------------------------- Turbo Minis: cars and races

alter table public.series drop constraint if exists series_brand_check;
alter table public.series add constraint series_brand_check check (brand in ('sonny', 'smiski', 'cars'));

-- car stats (1–10); empty for figures that aren't cars
alter table public.figures add column if not exists speed smallint;
alter table public.figures add column if not exists accel smallint;
alter table public.figures add column if not exists grip smallint;
alter table public.figures add column if not exists weight smallint;

-- every player can race on every track; the weights say which stats count
create table if not exists public.tracks (
  id text primary key,
  w_speed numeric not null,
  w_accel numeric not null,
  w_grip numeric not null,
  w_weight numeric not null,
  risk_stat text check (risk_stat in ('speed', 'accel', 'grip', 'weight')),
  risk_below int,
  risk_chance numeric
);
alter table public.tracks enable row level security;
drop policy if exists "catalog readable" on public.tracks;
create policy "catalog readable" on public.tracks for select using (true);

-- ---------------------------------------------------------------- races

-- A challenge: the challenger's car waits at the track (taken off the shelf)
-- until someone accepts it or it's cancelled. Stake: money (both pay, winner
-- takes all) or the cars themselves (winner gets both).
create table if not exists public.race_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  challenger_car text not null references public.figures (id),
  track_id text not null references public.tracks (id),
  stake_kind text not null check (stake_kind in ('money', 'car')),
  stake_amount numeric(10, 2) not null default 0,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  opponent_id uuid references public.profiles (id) on delete set null,
  opponent_car text references public.figures (id),
  result jsonb,
  winner_id uuid,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists race_challenges_status_idx on public.race_challenges (status, created_at);
alter table public.race_challenges enable row level security;
drop policy if exists "challenges readable" on public.race_challenges;
create policy "challenges readable" on public.race_challenges for select to authenticated using (true);

-- Races against the computer (a few wins a day pay a little).
create table if not exists public.cpu_races (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  car text not null references public.figures (id),
  cpu_car text not null references public.figures (id),
  track_id text not null references public.tracks (id),
  won boolean not null,
  prize numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cpu_races_user_idx on public.cpu_races (user_id, created_at);
alter table public.cpu_races enable row level security;
drop policy if exists "own cpu races" on public.cpu_races;
create policy "own cpu races" on public.cpu_races for select to authenticated using (user_id = auth.uid());

-- One car's run on a track: a finish time in seconds (lower is better) and
-- whether it spun out. Better stats for the track mean a faster time, with a
-- little luck on top, so the underdog can still win.
create or replace function public._car_run(p_car text, p_track text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare f public.figures;
  tr public.tracks;
  perf numeric;
  t numeric;
  stat int;
  crashed boolean := false;
begin
  select * into f from public.figures where id = p_car;
  if f.speed is null then raise exception 'That is not a race car'; end if;
  select * into tr from public.tracks where id = p_track;
  if not found then raise exception 'Unknown track'; end if;
  perf := tr.w_speed * f.speed + tr.w_accel * f.accel + tr.w_grip * f.grip + tr.w_weight * f.weight;
  t := 6 * (1 + (10 - perf) * 0.06) * (1 + (random() * 2 - 1) * 0.05);
  if tr.risk_stat is not null then
    stat := case tr.risk_stat when 'speed' then f.speed when 'accel' then f.accel when 'grip' then f.grip else f.weight end;
    if stat < tr.risk_below and random() < tr.risk_chance then
      crashed := true;
      t := t + 1.5;
    end if;
  end if;
  return jsonb_build_object('car', p_car, 'time', round(t, 2), 'crashed', crashed);
end $$;

create or replace function public._require_car(p_user uuid, p_car text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.figures where id = p_car and speed is not null) then
    raise exception 'That is not a race car';
  end if;
  if not exists (select 1 from public.inventory where user_id = p_user and figure_id = p_car and count >= 1) then
    raise exception 'You don''t have this car on your shelf';
  end if;
end $$;

create or replace function public.race_cpu(p_car text, p_track text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  cpu text;
  me jsonb;
  them jsonb;
  is_win boolean;
  paid int;
  pay numeric := 0;
begin
  perform public._require_car(u, p_car);
  -- any regular car as the opponent
  select id into cpu from public.figures where speed is not null and not secret and id <> p_car order by random() limit 1;
  me := public._car_run(p_car, p_track);
  them := public._car_run(cpu, p_track);
  is_win := (me ->> 'time')::numeric < (them ->> 'time')::numeric;
  select count(*) into paid from public.cpu_races r
    where r.user_id = u and r.prize > 0 and r.created_at >= (now() at time zone 'utc')::date;
  if is_win and paid < 5 then
    pay := 2;
    update public.players set wallet = wallet + pay, earned = earned + pay where id = u;
  end if;
  insert into public.cpu_races (user_id, car, cpu_car, track_id, won, prize) values (u, p_car, cpu, p_track, is_win, pay);
  return jsonb_build_object('me', me, 'cpu', them, 'won', is_win, 'prize', pay, 'paid_left', greatest(0, 5 - paid - (pay > 0)::int));
end $$;

create or replace function public.create_race_challenge(p_car text, p_track text, p_kind text, p_amount numeric default 0) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  amt numeric := 0;
  cid uuid;
begin
  perform public._require_username(u);
  perform public._require_car(u, p_car);
  if not exists (select 1 from public.tracks where id = p_track) then raise exception 'Unknown track'; end if;
  if p_kind not in ('money', 'car') then raise exception 'Choose money or the car as the stake'; end if;
  if (select count(*) from public.race_challenges where challenger_id = u and status = 'open') >= 5 then
    raise exception 'You can have at most 5 open challenges';
  end if;
  if p_kind = 'money' then
    amt := round(coalesce(p_amount, 0), 2);
    if amt <= 0 then raise exception 'Choose an amount to race for'; end if;
    update public.players set wallet = wallet - amt where id = u and wallet >= amt;
    if not found then raise exception 'Not enough budget for this stake'; end if;
  end if;
  -- the car waits at the track until the race
  update public.inventory set count = count - 1 where user_id = u and figure_id = p_car and count >= 1;
  insert into public.race_challenges (challenger_id, challenger_car, track_id, stake_kind, stake_amount)
    values (u, p_car, p_track, p_kind, amt) returning id into cid;
  return cid;
end $$;

create or replace function public.cancel_race_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  ch public.race_challenges;
begin
  select * into ch from public.race_challenges where id = p_challenge and challenger_id = u and status = 'open' for update;
  if not found then raise exception 'This challenge is no longer open'; end if;
  update public.race_challenges set status = 'cancelled', finished_at = now() where id = p_challenge;
  perform public._give(u, ch.challenger_car);
  if ch.stake_kind = 'money' then
    update public.players set wallet = wallet + ch.stake_amount where id = u;
  end if;
end $$;

create or replace function public.accept_race_challenge(p_challenge uuid, p_car text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  ch public.race_challenges;
  a jsonb;
  b jsonb;
  winner uuid;
  res jsonb;
begin
  perform public._require_username(u);
  select * into ch from public.race_challenges where id = p_challenge for update;
  if not found or ch.status <> 'open' then raise exception 'This challenge is no longer open'; end if;
  if ch.challenger_id = u then raise exception 'You cannot race against yourself'; end if;
  perform public._require_car(u, p_car);
  if ch.stake_kind = 'money' then
    update public.players set wallet = wallet - ch.stake_amount where id = u and wallet >= ch.stake_amount;
    if not found then raise exception 'Not enough budget for this stake'; end if;
  else
    -- pink slips: your car is on the line too
    update public.inventory set count = count - 1 where user_id = u and figure_id = p_car and count >= 1;
  end if;

  a := public._car_run(ch.challenger_car, ch.track_id);
  b := public._car_run(p_car, ch.track_id);
  winner := case when (b ->> 'time')::numeric < (a ->> 'time')::numeric then u else ch.challenger_id end;
  res := jsonb_build_object('challenger', a, 'opponent', b);

  if ch.stake_kind = 'money' then
    update public.players set wallet = wallet + ch.stake_amount * 2 where id = winner;
    perform public._give(ch.challenger_id, ch.challenger_car);
  else
    perform public._give(winner, ch.challenger_car);
    perform public._give(winner, p_car);
  end if;

  update public.race_challenges
    set status = 'done', opponent_id = u, opponent_car = p_car, result = res, winner_id = winner, finished_at = now()
    where id = p_challenge;
  return res || jsonb_build_object('winner', winner);
end $$;

-- ---------------------------------------------------------------- Turbo Minis: time trials
-- the fastest time anyone could possibly drive on a track (set by catalog.sql)
alter table public.tracks add column if not exists min_ms int not null default 5000;

create table if not exists public.time_trials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null references public.tracks (id),
  car text not null references public.figures (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  time_ms int
);
alter table public.time_trials add column if not exists reward numeric(10, 2) not null default 0;
-- medal times per track (set by catalog.sql)
alter table public.tracks add column if not exists gold_ms int not null default 15000;
alter table public.tracks add column if not exists silver_ms int not null default 20000;
alter table public.tracks add column if not exists bronze_ms int not null default 25000;
create index if not exists time_trials_track_idx on public.time_trials (track_id, finished_at) where time_ms is not null;
alter table public.time_trials enable row level security;
drop policy if exists "own time trials" on public.time_trials;
create policy "own time trials" on public.time_trials for select to authenticated using (user_id = auth.uid());

-- The top 3 of every finished week and track, and the free wheel spins they got.
create table if not exists public.trial_prizes (
  week date not null,
  track_id text not null references public.tracks (id),
  rank int not null check (rank between 1 and 3),
  user_id uuid not null references auth.users (id) on delete cascade,
  time_ms int not null,
  spins int not null,
  paid_at timestamptz not null default now(),
  primary key (week, track_id, rank)
);
alter table public.trial_prizes enable row level security;

-- Gives the top 3 of every finished week, per track, their free wheel spins
-- (3, 2 and 1). Called whenever someone races or looks at the highscores, so no
-- cron job is needed. Each player's best time counts; on a tie, whoever drove
-- it first ranks higher.
create or replace function public._settle_trial_weeks() returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  for w in
    select wk, track_id, user_id, time_ms, rank
    from (
      select wk, track_id, user_id, time_ms,
        row_number() over (partition by wk, track_id order by time_ms, finished_at) as rank
      from (
        select distinct on (wk, track_id, user_id) wk, track_id, user_id, time_ms, finished_at
        from (
          select date_trunc('week', finished_at at time zone 'UTC')::date as wk, track_id, user_id, time_ms, finished_at
          from public.time_trials
          where time_ms is not null and finished_at < date_trunc('week', now() at time zone 'UTC') at time zone 'UTC'
        ) s
        order by wk, track_id, user_id, time_ms, finished_at
      ) best
    ) ranked
    where rank <= 3
      and not exists (select 1 from public.trial_prizes p where p.week = ranked.wk and p.track_id = ranked.track_id)
  loop
    insert into public.trial_prizes (week, track_id, rank, user_id, time_ms, spins)
      values (w.wk, w.track_id, w.rank, w.user_id, w.time_ms, 4 - w.rank)
      on conflict do nothing;
    if found then
      update public.players set bonus_spins = bonus_spins + 4 - w.rank where id = w.user_id;
    end if;
  end loop;
end $$;

create or replace function public.start_time_trial(p_track text, p_car text) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  sid uuid;
begin
  perform public._require_car(u, p_car);
  if not exists (select 1 from public.tracks where id = p_track) then raise exception 'Unknown track'; end if;
  insert into public.time_trials (user_id, track_id, car) values (u, p_track, p_car) returning id into sid;
  return sid;
end $$;

-- Saves a finished run. The time can't be faster than the track allows, nor
-- faster than the time that really passed since the run was started. Each run
-- earns a medal (by the track's medal times) and a reward;
-- the first 10 runs of the day (UTC) pay out.
create or replace function public.finish_time_trial(p_session uuid, p_time_ms int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  s public.time_trials;
  floor_ms int;
  elapsed_ms numeric;
  best int;
  rnk int;
  wk timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  tr public.tracks;
  medal text;
  pay numeric;
  paid int;
begin
  perform public._settle_trial_weeks();
  select * into s from public.time_trials where id = p_session and user_id = u for update;
  if not found then raise exception 'Race not found'; end if;
  if s.finished_at is not null then raise exception 'This race was already saved'; end if;
  select min_ms into floor_ms from public.tracks where id = s.track_id;
  elapsed_ms := extract(epoch from now() - s.started_at) * 1000;
  if p_time_ms is null or p_time_ms < floor_ms or p_time_ms > elapsed_ms + 1000 or p_time_ms > 900000 then
    raise exception 'That time is not possible';
  end if;

  -- medal and reward: the closer to the fastest possible time, the more
  select * into tr from public.tracks where id = s.track_id;
  medal := case
    when p_time_ms <= tr.gold_ms then 'gold'
    when p_time_ms <= tr.silver_ms then 'silver'
    when p_time_ms <= tr.bronze_ms then 'bronze'
    else 'finish' end;
  select count(*) into paid from public.time_trials t
    where t.user_id = u and t.reward > 0 and t.finished_at >= (now() at time zone 'utc')::date;
  pay := case when paid >= 10 then 0 else case medal when 'gold' then 3 when 'silver' then 2 when 'bronze' then 1 else 0.5 end end;
  update public.time_trials set finished_at = now(), time_ms = p_time_ms, reward = pay where id = p_session;
  if pay > 0 then
    update public.players set wallet = wallet + pay where id = u;
  end if;

  select min(time_ms) into best from public.time_trials
    where user_id = u and track_id = s.track_id and time_ms is not null and finished_at >= wk;
  -- your place this week: players with a better best time, plus one
  select count(*) + 1 into rnk from (
    select user_id, min(time_ms) as t from public.time_trials
    where track_id = s.track_id and time_ms is not null and finished_at >= wk and user_id <> u
    group by user_id
  ) o where o.t < best;
  return jsonb_build_object('time_ms', p_time_ms, 'best', best, 'rank', rnk, 'new_best', best = p_time_ms,
    'medal', medal, 'reward', pay, 'paid_left', greatest(0, 10 - paid - (pay > 0)::int));
end $$;

-- This week's top 10 for one track (each player's best time), your own best,
-- and last week's top 3 of that track.
create or replace function public.trial_highscores(p_track text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
  wk timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  top jsonb;
  mine int;
  last jsonb;
begin
  perform public._settle_trial_weeks();
  with best as (
    select distinct on (user_id) user_id, time_ms, car, finished_at as at
    from public.time_trials
    where track_id = p_track and time_ms is not null and finished_at >= wk
    order by user_id, time_ms, finished_at
  ), ranked as (
    select * from best order by time_ms, at limit 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'username', pr.username, 'time_ms', r.time_ms, 'car', r.car) order by r.time_ms, r.at), '[]')
    into top
  from ranked r left join public.profiles pr on pr.id = r.user_id;
  select min(time_ms) into mine from public.time_trials
    where track_id = p_track and user_id = u and time_ms is not null and finished_at >= wk;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'username', pr.username, 'time_ms', p.time_ms, 'spins', p.spins) order by p.rank), '[]')
    into last
  from public.trial_prizes p left join public.profiles pr on pr.id = p.user_id
  where p.track_id = p_track and p.week = (date_trunc('week', now() at time zone 'UTC') - interval '7 days')::date;
  return jsonb_build_object('top', top, 'mine', mine, 'last', last, 'ends_at', wk + interval '7 days');
end $$;

-- ---------------------------------------------------------------- Turbo Minis: upgrade boxes
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

-- ---------------------------------------------------------------- permissions

-- Supabase grants table access to its roles by default; RLS above limits reads,
-- and with no insert/update/delete policies, direct writes are refused.
revoke insert, update, delete on all tables in schema public from anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.set_username(text),
  public.ensure_player(),
  public.claim_daily(),
  public.claim_welcome_bonus(),
  public.start_puzzle(text, text),
  public.finish_puzzle(uuid),
  public.finish_tables(uuid, int, int),
  public.tables_highscores(text),
  public.sell_to_bank(text),
  public.sell_duplicates_to_bank(text),
  public.spin_wheel(text),
  public.start_time_trial(text, text),
  public.open_upgrade_box(),
  public.apply_upgrade(text, text),
  public.finish_time_trial(uuid, int),
  public.trial_highscores(text),
  public.open_box(text),
  public.import_local_save(numeric, jsonb, jsonb),
  public.create_listing(text, numeric),
  public.update_listing_price(uuid, numeric),
  public.cancel_listing(uuid),
  public.buy_now(uuid),
  public.make_offer(uuid, numeric, text),
  public.counter_offer(uuid, numeric, text),
  public.public_shelf(uuid),
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
      alter publication supabase_realtime add table public.listings, public.offers, public.players, public.inventory, public.race_challenges, public.part_inventory, public.car_upgrades;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
