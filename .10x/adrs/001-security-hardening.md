# ADR-001: Close self-approval, invite enumeration, and public collab channels

**Status:** Accepted
**Date:** 2026-11-24
**Feature:** security-hardening
**Author:** 10x-Team (Architect + Security)

## Context
The discovery review (`.10x/reviews/2026-11-24-discovery-review.md`, items 1–3) found three authorization gaps:
1. The `profiles: own update` RLS policy lets a user set `approved = true` on their own row. RLS cannot limit which columns change.
2. `invites: approved read pending` returns every pending invite, tokens included, to any approved user.
3. Yjs collaboration uses public Realtime broadcast channels (`collab:<noteId>`), so channel traffic isn't checked against note access. DM-only notes are included.

## Decision
One migration, `20240101000010_security_hardening.sql`:
1. **profiles:** revoke table-wide UPDATE from `anon`/`authenticated` and grant UPDATE on `(full_name)` only. A `BEFORE UPDATE` trigger also rejects `approved`/`email` changes made as `anon`/`authenticated`, as defense in depth in case grants are reset. The service role and security-definer functions are unaffected.
2. **invites:** drop the broad SELECT policy. Add a security-definer RPC `get_invite(p_token)` that returns the one invite matching the token. Owner/DM SELECT on their own workspace's invites is unchanged.
3. **collab channels:** clients join `collab:<noteId>` as **private** channels. RLS on `realtime.messages` (select = receive, insert = send) uses `can_access_collab_topic(topic)`, which mirrors the notes SELECT policy (member, not soft-deleted, DM-only → owner/dm).

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Move `approved` to a separate admin-only table | Clean separation | Touches middleware, `is_approved`, admin pages, types | Larger change for the same guarantee |
| Trigger only (no column grant) | One mechanism | Users could still change `email` | Column grant is the standard Postgres tool; the trigger is backup |
| Keep invite SELECT policy but require `token = <header>` | No RPC | PostgREST can't pass the token into the policy cleanly | RPC is simpler and explicit |
| Switch collab to a separate y-websocket server with auth | Proper Yjs sync protocol too | New infrastructure to run | Out of scope. Revisit with review item 6 |

## Consequences
### Positive
- Approval is admin-only again. Invite tokens are only readable by owner/DM or by someone who already holds the token. Live edits only reach people who can read the note.

### Negative
- Private channels need a valid JWT when joining. The provider now awaits `realtime.setAuth()` before subscribing, which adds a small delay.
- Players no longer see pending invites on the members page (they could before only because of the leaky policy).

### Risks
- **Public and private channels with the same topic are separate in Supabase Realtime.** Old clients still on public `collab:*` channels won't sync with updated clients until they reload. Turning off "Allow public access" under Realtime settings closes public channels entirely, but `workspace-sync-*` channels would then also need to become private. That's tracked as a follow-up.
- The live DB has drifted from the migrations. The migration uses `drop policy if exists` / `create or replace`, so it applies cleanly either way.

## Dependencies
- Supabase Realtime Authorization (private channels + `realtime.messages` RLS).
- Constrains review item 4 (invite flow for unapproved users): `get_invite` already works for unapproved users, so only `redeem_invite` needs changing.
