# Architect: mindmap-core [DISCOVERED]
- Server Components fetch via the Supabase SSR client. Mutations go through server actions in `src/lib/actions/*`.
- Authorization lives mainly in Postgres RLS plus security-definer helpers (`is_approved`, `is_workspace_member`, `workspace_role`).
- The service-role client is used for soft-deletes and invite auto-approval, after app-level checks.
- Middleware: session refresh → approval gate → `/admin` gate via `ADMIN_USER_ID`.
- Realtime collaboration: a custom `SupabaseProvider` relays Yjs updates and awareness over Realtime **broadcast** (`collab:<noteId>`).
  Persistence: each client debounces (2s) and writes the full `yjs_state` plus a Markdown `body` to `notes`.
- Views: note editor (wikilinks → `note_links`), tags, nested folders (soft delete), kanban (`kanban_columns`), timeline, force graph.
