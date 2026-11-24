# Handoff

**From:** SDE (security-hardening) → **To:** QA / user

ADR-001 is implemented (review items 1–3). To ship:
1. Apply `supabase/migrations/20240101000010_security_hardening.sql` (`supabase db push`, or paste it into the SQL editor).
2. Deploy the app.
3. Manual checks:
   - From the browser console as a normal user, `update profiles set approved=true` should fail.
   - As a player, `select * from invites` should return nothing. Opening an invite link should still show the right state.
   - Two users editing the same note should still sync. A player should not receive updates on a DM-only note's channel.

Next candidates: review item 4 (invite flow for new users), item 6 (Yjs sync handshake), RLS tests + CI.
