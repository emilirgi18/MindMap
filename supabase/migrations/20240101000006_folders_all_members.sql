-- Allow all workspace members (not just owner/dm) to manage folders

drop policy if exists "folders: owner/dm insert" on public.folders;
drop policy if exists "folders: owner/dm update" on public.folders;
drop policy if exists "folders: owner/dm delete" on public.folders;

create policy "folders: members insert"
  on public.folders for insert
  with check (
    public.is_approved()
    and public.is_workspace_member(workspace_id)
  );

create policy "folders: members update"
  on public.folders for update
  using (
    public.is_approved()
    and public.is_workspace_member(workspace_id)
  );

create policy "folders: members delete"
  on public.folders for delete
  using (
    public.is_approved()
    and public.is_workspace_member(workspace_id)
  );
