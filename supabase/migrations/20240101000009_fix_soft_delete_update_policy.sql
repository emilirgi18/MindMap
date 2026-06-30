-- Fix: the live "notes: member update" policy somehow ended up requiring
-- `deleted_at is null` in its WITH CHECK clause (never present in any
-- migration file — likely a hand-edit in the SQL editor that was never
-- captured). WITH CHECK runs against the NEW row, so requiring deleted_at
-- to stay null makes it structurally impossible to ever soft-delete a note
-- via this policy alone.
--
-- This restates the policy to match its original (correct) definition from
-- 20240101000000_initial.sql, with no deleted_at restriction on update.
--
-- Note: this alone does not make soft-delete work end-to-end. Postgres also
-- re-checks the table's SELECT policy against the row produced by an
-- UPDATE's implicit RETURNING (which PostgREST always uses), and the
-- select policies require deleted_at is null — so a row that's just been
-- soft-deleted will always fail its own select policy on RETURNING. The
-- application works around this by performing soft-deletes via the
-- service-role client (see src/lib/actions/notes.ts / folders.ts), which
-- bypasses RLS entirely after the app's own authorization checks pass.

drop policy if exists "notes: member update" on public.notes;
create policy "notes: member update"
  on public.notes for update
  using (
    public.is_approved()
    and public.is_workspace_member(workspace_id)
    and (
      not dm_only
      or public.workspace_role(workspace_id) in ('owner', 'dm')
    )
  )
  with check (
    public.is_workspace_member(workspace_id)
    and (
      not dm_only
      or public.workspace_role(workspace_id) in ('owner', 'dm')
    )
  );
