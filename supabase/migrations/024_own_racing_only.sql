-- Turbo Minis: only drive-yourself racing (time trials) stays. Races against
-- the computer and challenges between players are switched off; any challenge
-- that was still open gets its car (and money stake) back to the challenger.
-- Run once in the Supabase SQL editor.

do $$
declare ch record;
begin
  for ch in select * from public.race_challenges where status = 'open' for update loop
    update public.race_challenges set status = 'cancelled', finished_at = now() where id = ch.id;
    perform public._give(ch.challenger_id, ch.challenger_car);
    if ch.stake_kind = 'money' then
      update public.players set wallet = wallet + ch.stake_amount where id = ch.challenger_id;
    end if;
  end loop;
end $$;

revoke execute on function public.race_cpu(text, text), public.create_race_challenge(text, text, text, numeric),
  public.cancel_race_challenge(uuid), public.accept_race_challenge(uuid, text) from public, anon, authenticated;

notify pgrst, 'reload schema';
