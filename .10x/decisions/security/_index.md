# Security: index
- Approval is admin-only. Every user-writable column must be granted explicitly; RLS alone doesn't restrict columns.
- Realtime broadcast channels that carry content must be private and use `realtime.messages` RLS.
- Active: [security-hardening](security-hardening.md)
