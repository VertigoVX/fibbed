-- Fibbed: AI-generated puzzle candidates, reviewed and approved by an editor.
-- Each draft holds three rounds as JSONB. The scheduled agent inserts via the
-- service role; editors approve or reject via the functions below.

create table public.puzzle_drafts (
  id             uuid primary key default gen_random_uuid(),
  -- 3 rounds: [{theme, level, truths:[{text,source_url,source_label}], fib:{text,explanation,source_url,source_label}}]
  rounds         jsonb not null,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  puzzle_number  integer unique,   -- set when approved; must be > 0
  generated_at   timestamptz not null default now(),
  notes          text
);

alter table public.puzzle_drafts enable row level security;

-- Players never see drafts. Editors can read all of them.
create policy "editors read drafts" on public.puzzle_drafts
  for select to authenticated
  using (public.is_editor());

-- Auto-assigns the next puzzle number (max approved + 1) and marks the draft approved.
-- Returns the assigned puzzle_number. Editors and service-role connections only.
create or replace function public.approve_draft(draft_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  next_n integer;
begin
  perform public.require_editor();
  select coalesce(max(puzzle_number), 0) + 1 into next_n
  from public.puzzle_drafts where status = 'approved';
  update public.puzzle_drafts
     set status = 'approved', puzzle_number = next_n
   where id = draft_id;
  return next_n;
end;
$$;

create or replace function public.reject_draft(draft_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_editor();
  update public.puzzle_drafts set status = 'rejected' where id = draft_id;
end;
$$;

-- Lets an editor fix wording before approving.
create or replace function public.update_draft_rounds(draft_id uuid, new_rounds jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_editor();
  update public.puzzle_drafts set rounds = new_rounds where id = draft_id;
end;
$$;

-- Returns the rounds JSONB for an approved puzzle, or null.
-- Date-gated the same way as featured_fib so tomorrow's content stays hidden.
create or replace function public.get_approved_puzzle(n integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select rounds from public.puzzle_drafts
  where puzzle_number = n and status = 'approved'
    and (date '2026-11-02' + (n - 1)) <= (now() at time zone 'Etc/GMT-14')::date
  limit 1;
$$;

revoke all on function public.approve_draft(uuid)          from public, anon, authenticated;
revoke all on function public.reject_draft(uuid)           from public, anon, authenticated;
revoke all on function public.update_draft_rounds(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.get_approved_puzzle(integer) from public;

grant execute on function public.approve_draft(uuid)          to authenticated;
grant execute on function public.reject_draft(uuid)           to authenticated;
grant execute on function public.update_draft_rounds(uuid, jsonb) to authenticated;
grant execute on function public.get_approved_puzzle(integer) to anon, authenticated;
