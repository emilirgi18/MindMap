-- =============================================================================
-- Security hardening (ADR-001)
-- =============================================================================
--   1. profiles: users can no longer set their own `approved` flag
--   2. invites:  approved users can no longer list every pending invite token
--   3. realtime: collab:<noteId> broadcast channels are authorized per note
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. profiles — column-level update + trigger guard
-- ---------------------------------------------------------------------------
-- RLS restricts rows, not columns. The "profiles: own update" policy let a
-- user run `update profiles set approved = true where id = auth.uid()`.

revoke update on public.profiles from anon, authenticated;
grant  update (full_name) on public.profiles to authenticated;

-- Defense in depth: if grants are ever reset, still refuse changes to
-- privileged columns from API roles. Service role and security-definer
-- functions (running as the table owner) are unaffected.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (new.approved is distinct from old.approved
          or new.email is distinct from old.email) then
    raise exception 'profiles.approved and profiles.email cannot be changed by users';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();


-- ---------------------------------------------------------------------------
-- 2. invites — replace the "read any pending invite" policy with a token RPC
-- ---------------------------------------------------------------------------
-- The old policy returned every pending invite (token included) to any
-- approved user. Owner/dm keep their own-workspace select policy; everyone
-- else looks up a single invite by the token they already hold.

drop policy if exists "invites: approved read pending" on public.invites;

create or replace function public.get_invite(p_token uuid)
returns table (workspace_id uuid, expires_at timestamptz, used_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select i.workspace_id, i.expires_at, i.used_at
  from public.invites i
  where i.token = p_token
    and auth.uid() is not null;
$$;

revoke execute on function public.get_invite(uuid) from public, anon;
grant  execute on function public.get_invite(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 3. realtime — authorize private collab:<noteId> channels
-- ---------------------------------------------------------------------------
-- Mirrors the "notes: member select" policy. Takes the raw topic so a
-- malformed id returns false instead of raising a cast error.

create or replace function public.can_access_collab_topic(p_topic text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_note_id text := substr(p_topic, length('collab:') + 1);
begin
  if p_topic not like 'collab:%'
     or v_note_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  return exists (
    select 1
    from public.notes n
    where n.id = v_note_id::uuid
      and n.deleted_at is null
      and public.is_approved()
      and public.is_workspace_member(n.workspace_id)
      and (not n.dm_only or public.workspace_role(n.workspace_id) in ('owner', 'dm'))
  );
end;
$$;

revoke execute on function public.can_access_collab_topic(text) from public, anon;
grant  execute on function public.can_access_collab_topic(text) to authenticated;

-- select = receive broadcasts, insert = send broadcasts
drop policy if exists "collab: note access receive" on realtime.messages;
create policy "collab: note access receive"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and public.can_access_collab_topic(realtime.topic())
  );

drop policy if exists "collab: note access send" on realtime.messages;
create policy "collab: note access send"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and public.can_access_collab_topic(realtime.topic())
  );
