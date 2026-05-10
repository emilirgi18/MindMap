-- The insert policy capped expires_at at 48 hours but the app creates 7-day invites.
-- Widen the window to 8 days so the check passes with some clock-skew margin.

drop policy if exists "invites: owner/dm insert" on public.invites;

create policy "invites: owner/dm insert"
  on public.invites for insert
  with check (
    public.is_approved()
    and public.workspace_role(workspace_id) in ('owner', 'dm')
    and created_by = auth.uid()
    and expires_at <= now() + interval '8 days'
  );
