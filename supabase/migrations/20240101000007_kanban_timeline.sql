-- =============================================================================
-- Kanban columns + timeline positioning
-- =============================================================================

-- kanban_columns --------------------------------------------------------------
create table public.kanban_columns (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references public.workspaces(id) on delete cascade,
  name          text        not null,
  position      int         not null default 0,
  color         text,
  created_at    timestamptz not null default now()
);

create index idx_kanban_columns_workspace_id on public.kanban_columns(workspace_id);

alter table public.kanban_columns enable row level security;

create policy "kanban_columns: member select"
  on public.kanban_columns for select
  using (public.is_approved() and public.is_workspace_member(workspace_id));

create policy "kanban_columns: member insert"
  on public.kanban_columns for insert
  with check (public.is_approved() and public.is_workspace_member(workspace_id));

create policy "kanban_columns: member update"
  on public.kanban_columns for update
  using (public.is_approved() and public.is_workspace_member(workspace_id));

create policy "kanban_columns: member delete"
  on public.kanban_columns for delete
  using (public.is_approved() and public.is_workspace_member(workspace_id));


-- Add kanban + timeline fields to notes --------------------------------------
alter table public.notes
  add column if not exists kanban_column_id  uuid references public.kanban_columns(id) on delete set null,
  add column if not exists kanban_position   int,
  add column if not exists timeline_position int;

create index idx_notes_kanban_column on public.notes(kanban_column_id)
  where kanban_column_id is not null;

create index idx_notes_timeline on public.notes(workspace_id, timeline_position)
  where timeline_position is not null;
