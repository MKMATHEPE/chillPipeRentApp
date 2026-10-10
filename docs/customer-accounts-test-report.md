# Customer accounts: no-cost local verification

## Follow-up: baseline type errors resolved (2026-10-10)
The unpublished account milestone was backed up to GitHub branch `codex/customer-accounts-local-validation` at `084aaa6`. The subsequent local type-only fix adds explicit response types in the payment page and declares the optional Cloudflare D1 `DB` binding. The existing database-unavailable guard remains unchanged. `npx tsc --noEmit` now exits 0. The original report below is retained as historical evidence; its five-error blocker is resolved. No UI, pricing, payment processing, authentication settings or deployment changed.

Date: 2026-10-10. Unpublished working tree based on b1c9e0d.

## Scope and safety
Six Node test suites execute against isolated data, with fake identity/mapping providers where applicable. The customer and booking suites invoke real route handlers against in-memory SQLite populated from the migration files. They do not prove live SMTP, live Supabase configuration or production database concurrency. No live bookings, accounts, passwords, settings or sharing permissions changed. No deployment or GitHub push performed.

## Results
| Scenario / suite | Expected | Actual | Result |
| --- | --- | --- | --- |
| Customer auth | Reject unverified/unsigned users; secure sessions; correct confirmation destination | Assertions passed | PASS |
| Customer ownership | Same-phone accounts cannot see one another's bookings or update another profile | Assertions passed; legacy records not auto-claimed | PASS |
| Recovery and failures | Reject invalid/replayed reset, isolate admin, revoke logout/expired session, rate-limit attempts, fail closed on provider outage | Assertions passed with fake provider | PASS |
| Device state (new suite) | Preserve rental during first/same-account login; clear customer data on account switch/logout; preserve admin/unrelated storage | Assertions passed | PASS |
| Redirect/storage edge cases | Reject external/admin next URLs; disabled storage does not crash helpers | Assertions passed | PASS |
| Booking lifecycle | Request → approval → paid → handover → returned → completed; reject skipped stages and duplicate actions | Assertions passed | PASS |
| Inventory and pricing | Correct quantities, delivery fees, totals, stock holds and release; reject stale prices and competing overbooking | Assertions passed in isolated database | PASS |
| Admin security | Owner-only access, session/recovery protections and rate limits | Existing suite passed | PASS |
| Performance | Paid-only receipts, correct date boundaries/totals, no duplicate inflation | Existing suite passed | PASS |
| Request alerts | Group arrivals, dismiss/deduplicate, remove processed requests | Existing suite passed | PASS |
| Production build | Compile all routes | Build completed, exit 0 | PASS |
| Diff whitespace | No malformed whitespace changes | No findings | PASS |
| Full TypeScript check | No type errors | Five existing diagnostics in unchanged payment page/database adapter | FAIL (known baseline) |

## Commands executed
`node scripts/test-customer-auth.mjs`, `node scripts/test-customer-device.mjs`, `node scripts/test-booking-workflow.mjs`, `node scripts/test-admin-auth-unit.mjs`, `node scripts/test-performance.mjs`, `node scripts/test-booking-alerts.mjs`; Sites build helper; `npx tsc --noEmit`; `git diff --check`.

## Diagnostics
The workflow suite deliberately logs `Test map outage`, `catalog_prices_unavailable`, `inventory_read_failed`, `inventory_update_failed`, `admin_bookings_read_failed` and `admin_booking_update_failed`. These are injected failures whose recoverable responses passed assertions, not observed live outages.

Typecheck reproduction: run `npx tsc --noEmit`.
- `app/payment/page.tsx:5`: two TS18046 unknown-response diagnostics and TS2698 unknown spread.
- `db/index.ts:2`: two TS2339 missing `Env.DB` declarations.
These files were not modified in this milestone. No new failing assertions were found. No unrelated production-code edits made.

## Still required before customer-account launch
- Real verification/reset email delivery, exact allowed redirects and provider eligibility.
- Full browser signup/confirmation/login/reset/checkout with a controlled test account after email setup; mobile/touch and slow-network review. Prior local visual review is not a substitute for this journey.
- Real customer/admin integration and production-level concurrency verification using authorized test data.
- Baseline type errors resolved in the follow-up above; remaining release gates still apply.
- Decide public access separately; current private sharing stays unchanged.

## Assessment
Local automated checks pass, but customer accounts are not production-ready or published. Keep the existing live flow unchanged. Next checkpoint is user review and approval to back up this unpublished milestone to a separate GitHub branch without deployment.
