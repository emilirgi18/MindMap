# DBA: mindmap-core [DISCOVERED]
- 10 migrations (`supabase/migrations`). Tables: profiles, workspaces, workspace_members, notes, note_links, tags, invites, folders, kanban_columns.
- Soft delete on notes/folders via `deleted_at`. SELECT policies hide deleted rows, so updates go through service role.
- Migration 000009 notes that the live DB has policy edits not captured in migrations, so schema drift exists.
- No FK/trigger ensures `notes.kanban_column_id` / `folder_id` belong to the same workspace.
