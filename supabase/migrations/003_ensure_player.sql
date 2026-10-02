-- Fixes "Cannot coerce the result to a single JSON object" for accounts that
-- are missing their player rows, and lets the app repair this by itself.
-- Run once in the Supabase SQL editor.

-- 1. Restore missing rows for every existing account
insert into public.profiles (id)
  select id from auth.users
  on conflict do nothing;
insert into public.players (id, wallet)
  select u.id, c.starting_wallet from auth.users u cross join public.game_config c
  on conflict do nothing;

-- 2. Self-repair function the app calls on load
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

revoke execute on function public.ensure_player() from public, anon;
grant execute on function public.ensure_player() to authenticated;
