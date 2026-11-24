# SDE: security-hardening

Built:
- `supabase/migrations/20240101000010_security_hardening.sql`
- `SupabaseProvider`: `private: true`, and awaits `realtime.setAuth()` before subscribing (guarded against destroy-before-connect)
- Invite page: `rpc('get_invite')` instead of reading `invites` directly
- `database.types.ts`: added `get_invite` and `can_access_collab_topic`

Verified: `tsc --noEmit` is clean.
NOT verified: the SQL hasn't been run against any database (no Supabase CLI or psql on this machine). Nothing tested end-to-end.

Deploy order: **migration first, then the app.** The new code needs `get_invite` and the realtime policies. The old app keeps working after the migration, except players lose sight of pending invites.
