-- Fibbed: community fibs and anonymous results.
-- Players are anonymous; each device sends a random client_id.

create table public.fibs (
  id            uuid primary key default gen_random_uuid(),
  puzzle_number integer not null check (puzzle_number > 0),
  text          text not null check (char_length(text) between 20 and 140),
  author        text check (author is null or char_length(author) between 1 and 24),
  client_id     uuid not null,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  featured      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (puzzle_number, client_id)
);

-- At most one featured fib per puzzle, and only an approved one.
create unique index fibs_one_featured on public.fibs (puzzle_number) where featured;
alter table public.fibs add constraint fibs_featured_is_approved check (not featured or status = 'approved');

create table public.results (
  puzzle_number integer not null check (puzzle_number > 0),
  client_id     uuid not null,
  picks         text[] not null check (cardinality(picks) between 1 and 5),
  caught        boolean not null,
  created_at    timestamptz not null default now(),
  primary key (puzzle_number, client_id)
);

alter table public.fibs enable row level security;
alter table public.results enable row level security;

-- Anyone may send a fib, but only as pending and unfeatured. Nobody can read fibs directly.
create policy "send a pending fib" on public.fibs
  for insert to anon, authenticated
  with check (status = 'pending' and featured = false);

-- Anyone may record one result per puzzle. Results are never readable row by row.
create policy "record a result" on public.results
  for insert to anon, authenticated
  with check (true);

-- Aggregates only.
create or replace function public.puzzle_stats(n integer)
returns table (players bigint, caught bigint)
language sql stable security definer set search_path = public as $$
  select count(*)::bigint, count(*) filter (where r.caught)::bigint
  from public.results r where r.puzzle_number = n;
$$;

-- The featured fib for a day, revealed only once that day has started somewhere on Earth
-- (UTC+14), so tomorrow's fib cannot be read early.
create or replace function public.featured_fib(n integer)
returns table (text text, author text)
language sql stable security definer set search_path = public as $$
  select f.text, f.author from public.fibs f
  where f.puzzle_number = n and f.featured
    and (date '2026-11-02' + (n - 1)) <= (now() at time zone 'Etc/GMT-14')::date
  limit 1;
$$;

revoke all on function public.puzzle_stats(integer) from public;
revoke all on function public.featured_fib(integer) from public;
grant execute on function public.puzzle_stats(integer) to anon, authenticated;
grant execute on function public.featured_fib(integer) to anon, authenticated;

-- Moderation helper for the project owner (run in the SQL editor):
--   select feature_fib('<fib id>');
create or replace function public.feature_fib(fib_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select puzzle_number into n from public.fibs where id = fib_id;
  update public.fibs set featured = false where puzzle_number = n and featured;
  update public.fibs set status = 'approved', featured = true where id = fib_id;
end;
$$;
revoke all on function public.feature_fib(uuid) from public, anon, authenticated;
