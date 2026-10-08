# Production readiness — agreed implementation sequence

Process for every step: implement → test → user approval → GitHub push → next step.
Do not push to GitHub or advance without user approval. Preserve the existing design unless a change is required by the current step.

Last approved GitHub baseline: `f4ced52ed2b389c07d47eab0161eb6528a0dba98` (`main`), pushed after owner confirmed Step 2 works and approved proceeding on 8 October 2026.

| Step | Scope | Status | Test evidence | Approval / GitHub commit |
| --- | --- | --- | --- | --- |
| 1 | Admin sign-in and protected actions | Owner confirmed live sign-in; approved | Prior automated access/session/recovery checks passed; owner login confirmed | Approved; pushed 6d1dedc |
| 2 | Real customer orders in Admin | Implemented; owner accepted | Isolated integration passed; live requests and tracking matched; owner confirmed it works | Approved; pushed f4ced52 including loading fix |
| 3 | Persistent admin changes | Included in Step 2 integration | Atomic saved transitions, version checks and activity history tested | Same acceptance gate as Step 2 |
| 4 | Customer tracking updates | Included in Step 2 integration | Saved statuses and decline reason tested; visible-page refresh added | Same acceptance gate as Step 2 |
| 5 | Payment integration | Not started | — | — |
| 6 | Date-based equipment availability | Implemented; owner acceptance pending | Isolated route tests: overlapping/adjacent periods, peak demand, concurrent approvals, physical handover guard | Do not push to GitHub until approved |
| 7 | In-app notifications | Basic open-admin request badge and new-request notice included in Step 2 | 30-second visible-page refresh; no email, push or background notifications | Owner UI test pending |
| 8 | Live performance reporting | Implemented; owner approved | Reporting fixtures, real-route integration and component render checks passed | Approved ad5cd15; GitHub push authorized |
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

## Inventory — next approved step, 8 October 2026

- Owner confirmed Step 2 works and approved GitHub push plus starting Inventory; previous pending-approval notes above are historical.
- GitHub main successfully advanced from 6d1dedc to f4ced52.
- Preserve existing Inventory design. Connect equipment quantities and availability to durable records and booking lifecycle.
- Owner confirmed usable stock: 20 Classic hookahs, 20 Premium hookahs, 10 coal stoves, 20 tongs; all unavailable counts zero. These replace the earlier example quantities once only; future edits are preserved.
- Implemented durable authenticated inventory reads/edits, version conflict protection, whole-number validation, active booking allocations and atomic approval stock checks. Existing design/customer pricing unchanged.
- Approved/payment-review/paid reserves equipment; handover/returned is out; completion releases stock. This is conservative stock holding until completion, NOT date-based reuse. One tong per hookah means 20 tongs can support at most 20 simultaneous hookahs.
- Isolated actual-route integration passed: initialization, durable edits, stale/invalid/unauthorized/CSRF rejection, below-held edits, full lifecycle, competing approvals and outage responses. No production booking/payment was changed for tests.
- Auth regression tests passed. Local login renders; authenticated browser acceptance requires owner sign-in. Existing unrelated TypeScript errors in checkout/payment/DB typing remain outside this change.
- Owner approved Inventory on 8 October 2026 and authorized its GitHub push. Approved implementation: `7dbbb59ff4e417eb56d1207ccf1d45fd426e0c62`, published as Sites version 100. Earlier pending-acceptance notes are historical.
- Next scope to agree: date-based equipment availability. Current reservations continue holding stock until completion; no new feature changes made with this acceptance.

## Date-based availability — 8 October 2026

- User approved implementation after Inventory was accepted and pushed to GitHub (`b08bcc5`).
- Planned approved/payment-review/paid rentals reserve [rental start, start + 24 hours), in South Africa time for unzoned dates. Exact end/start boundaries permit planned reuse; no additional turnaround buffer has been assumed.
- Atomic approval checks peak simultaneous demand within the requested period, not the sum of every booking touching it. Separate dates can share stock.
- Handed-over and returned/awaiting-inspection equipment remains blocked until completion. Handover checks physical stock again, so an unreturned earlier booking cannot cause a second handover beyond capacity.
- Inventory cards keep their design. Reserved now means peak upcoming planned demand; Available is capacity remaining after that peak, unavailable units and all equipment out. Help text explains this; selected-request shortage hints use its own period.
- Stock edits protect peak future demand. Invalid dates and fully ended rental requests cannot be approved. No historical booking statuses or payment records were changed.
- Tests passed for partial/full overlap, adjacent periods, UTC/SA time, month boundaries, peak-not-sum calculation, concurrent approvals, out/inspection blocking, release on completion, stale edits and authentication regression.
- Local protected login renders. Authenticated browser acceptance remains with owner; no authentication bypass. Existing unrelated TypeScript errors remain outside scope.
- Owner approved date-based availability and starting live Performance reporting on 8 October 2026. Approved implementation: `a870a28a5d2dae7b10a56566ee8a13b4dabdb4fb`, Sites version 101. GitHub push authorized; earlier pending notes are historical.

## Live Performance reporting — 8 October 2026

- Date-based availability plus approval record pushed to GitHub `main` at `f8ee688`. User authorized starting this step.
- Existing Performance already consumed real admin bookings. Kept its design and core metrics; extracted and verified calculations, replaced display-label quantity parsing with saved quantities, added handover counts from saved activity timestamps.
- Money received is gross recorded receipts (including delivery/add-ons and any historical deposit), not profit or net refunds. It requires paid status and a recorded payment timestamp. Completed rental counts and equipment popularity use completion dates; handovers use their own event dates.
- Added valid South Africa date-range handling, bounded chart groups, duplicate/version safeguards, currency rounding and a notice for older records with undated events. No invented event dates or backfills.
- Loading/error reporting states do not display false zero figures. Existing 30-second visible-page/focus refresh is preserved.
- Isolated tests cover exact totals, charts, dates/midnight, invalid/reversed/future dates, repeat customers, quantities, undated history, duplicate records and actual saved booking lifecycle → reporting. No production customer/payment data was modified for tests.
- Owner approved the Performance update on 8 October 2026 and authorized its GitHub push. Approved implementation: `ad5cd1527c85a7e44ceeec89d29fb8d4d6af0e23`, published as Sites version 102. Earlier pending-approval notes are historical; this acceptance does not claim additional agent-run browser tests.
- No next feature started. Continue the agreed implement → test → owner approval → GitHub process for the next selected step.
