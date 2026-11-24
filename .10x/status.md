# Status

**Phase:** security-hardening: Implementation complete, awaiting migration apply + manual verification (2026-11-24)
**Last code activity:** 2026-06-30 (`3b59898 hotfix`)

## Open findings (awaiting user confirmation)
See `.10x/reviews/2026-11-24-discovery-review.md`.
- ~~[CRITICAL] Users can self-approve via `profiles: own update` policy~~ fixed (ADR-001, not yet applied)
- ~~[CRITICAL] Any approved user can list every pending invite token~~ fixed (ADR-001, not yet applied)
- ~~[HIGH] Collab broadcast channels are public: DM-only note edits leak~~ fixed (ADR-001, not yet applied)
- ~~[HIGH] Invite flow for brand-new (unapproved) users looks broken~~ fixed (ADR-002, not yet applied)
- [HIGH] Yjs has no initial-sync handshake, so last-writer-wins snapshots can drop edits
- [MED] Images use getPublicUrl on a private bucket
- [MED] Live DB has drifted from migrations (see migration 000009 comment)
- [MED] No tests, no CI

## Blockers
Ready to ship (2026-11-24). `db push --dry-run` confirms only 000010 and 000011 are pending (000009 is already live). Full `next build` passes.
Remaining: the user runs `supabase db push`, then `git push origin main`. Vercel then deploys the June work plus the security fixes. Manual checks are in the handoff.
