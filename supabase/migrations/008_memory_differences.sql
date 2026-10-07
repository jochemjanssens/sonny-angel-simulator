-- Allows the Memory and Spot the difference puzzles to pay out.
-- Run once in the Supabase SQL editor.

alter table public.puzzle_sessions drop constraint if exists puzzle_sessions_kind_check;
alter table public.puzzle_sessions add constraint puzzle_sessions_kind_check
  check (kind in ('wordsearch', 'swedish', 'binary', 'memory', 'differences'));
