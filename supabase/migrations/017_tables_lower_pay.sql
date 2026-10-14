-- Times table champion pays less per point: 10, 15 or 20 cents.
-- Run once in the Supabase SQL editor.

alter table public.game_config alter column tables_small set default 0.10;
alter table public.game_config alter column tables_medium set default 0.15;
alter table public.game_config alter column tables_large set default 0.20;
update public.game_config set tables_small = 0.10, tables_medium = 0.15, tables_large = 0.20;
