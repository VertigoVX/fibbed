-- Fibbed: three rounds a day.
-- results.picks now holds every pick of the day (up to 3 rounds x 4 statements);
-- caught means a perfect day; fibs_caught and reader_caught are new.

alter table public.results drop constraint if exists results_picks_check;
alter table public.results add constraint results_picks_check check (cardinality(picks) between 1 and 12);

alter table public.results add column if not exists fibs_caught smallint check (fibs_caught between 0 and 3);
alter table public.results add column if not exists reader_caught boolean;

-- The return shape changes, so the old function has to go first.
drop function if exists public.puzzle_stats(integer);

create function public.puzzle_stats(n integer)
returns table (players bigint, perfect bigint, reader_fooled bigint)
language sql stable security definer set search_path = public as $$
  select count(*)::bigint,
         count(*) filter (where r.caught)::bigint,
         count(*) filter (where r.reader_caught = false)::bigint
  from public.results r where r.puzzle_number = n;
$$;

revoke all on function public.puzzle_stats(integer) from public;
grant execute on function public.puzzle_stats(integer) to anon, authenticated;
