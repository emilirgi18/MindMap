-- =============================================================================
-- Invite redemption approves the redeemer (ADR-002)
-- =============================================================================
-- redeem_invite required is_approved(), but the invite flow is meant to
-- approve new users on redemption — so brand-new invitees always hit
-- "Account not approved" before the page could approve them. Approval now
-- happens inside the function, in the same transaction as the redemption.
--
-- Runs as the function owner (security definer), so the
-- profiles_guard_privileged_columns trigger from 000010 allows it.
-- =============================================================================

create or replace function public.redeem_invite(p_token uuid)
returns uuid  -- returns workspace_id on success
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite    public.invites%rowtype;
  v_ws_type   text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the invite row to prevent double-redemption under concurrent requests
  select * into v_invite
  from public.invites
  where token    = p_token
    and used_at  is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invite token';
  end if;

  select type into v_ws_type
  from public.workspaces
  where id = v_invite.workspace_id;

  if v_ws_type <> 'campaign' then
    raise exception 'Invite target is not a campaign workspace';
  end if;

  -- An explicit invite is sufficient approval
  update public.profiles
  set approved = true
  where id = auth.uid()
    and not approved;

  -- Add user as player; silently ignore if already a member
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, auth.uid(), 'player')
  on conflict (workspace_id, user_id) do nothing;

  update public.invites
  set used_at = now()
  where id = v_invite.id;

  return v_invite.workspace_id;
end;
$$;
