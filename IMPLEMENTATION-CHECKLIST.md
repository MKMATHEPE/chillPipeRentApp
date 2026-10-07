# Production readiness — agreed implementation sequence

Process for every step: implement → test → user approval → GitHub push → next step.
Do not push to GitHub or advance without user approval. Preserve the existing design unless a change is required by the current step.

Last approved GitHub baseline: `6d1dedc94e2a35ceaa521afd5587f456d4334ed1` (`main`), pushed after owner confirmed live sign-in and approved proceeding.

| Step | Scope | Status | Test evidence | Approval / GitHub commit |
| --- | --- | --- | --- | --- |
| 1 | Admin sign-in and protected actions | Owner confirmed live sign-in; approved | Prior automated access/session/recovery checks passed; owner login confirmed | Approved; pushed 6d1dedc |
| 2 | Real customer orders in Admin | Implemented; testing and owner acceptance in progress | Isolated production-route integration passed; see docs/admin-bookings-testing.md | Not yet approved for GitHub |
| 3 | Persistent admin changes | Included in Step 2 integration | Atomic saved transitions, version checks and activity history tested | Same acceptance gate as Step 2 |
| 4 | Customer tracking updates | Included in Step 2 integration | Saved statuses and decline reason tested; visible-page refresh added | Same acceptance gate as Step 2 |
| 5 | Payment integration | Not started | — | — |
| 6 | Date-based equipment availability | Not started | — | — |
| 7 | In-app notifications | Basic open-admin request badge and new-request notice included in Step 2 | 30-second visible-page refresh; no email, push or background notifications | Owner UI test pending |
| 8 | Live performance reporting | Not started | — | — |
| 9 | Full end-to-end testing | Not started | — | — |

## Step 1 — discovery, 6 October 2026

- User supplied the intended administrator email in the conversation. Do not request passwords in chat or commit credentials.
- Requested sign-in method: email/password; sole administrator.
- Existing `/api/admin/bookings` authorizes the platform-provided user ID. The newer `/admin-preview` uses client-side sample state; its layout has no app-level sign-in guard.
- Sites authentication guidance requires confirming the supported authentication path before introducing app-owned email/password or an external identity provider. Do not replace the requested method with ChatGPT sign-in without user agreement.
- No app behavior, access policy, credentials, deployment or GitHub state changed during discovery.

### Acceptance checks to execute after implementation

- Authorized administrator can sign in and sign out.
- Wrong credentials and unauthorized users cannot access either admin route or admin APIs.
- Direct navigation and API calls are protected server-side.
- Session expiry/revocation and reload behavior work as intended.
- Secure account setup and recovery; no passwords or tokens in source, logs or client storage.
- Customer flow remains unchanged.
- User tests and approves before GitHub push and Step 2.

## Step 1 — authentication project created, 6 October 2026

- User approved separate Supabase project named **The Chill Pipe App**, under **Namaro Tech**.
- Supabase project reference: `ewnvndainmnludajyyvm`.
- Region: `eu-central-1` (Frankfurt).
- Creation quote: $0/month; cost confirmation completed before creation.
- Creation response: `ACTIVE_HEALTHY`.
- Admin user, password setup, authentication integration and access tests remain pending. Project creation alone does not enable app sign-in.
- No GitHub push or app deployment performed for this step.

## Step 1 — account prerequisite, 7 October 2026

- Supabase project verified `ACTIVE_HEALTHY`.
- Scoped read-only check confirms the intended administrator account is not yet in `auth.users`.
- Available Supabase connector has no Auth user creation/invitation operation. Do not insert password records directly into `auth.users` or collect the owner's password in chat.
- Owner should create the email/password user through the project's Authentication dashboard, entering the password privately. Then retrieve the generated user ID with a scoped read-only check and use it for server-side authorization.
- No application code or production access policy changed; no GitHub push.
- Independent access remains a later verification requirement: the current Sites audience is owner-private and still has a platform sign-in gate. Do not silently make the whole app public as part of adding Supabase login.

## Step 1 — implementation and testing, 7 October 2026

- Correct administrator account: **mkmathepe@gmail.com**. Verified confirmed email and password presence through a scoped read-only check. Password never requested, read or stored by the agent.
- Server-side UUID authorization, Supabase password verification, opaque HttpOnly/Secure/SameSite cookie, hashed session identifiers, one-hour maximum sessions, logout invalidation, CSRF checks and login rate limiting added.
- Supabase access token stays in server-side D1 session storage; refresh tokens discarded. No browser auth-token storage.
- Protected both admin routes and the existing admin bookings API. Preview remains sample/local-state workflow until Step 2.
- Automated checks: see `docs/admin-auth-testing.md`.
- Owner must privately test actual sign-in, reload, sign-out and direct-link denial before approval and GitHub push.
- Current private Sites access gate remains in place. This is NOT yet publicly accessible independent hosting.
- Self-service password setup/recovery added on 7 October 2026 after the owner reported not knowing the app password. Owner completion remains required.

### Password setup — 7 October 2026

- Added /admin-reset and a Set or reset password link; kept the approved dark login styling.
- Supabase redirect allowlist now contains only the exact app /admin-reset URL (no wildcard added).
- Recovery sends only to configured administrator email; Supabase validates identity and server enforces the owner UUID before updates.
- Recovery token remains in page memory, is removed from URL, and is not written to browser storage. Password is never logged.
- New passwords require 12–128 characters; confirmation checked in UI. Existing app sessions are revoked after success.
- Isolated tests passed: email recipient/redirect, malformed requests, CSRF, invalid identity, successful update, session revocation and replay rejection. Real owner password is never entered by the agent.
- Local browser: reset page renders; expired-link error appears and URL fragment clears. Build and delivery acceptance are recorded in the task handoff.
- Email receipt, private password entry and real sign-in await user acceptance. No GitHub push.

## Step 2 — real bookings integration, 7 October 2026

- Owner confirmed live sign-in, approved Step 1 GitHub push and starting Step 2. GitHub main now matches 6d1dedc. Earlier pending Step 1 notes above are historical.
- Removed sample booking records from admin; reads paginated real customer records from the same database used by checkout and tracking.
- Admin actions persist, include version checks against stale/double actions, and enforce Approve → Paid → Handover → Returned → Completed on the server.
- Declines require a reason, persist in History and appear on customer tracking.
- Existing /admin route redirects to the approved /admin-preview UI, avoiding a second incompatible management screen.
- Admin updates every 30 seconds while visible and on focus; customer tracking updates every 30 seconds while active. These are in-app updates only.
- Date formatting uses South Africa time. Saved totals remain authoritative; historical pricing differences are shown explicitly rather than overwritten.
- Inventory remains example/local state and is labelled accordingly. It must NOT automatically block/approve real orders using invented stock. Owner confirms equipment availability manually until the inventory step.
- Existing historical payments/completions lack event timestamps; do not invent dates or backfill them from unrelated updates.
- Test records exist only in isolated in-memory SQLite. No production customer booking or payment was altered by the agent.
- Do not push Step 2 to GitHub until owner acceptance. Do not begin payment or inventory work without the next approval.
