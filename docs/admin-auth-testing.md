# Admin authentication — Step 1 test record

Date: 7 October 2026.

## Executed

| Check | Expected | Actual | Result |
| --- | --- | --- | --- |
| Production build | Successful bundle | Passed | Pass |
| Direct /admin and /admin-preview | Redirect to login | 307 to /admin-login | Pass |
| Admin GET/PATCH without session | Denied; no booking access | 401 | Pass |
| Spoofed platform identity header | No app-login bypass | 401 | Pass |
| Malformed/unknown cookies | Denied | 401 | Pass |
| Cross-origin login/logout/update | Denied | 403 | Pass |
| Missing fields/malformed JSON | Safe validation error | 400 | Pass |
| Customer home/delivery/checkout smoke | Still available | 200 | Pass |
| Invalid-account password login against Supabase | Generic error | 401; password cleared | Pass |
| Mobile login form | Fits; usable labels/show-hide | No overflow or browser exceptions | Pass |
| Owner login, cookie hashing/security, verification | Correct session behavior | Passed with mocked identity provider and in-memory SQLite | Unit pass |
| Logout, expiry, provider outage, unauthorized UUID, unconfirmed owner | Fail closed / revoke correctly | Passed in isolated unit tests | Unit pass |
| Attempt eleven within rate window | Rejected | Rejected in isolated test | Unit pass |
| TypeScript check | No errors | 14 errors in unchanged legacy admin/customer/database files; none in new auth files | Existing failure |

Scripts: scripts/test-admin-access.mjs, scripts/test-admin-login-ui.mjs, scripts/test-admin-auth-unit.mjs.
Screenshots: outputs/admin-auth/login-mobile.png and login-desktop.png (local QA assets, not committed).

## Required owner acceptance before GitHub push

1. Open /admin-login; sign in privately as mkmathepe@gmail.com.
2. Confirm Admin opens with its existing tabs.
3. Reload and confirm the session remains active.
4. Sign out, then reopen /admin-preview and /admin directly; both should require login.
5. Confirm customer Home → Flavours → Delivery → Checkout still behaves as expected.

No real owner password was used in automated tests. Positive provider authentication and hosted session behavior need this private acceptance test.

## Limits / next work

- Admin preview still uses sample state; real-order wiring/persistence are separate steps.
- Existing hosted audience remains owner-private behind the platform gate.
- Password recovery currently requires the Supabase owner dashboard.
- Dependency installation reported 30 audit findings in the overall repository; broad dependency remediation was not part of this auth step.
- This is not a claim of overall production readiness.
