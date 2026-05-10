-- Folders for grouping notes within a workspace
create table public.folders (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name         text not null default 'New folder',
  created_at   timestamptz not null default now()
);

create index idx_folders_workspace on public.folders(workspace_id);

alter table public.folders enable row level security;

-- Add folder assignment to notes
alter table public.notes
  add column folder_id uuid references public.folders(id) on delete set null;

-- RLS -------------------------------------------------------------------------

create policy "folders: members select"
  on public.folders for select
  using (
    public.is_approved()
    and public.is_workspace_member(workspace_id)
  );

create policy "folders: owner/dm insert"
  on public.folders for insert
  with check (
    public.is_approved()
    and public.workspace_role(workspace_id) in ('owner', 'dm')
  );

create policy "folders: owner/dm update"
  on public.folders for update
  using (
    public.is_approved()
    and public.workspace_role(workspace_id) in ('owner', 'dm')
  );

create policy "folders: owner/dm delete"
  on public.folders for delete
  using (
    public.is_approved()
    and public.workspace_role(workspace_id) in ('owner', 'dm')
  );
