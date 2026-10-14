-- Times table champion pays 8, 10 or 12 cents per point.
-- Run once in the Supabase SQL editor.

alter table public.game_config alter column tables_small set default 0.08;
alter table public.game_config alter column tables_medium set default 0.10;
alter table public.game_config alter column tables_large set default 0.12;
update public.game_config set tables_small = 0.08, tables_medium = 0.10, tables_large = 0.12;
