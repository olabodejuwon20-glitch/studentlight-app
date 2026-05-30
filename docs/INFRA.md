# Legacyskool Infrastructure & Data Protection

## Hosting
- Frontend: Vite + React, deployed on a global CDN.
- Backend: Lovable Cloud (managed Postgres + edge functions + storage).

## Backups
- **Automated daily backups** of the Postgres database, handled by the managed cloud provider.
- **Point-in-time recovery (PITR)** available for the last 7 days.
- **RPO**: ≤ 24 hours (daily snapshot) and ≤ 5 minutes within the PITR window.
- **RTO**: ≤ 4 hours for full database restore.

## Security
- All traffic served over HTTPS (TLS 1.2+).
- Database encrypted at rest (AES-256).
- Every public table is protected by **row-level security (RLS)** policies scoped by school + role.
- Roles are stored in a dedicated `user_roles` table (never on the profile row) and checked via the `has_role()` security-definer function — see `mem://` security memory.
- Storage buckets are private by default; `school-logos` and `avatars` are public read.
- Payment proofs live in a private `payment-proofs` bucket and are only visible to school admins.

## Monitoring
- Auth events recorded in the `auth_events` table.
- Page views recorded in `page_views` for product analytics.
- Edge-function logs available via the Lovable Cloud dashboard.

## Data deletion
- A verified school admin can request full data deletion at `support@legacyskool.com`.
- We action deletions within 30 days; a confirmation email is sent on completion.