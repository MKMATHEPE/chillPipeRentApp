# Customer accounts — release checklist

Implemented locally on 2026-10-10. Unpublished; user approved a GitHub backup on `codex/customer-accounts-local-validation`. Do not merge or deploy until the release checks below are complete.

## Current agreement: no-cost local validation
- Keep the live guest booking flow unchanged. Do not publish mandatory customer authentication yet.
- No domain purchase, paid service, real email send or production booking mutation is authorized by this testing milestone.
- After review, save the unpublished customer-account milestone to a separate GitHub branch, not a deployment-triggering branch. Obtain user approval before pushing.
- Resume email configuration and production verification when a suitable sender is available. Do not disable verification to bypass this dependency.
- Latest results: [local test report](customer-accounts-test-report.md).

## Behaviour
- Browse and build a rental without signing in; checkout requires a verified customer session.
- `/customer-login` supports email/password sign-up and sign-in using the existing admin login visual style.
- Signup requires full name, contact number, email and a 12–128-character password.
- Confirmation links return to customer login; customers then sign in with their password. URL fragment tokens are removed, not persisted in browser storage.
- `/customer-reset` handles recovery links. Customer recovery does not change the owner's admin credentials.
- Customer sessions are opaque HttpOnly cookies backed by hashed session IDs in D1, valid for at most one hour and validated against Supabase on protected requests. No customer admin privileges.
- Profiles persist in D1. Email is the verified identity email and is read-only in the profile editor.
- New bookings have immutable `customer_user_id` derived server-side. Their tracking/payment APIs verify ownership; `/my-bookings` returns only the signed-in user's rows.
- Existing bookings retain reference/phone lookup and are NOT automatically assigned by matching phone/email.
- Signing out clears customer state on the device, without affecting admin sessions.
- Rental address/date and delivery quotes are not silently replaced when editing saved profile addresses.

## Required before publication
1. Confirm custom SMTP is configured in Supabase project `ewnvndainmnludajyyvm`. Default SMTP only delivers to project team members. Do not disable email confirmation as a workaround.
2. Keep email/password signup enabled and email confirmation required.
3. Add exact Supabase redirect URLs (preserving existing admin URLs):
   - `https://the-chill-pipe-rentals.mkmathepe.chatgpt.site/customer-login`
   - `https://the-chill-pipe-rentals.mkmathepe.chatgpt.site/customer-reset`
4. Verify confirmation/recovery email templates honour the requested redirect destination using Supabase's confirmation URL. Existing custom admin-only templates may need review.
5. Publish through Sites with migration `0005_windy_william_stryker.sql` and preserve the current owner-private audience. Public customer access requires a separate sharing decision.
6. Owner tests signup/verification/login/reset with an email they control. Never ask them to send passwords in chat.
7. Test an actual customer checkout then owner approval in a designated test booking; obtain approval before changing production bookings/payments.
8. After user approval, push to GitHub. Do not mark this release live until those checks pass.

## Verification completed
- Build passes.
- Local browser: customer sign-up visual review and checkout-to-login redirect pass.
- `node scripts/test-customer-auth.mjs`: validation, confirmation destination, session/cookie isolation, profile ownership, same-phone account isolation, no historical auto-claim, expiry/logout, recovery/replay/rate limits pass with fake identity provider and isolated SQLite.
- `node scripts/test-booking-workflow.mjs`: new account requirement and cross-account booking/payment isolation plus existing rental lifecycle/inventory/price tests pass.
- Existing admin auth, Performance and request-alert tests pass.
- TypeScript follow-up: all five baseline errors resolved using payment-response types and the Cloudflare DB binding declaration; `npx tsc --noEmit` passes. No runtime behaviour changed.
- Live email delivery, callback configuration and customer signup are NOT yet verified.

References: https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/auth/redirect-urls
