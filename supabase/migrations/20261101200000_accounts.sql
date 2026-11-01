-- Fibbed: player accounts and today's score spread.
-- Players may sign in (emailed link) to keep their streak and history on every device.
-- A result is tied to the signed-in account automatically; anonymous play still works.

alter table public.results
  add column if not exists user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  add column if not exists cleared smallint check (cleared between 0 and 9);

-- One result per account per day, whichever device it was played on.
create unique index if not exists results_one_per_user_day on public.results (puzzle_number, user_id) where user_id is not null;

-- Results may only be filed anonymously or under your own account.
drop policy if exists "record a result" on public.results;
create policy "record a result" on public.results
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Signed-in players can read their own history, and nothing else.
create policy "read my results" on public.results
  for select to authenticated
  using (user_id = auth.uid());

-- On sign-in: bring this device's anonymous results into the account,
-- skipping any day the account already has a result for.
create or replace function public.claim_device_results(device uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); moved integer;
begin
  if me is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  update public.results r set user_id = me
   where r.client_id = device and r.user_id is null
     and not exists (select 1 from public.results x where x.user_id = me and x.puzzle_number = r.puzzle_number);
  get diagnostics moved = row_count;
  return moved;
end;
$$;

-- How many players got each score today. Score = truths cleared + fibs caught (0 to 12).
create or replace function public.score_counts(n integer)
returns table (score integer, players bigint)
language sql stable security definer set search_path = public as $$
  select (r.cleared + r.fibs_caught)::integer as score, count(*)::bigint
  from public.results r
  where r.puzzle_number = n and r.cleared is not null and r.fibs_caught is not null
  group by 1;
$$;

revoke all on function public.claim_device_results(uuid) from public, anon;
grant execute on function public.claim_device_results(uuid) to authenticated;
revoke all on function public.score_counts(integer) from public;
grant execute on function public.score_counts(integer) to anon, authenticated;
