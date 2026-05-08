-- =============================================================================
-- Fix: campaign workspace owner bootstrap
-- =============================================================================
-- Problem: the initial RLS policy for workspace_members INSERT requires the
-- caller to already be a member (workspace_role() returns null otherwise).
-- Personal workspaces are created atomically by a security-definer trigger,
-- so they never hit this. Campaign workspaces created client-side do.
--
-- Solution A: a targeted "owner self-bootstrap" policy so an owner can add
--             their own row immediately after creating the workspace.
-- Solution B: a security-definer RPC that does both inserts in one call.
--             This is what the app actually calls — Solution A is a safety net.
-- =============================================================================

-- A: Allow the workspace owner to bootstrap their own 'owner' membership
create policy "workspace_members: owner self-bootstrap"
  on public.workspace_members for insert
  with check (
    public.is_approved()
    and user_id       = auth.uid()
    and role          = 'owner'
    and (select owner_id from public.workspaces where id = workspace_id) = auth.uid()
  );

-- B: Atomic RPC — inserts workspace + owner membership in one transaction
create or replace function public.create_campaign_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_approved() then
    raise exception 'Account not approved';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'Workspace name cannot be empty';
  end if;

  insert into public.workspaces (owner_id, type, name)
  values (auth.uid(), 'campaign', trim(p_name))
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, auth.uid(), 'owner');

  return v_workspace_id;
end;
$$;
