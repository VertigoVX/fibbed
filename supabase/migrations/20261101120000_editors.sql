-- Fibbed: editors who moderate fibs from moderate.html.
-- Add an editor: create the user under Authentication > Users, then run
--   insert into public.editors (user_id) select id from auth.users where email = 'you@example.com';

create table public.editors (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.editors enable row level security;

-- Editors can see their own row; nobody can add or remove editors through the API.
create policy "editors see themselves" on public.editors
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_editor()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editors where user_id = auth.uid());
$$;

-- Passes for editors, and for the SQL editor or a service connection (no JWT at all).
-- Anyone else who reaches it (a signed-in non-editor) is refused.
create or replace function public.require_editor()
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if public.is_editor() then
    return;
  end if;
  if nullif(current_setting('request.jwt.claims', true), '') is null
     and nullif(current_setting('request.jwt.claim.sub', true), '') is null then
    return;
  end if;
  raise exception 'not an editor' using errcode = '42501';
end;
$$;

-- Editors read every fib. Players still read none.
create policy "editors read fibs" on public.fibs
  for select to authenticated
  using (public.is_editor());

-- Run a fib on its day, replacing any other.
create or replace function public.feature_fib(fib_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform public.require_editor();
  select puzzle_number into n from public.fibs where id = fib_id;
  if n is null then
    raise exception 'no such fib';
  end if;
  update public.fibs set featured = false where puzzle_number = n and featured;
  update public.fibs set status = 'approved', featured = true where id = fib_id;
end;
$$;

-- Approve, reject or return a fib to pending. Anything not approved comes off the paper.
create or replace function public.set_fib_status(fib_id uuid, new_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_editor();
  if new_status not in ('pending', 'approved', 'rejected') then
    raise exception 'unknown status %', new_status;
  end if;
  update public.fibs
     set status = new_status, featured = featured and new_status = 'approved'
   where id = fib_id;
end;
$$;

-- Go back to the house fib for a day.
create or replace function public.use_house_fib(n integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_editor();
  update public.fibs set featured = false where puzzle_number = n and featured;
end;
$$;

-- Pending and total fibs per day, for the editor's day list.
create or replace function public.fib_counts()
returns table (puzzle_number integer, pending bigint, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_editor();
  return query
    select f.puzzle_number, count(*) filter (where f.status = 'pending'), count(*)
    from public.fibs f group by f.puzzle_number;
end;
$$;

revoke all on function public.is_editor() from public;
revoke all on function public.require_editor() from public, anon, authenticated;
revoke all on function public.feature_fib(uuid) from public, anon;
revoke all on function public.set_fib_status(uuid, text) from public, anon;
revoke all on function public.use_house_fib(integer) from public, anon;
revoke all on function public.fib_counts() from public, anon;

grant execute on function public.is_editor() to anon, authenticated;
grant execute on function public.feature_fib(uuid) to authenticated;
grant execute on function public.set_fib_status(uuid, text) to authenticated;
grant execute on function public.use_house_fib(integer) to authenticated;
grant execute on function public.fib_counts() to authenticated;
