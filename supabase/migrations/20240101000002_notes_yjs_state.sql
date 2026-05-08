-- Add a column to persist the Yjs document state between sessions.
-- Stored as a base64-encoded Y.encodeStateAsUpdate() snapshot.
-- The `body` text column remains the canonical Markdown representation
-- (written on every snapshot flush alongside yjs_state).
alter table public.notes
  add column yjs_state text;

comment on column public.notes.yjs_state is
  'Base64-encoded Yjs state vector snapshot. Null for notes that have never been collaboratively edited.';
