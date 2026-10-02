-- Adds the one-time €20 welcome bonus to an existing project.
-- Run once in the Supabase SQL editor (fresh projects get it from schema.sql).

alter table public.game_config add column if not exists welcome_bonus numeric(10, 2) not null default 20;
alter table public.players add column if not exists welcome_bonus boolean not null default false;

create or replace function public.claim_welcome_bonus() returns numeric
language plpgsql security definer set search_path = public as $$
declare bonus numeric := (select welcome_bonus from public.game_config);
begin
  update public.players set wallet = wallet + bonus, welcome_bonus = true
    where id = public._uid() and not welcome_bonus;
  return case when found then bonus end; -- null when it was already claimed
end $$;

revoke execute on function public.claim_welcome_bonus() from public, anon;
grant execute on function public.claim_welcome_bonus() to authenticated;
