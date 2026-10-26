# Vercel migration checkpoint

Updated: 26 October 2026. Status: preparation only; not deployed.

## Safety baseline

- Isolated checkout on `codex/vercel-migration`, based on `33f0c72c0e876531ce80f8823c90398777b1c6e7`.
- GitHub destination: `https://github.com/MKMATHEPE/chillPipeRentApp`, branch `codex/vercel-migration`. Do not publish this migration through the Sites helper or overwrite `main`.
- Original site remains unchanged and authoritative until cutover is approved.
- Preserve visual design, pricing, account ownership, rental rules and booking references.
- Do not provision paid resources without explicit approval.

## Verified blockers

- Vercel team: `team_xTw0PEqeoa8EUcpPrWwPGBCo` (`mkmathepes-projects`).
- Creating `the-chill-pipe` through the connected Vercel account returned HTTP 403: permission to create project denied. No project was created. No local Vercel CLI installation/authentication was found for fallback.
- Existing Supabase identity project `ewnvndainmnludajyyvm` (The Chill Pipe App): user approved restoration, restore request succeeded on 26 October 2026, latest status `COMING_UP`. Healthy status and login verification are still pending. Do not substitute a new identity project: existing user IDs must be retained.
- Database connection and private server environment values are not available in this isolated checkout. Never copy them into tracked files or chat.

## Source dependencies requiring migration

- Vinext/Vite/Cloudflare build pipeline must be replaced or adapted to a verified Vercel-supported runtime.
- `db/index.ts` uses a Cloudflare D1 binding, not Supabase Postgres.
- Admin auth, recovery and customer-management configuration import `cloudflare:workers`.
- SQL includes SQLite placeholders, JSON functions and epoch conversion. A Postgres move requires explicit query/schema conversion, not simply swapping the connection string.
- Approval/inventory concurrency must retain atomic capacity checks. Postgres concurrency differs from SQLite write serialization; cover simultaneous approvals and stock updates with database-backed tests.

## Data plan (no export/import performed yet)

Verified source tables in Sites binding DB:
`bookings`, `equipment`, `customer_profiles`, `managed_customers`,
`admin_sessions`, `customer_sessions`, `admin_login_limits`, `delivery_quotes`.

Preserve durable records, historical totals, JSON order/review/activity contents, ownership IDs, timestamps and versions. Keep credentials and tokens out of export logs and source control. Prefer new login sessions at the new hostname rather than copying live session tokens. Temporary quotes should be recalculated, not treated as durable prices.

Choose and provision the destination only after existing project availability and access are verified. Export through supported database access; verify pagination and complete, non-truncated cell contents. Compare row counts, references, ownership, inventory and monetary totals before cutover. Keep source writes authoritative; arrange a final write freeze/delta reconciliation rather than letting two independent databases diverge.

## Acceptance gates

1. Project creation/link permissions and secrets configured securely.
2. Isolated staging database with privacy restrictions; never expose customer/session tables through a public data API.
3. Vercel-compatible build and schema/query conversion.
4. Local and staging tests: login/reset/renewal/logout, account isolation, checkout, quotes, duplicate submission, approval/payment/handover/return/completion, expired requests, inventory concurrency, reports and reviews.
5. Responsive visual checks against original screens; no design changes.
6. Restore/import verification and final data reconciliation.
7. Verify Supabase callback/reset URLs for the new hostname, production secrets and access policy.
8. User accepts preview; only then switch customer traffic. Keep old site available as rollback and avoid new writes to both copies.

Next external steps: resolve Vercel project-creation permission and confirm the restored Supabase project becomes healthy. No hosting migration, schema changes or live data migration have been performed.
