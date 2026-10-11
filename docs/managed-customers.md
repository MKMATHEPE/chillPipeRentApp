# Admin-managed customer accounts

## Configuration

Use the existing Supabase project with `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SECRET_KEY`. Set `CUSTOMER_ACCOUNT_MODE=managed` in the hosted runtime and deploy. Apply D1 migrations through 0006. Never commit `.env` or include the secret in browser code. Local test mode remains separate and must not be enabled in production.

## Owner workflow

Admin → Account → Manage customers. Verify the customer's identity and email directly, then create their account with a unique temporary password (12–128 characters). Share it privately. No invitation email is sent. The customer signs in at `/customer-login`, replaces the temporary password, then signs in again. Each account has its own profile and booking history; matching phone numbers do not transfer old bookings automatically.

Disable immediately blocks application access and invalidates application sessions. Enable requires another sign-in. Remove access hides the account from the list and blocks application access permanently through these controls; it retains the provider identity, profile and booking history. It is not a personal-data erasure operation. Admin identities cannot be managed as customers.

## Limitations and recovery

- This mode is owner-provisioned access, not public self-registration. Public signup, confirmation resend and email recovery endpoints are disabled in the application while managed mode is enabled. Supabase's global email-confirmation settings are not weakened.
- Forgotten-password recovery still requires administrator assistance; no automated email service or admin reset UI is included in this release. Do not promise self-service email recovery until SMTP is configured and tested.
- If Supabase creation succeeds but D1 registration fails, the orphan identity cannot access the application. Inspect the exact identity and registry before recovery; do not delete or modify unrelated users, or retry blindly.
- Interrupted password replacement may leave a `changing` account blocked. Investigate its registry and provider state before recovery. Never bypass the password-change gate by changing client-side state.
- Hosting access remains a separate gate. An owner-private Site is not reachable by arbitrary customers merely because they have a Supabase account. Review and approve the Site audience before inviting customers.

## Verification (2026-10-11)

Eight automated suites passed: admin auth, customer auth, isolated temporary customers, managed customers, booking workflow, performance, booking alerts, and customer-device behavior. TypeScript and production build passed. Managed-account coverage includes CSRF, owner-only operations, duplicate email, first-password gate, wrong credentials, password replacement, session revocation, disabled/removed access, revision races, separate histories and provider failures.

One explicitly authorized disposable real Supabase identity passed creation, first-login gate, password replacement, old-password rejection, normal customer-session and disabled-access checks against an isolated application database. The identity was permanently deleted afterward. No existing customers or bookings were changed. The opt-in test is `CP_LIVE_AUTH_TEST=1 node scripts/test-managed-provider.mjs`; obtain permission before running against a live project.

Mobile customer login and first-password screens were visually reviewed. Authenticated admin browser acceptance remains an owner check; automated route tests do not substitute for it.
