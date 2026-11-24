# ADR-002: Invite redemption approves the redeemer

**Status:** Accepted
**Date:** 2026-11-24
**Feature:** security-hardening
**Author:** 10x-Team (Architect + Security)

## Context
The intended design was that an invited user doesn't need manual admin approval. But `redeem_invite` raised "Account not approved" for unapproved callers, so the invite page's service-role auto-approve line never ran. New invitees were stuck on `/pending`.

## Decision
Drop the `is_approved()` check in `redeem_invite`. Set `profiles.approved = true` inside the function, in the same transaction as the membership insert and `used_at` update. Remove the service-role approval from the invite page.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Approve via service role in the page *before* redeeming | No SQL change | Approves before the token is validated and locked, so a race could approve with a token that fails redemption. Two non-atomic writes | Approval should depend on a successful redemption |
| Keep manual approval for invitees | Admin sees everyone | Contradicts the product intent. Every invite needs an admin step | Not what the app was built for |

## Consequences
- **Positive:** One atomic operation. No service-role key needed on the invite page.
- **Negative:** Anyone holding a valid, unused, unexpired invite token becomes approved. Tokens are single-use, last at most 8 days, and since ADR-001 can only be read by owner/DM.
- **Risk:** A leaked invite link approves a stranger. Mitigation: owners/DMs can delete pending invites, and the admin can un-approve users.
