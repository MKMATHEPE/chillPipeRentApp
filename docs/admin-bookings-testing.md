# Step 2 — booking workflow verification

Story: customer checkout → saved booking → authenticated admin review/action → same saved status on customer tracking.

## Automated results

`node scripts/test-booking-workflow.mjs` executes production route handlers with an isolated SQLite database and a test-only identity adapter. No real bookings or payments are created/changed. Every scenario below passed.

| Scenario | Expected and actual result |
| --- | --- |
| New request | Customer POST creates Pending request in admin with correct customer, products, flavours, suggestions, notes, fee and total |
| Dates | 14:00 South Africa rental displays as 14:00, not browser/server timezone |
| Unauthorized access | Admin read/write returns 401 |
| Cross-origin update | Returns 403 |
| Skipped workflow stage | Handover before payment and completion before return return 409 |
| Decline without reason | Returns 400 |
| Full happy path | Approved → Paid → Handover → Returned → Completed saved |
| Reload/data integrity | Fresh reads retain each state; customer tracking matches each update |
| Duplicate/stale action | Old version returns 409, no duplicated activity |
| Decline | Reason saved and returned through correct reference + contact lookup |
| Wrong lookup contact | Returns 404 |
| Customer payment notification | Does not mark paid; manual admin verification still required; old version rejected |
| Pagination | 103 isolated records returned over two pages, no omissions or duplicates |
| Database outage | Returns recoverable 503 rather than false success |

Authentication regression: existing isolated login/logout/recovery/session tests still pass.

Local browser: navigating directly to /admin-preview without an app session redirects to sign-in. Agent did not enter the owner's password or bypass this boundary. Private signed-in UI acceptance remains with owner.

Type check: eight existing errors remain in checkout, payment and the D1 Env declaration. No errors remain in the changed admin/tracking modules. This is not a clean project-wide TypeScript baseline.

## Owner acceptance before GitHub push

1. Sign into live admin; confirm real requests replace samples.
2. Submit a clearly labelled test booking using the customer flow.
3. Leave admin visible; confirm badge/new-request notice within approximately 30 seconds.
4. Approve the test request; check customer tracking and refresh admin.
5. Verify handover is disabled until payment is recorded. Do not mark real money received unless it has actually been received.
6. Test the remaining lifecycle only on an agreed test record; verify History and tracking.
7. Create a separate test request to decline; check its reason and History.

## Remaining risks / later steps

- Production customer orders were not modified for testing.
- Inventory quantities and edits are still example/local state, not live availability.
- Historical payment/completion timestamps may be absent, so reports do not attribute those records to invented dates.
- Checkout currently accepts the submitted rental total. Server-side pricing validation and checkout idempotency remain necessary before public launch.
- Actual payment gateway, background push/email notifications and broader public access are separate steps.
- Current Sites access remains owner-private.
