-- Nested folders: allow a folder to live inside another folder
alter table public.folders
  add column parent_id uuid references public.folders(id) on delete cascade;

-- Soft delete for notes (deletion sets this timestamp; hard rows are preserved)
alter table public.notes
  add column deleted_at timestamptz;

-- Soft delete for folders
alter table public.folders
  add column deleted_at timestamptz;

-- Update the notes select policy to exclude soft-deleted rows
drop policy if exists "notes: member select" on public.notes;
create policy "notes: member select"
  on public.notes for select
  using (
    public.is_approved()
    and public.is_workspace_member(workspace_id)
    and deleted_at is null
    and (
      not dm_only
      or public.workspace_role(workspace_id) in ('owner', 'dm')
    )
  );

-- Update the folders select policy to exclude soft-deleted rows
drop policy if exists "folders: members select" on public.folders;
create policy "folders: members select"
  on public.folders for select
  using (
    public.is_approved()
    and public.is_workspace_member(workspace_id)
    and deleted_at is null
  );
