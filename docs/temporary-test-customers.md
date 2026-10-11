# Temporary test customers — local only

## Scope
No paid service or customer email delivery is required. This is an isolated development environment on this computer, not a publicly accessible customer service. Use fictional names, phone numbers and `@test.invalid` email addresses only. Never enter real payment details or send an EFT for a test booking.

## Start
From the project checkout:
1. `npm run db:test-customers` initializes/updates the separate local database. All commands use `--local`; never substitute `--remote`.
2. `npm run dev:test-customers` starts the app on `http://127.0.0.1:3012`.
3. Sign in yourself at `/admin-login` using your existing owner credentials. Admin authentication still uses Supabase; no admin bypass or default password was added. The existing ignored local environment configuration is required.
4. Open **Account → Manage test customers**, or `/admin-test-customers` after signing in.
5. Create a fictional customer and enter a temporary password of 12–128 characters. The list never displays passwords. Communicate that temporary password yourself outside the app; there is no email invitation.
6. Customer signs in at `/customer-login`, replaces the temporary password and signs in again. Booking/profile/history permissions are the same server-side ownership checks used by real accounts.

The browser can retain separate admin and customer sessions. Use the exact origin above consistently. Other machines cannot connect; do not add a tunnel or change the loopback-only binding.

## Controls
- Create test accounts; no public signup.
- Disable or re-enable accounts. Disabling invalidates active customer sessions immediately; enabling requires fresh sign-in.
- Remove an account after confirmation. This soft-removes the account, clears its password hash and revokes sessions. Historical test bookings remain for admin inspection; they are not moved to another account.
- Forgot a test password? Remove the test account and create another with a new fictional email. Test credentials/bookings are disposable, not intended for migration.
- Customers must change their temporary password before any protected profile/booking API grants access.

## Isolation and safety
- `CP_LOCAL_TEST_CUSTOMERS=1` is honoured only by Vite's **serve** command. Build ignores it.
- A development-only resolver substitutes `local/test-customers.ts` for the production disabled stub `lib/test-customers.ts`.
- Production management endpoints return 404 and production account verification rejects `test:` identities. No environment flag can activate the provider in a production build.
- The provider uses randomly salted PBKDF2-SHA256 password hashes (100,000 iterations) only for disposable local tests. Do not promote it into a production identity service.
- Customer cookies remain opaque HttpOnly, with hashed session IDs and one-hour expiry. Account version changes invalidate old sessions. Signup/recovery/resend are blocked in test mode; no customer emails or real Supabase customer accounts are created.
- Only the normal verified admin can manage accounts. Server-side origin checks and rate limits apply.
- Test database state is under ignored `.wrangler/test-customers`, not the normal development/production database. Test-only tables are created only by the local provider, not in production migrations.
- The local server only accepts loopback clients and localhost/127.0.0.1 Host headers. Pages show a local-test warning.

## Verification
Verified locally on 11 October 2026:
- Seven suites passed: admin authentication, customer authentication, temporary customers, customer-device state, booking workflow, performance and booking alerts.
- TypeScript and the production build passed, including a build with the local-test flag set. Production server artifacts contain neither the local account table nor the PBKDF2 provider.
- Local database migrations, catalogue loading, unauthorized management rejection and forged Host rejection passed.
- Customer sign-in and first-password screens were visually checked at 390 × 844; no clipping observed. Unsigned management navigation redirects to admin sign-in.
- No deployment or GitHub push was performed. The local preview was stopped after verification.

`node scripts/test-temporary-customers.mjs` tests real local provider/route handlers in disposable SQLite: management authorization, CSRF, fictional-email/duplicate/password validation, password hashing/non-disclosure, first-login gate, password replacement, old-password and stale-session rejection, disable/re-enable/remove, production rejection, email-route blocking and login rate limits. No real provider calls.

Real owner sign-in and owner-driven account creation through the UI remain a manual acceptance step. Never paste the owner password in chat. Tests do not prove real customer SMTP or production signup.

## Going live later
Stop test mode and use the normal build. Configure real customer email delivery, complete the release checklist and create fresh verified accounts. Do not migrate temporary passwords, identities or bookings. No changes in this milestone should be published to the live site without review.
