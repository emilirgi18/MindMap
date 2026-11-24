# Discovery review: 2026-11-24

## Security
1. **CRITICAL: self-approval.** `profiles: own update` (initial.sql) allows `update profiles set approved = true where id = auth.uid()` from the browser using the anon key. RLS does not restrict columns.
   Fix: `revoke update on profiles from authenticated; grant update (full_name) on profiles to authenticated;` or a trigger that blocks changes to `approved`.
2. **CRITICAL: invite enumeration.** `invites: approved read pending` returns *all* pending invites, tokens included, to any approved user. Combined with #1, anyone can sign up and join any campaign.
   Fix: drop the policy and add a security-definer `get_invite(p_token)` RPC.
3. **HIGH: public collab channels.** `supabase.channel('collab:<id>')` has no `private: true` and no `realtime.messages` RLS, so anyone with the anon key and a note id can read live edits, DM-only notes included.
4. **MED:** SVG uploads are allowed (`image/svg+xml`), which is a stored-XSS vector if the files are ever served inline. `note_links` only checks the source note, so links into DM-only notes reveal that those notes exist.

## Correctness
5. **HIGH: new-user invite flow.** `/invite/[token]` reads `invites` (RLS requires `is_approved()`) and calls `redeem_invite` (which also requires approval). A new unapproved user should therefore fail before the auto-approve line runs. Verify against the live DB, which may have drifted.
6. **HIGH: Yjs sync.** There is no state-vector handshake on join or reconnect, and `ack: false` with no retry. A client only gets updates broadcast *after* it subscribes, plus the last ≤2s-debounced snapshot. Every client (remote updates included) writes the full `yjs_state`, so the last writer wins and a stale client can overwrite others' edits.
   The `setContent(note.body)` fallback for notes without `yjs_state` runs on every client, which duplicates content when two people open a legacy note at the same time.
7. **MED:** `getPublicUrl` on the private `workspaces` bucket. Images will 400 unless the bucket was flipped public live (which would contradict the storage RLS).
8. **MED:** `y-protocols` is imported but not declared in package.json (it's transitive).

## Process
9. Schema drift between the live DB and migrations. Run `supabase db diff` to capture it.
10. No tests and no CI. An RLS test suite (pgTAP or supabase-js against a local stack) would have caught #1, #2 and #5.
