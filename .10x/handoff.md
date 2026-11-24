# Handoff

**From:** SDE (security-hardening) → **To:** QA / user

ADR-001 (review items 1–3) and ADR-002 (item 4) are implemented. To ship:
1. Apply migrations `20240101000010_security_hardening.sql` and `20240101000011_redeem_invite_approves.sql`, in that order (`supabase db push`, or paste them into the SQL editor).
2. Deploy the app.
3. Manual checks:
   - From the browser console as a normal user, `update profiles set approved=true` should fail.
   - As a player, `select * from invites` should return nothing. Opening an invite link should still show the right state.
   - A brand-new account opening an invite link should land in the campaign, not on `/pending`.
   - Two users editing the same note should still sync. A player should not receive updates on a DM-only note's channel.

Next candidates: item 6 (Yjs sync handshake), RLS tests + CI.
