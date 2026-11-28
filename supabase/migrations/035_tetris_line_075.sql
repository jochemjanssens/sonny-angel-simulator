-- Endless Tetris pays €0.75 per line (was €0.25). Run once in the Supabase SQL editor.

alter table public.game_config alter column tetris_line set default 0.75;
update public.game_config set tetris_line = 0.75;
