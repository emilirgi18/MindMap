# Security: security-hardening

See ADR-001. Closes discovery review items 1–3.

| # | Issue | Fix | Where |
|---|---|---|---|
| 1 | Users could self-approve via `profiles` UPDATE | Column grant `UPDATE (full_name)` only, plus a trigger that blocks `approved`/`email` changes from API roles | migration 000010 §1 |
| 2 | Any approved user could list all pending invite tokens | Dropped `invites: approved read pending`. Added `get_invite(p_token)` RPC | migration 000010 §2, `src/app/invite/[token]/page.tsx` |
| 3 | `collab:<noteId>` channels were public | Private channels plus `realtime.messages` RLS via `can_access_collab_topic` | migration 000010 §3, `src/lib/yjs/SupabaseProvider.ts` |

## Still open
- Item 4: `redeem_invite` still requires approval, so new invitees see "Account not approved".
- Public `workspace-sync-*` channels only carry empty `refresh` pings (postgres_changes is RLS-filtered). Making them private would let "Allow public access" be turned off project-wide.
- SVG uploads, and `note_links` revealing that DM-only notes exist.
