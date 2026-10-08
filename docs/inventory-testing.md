# Inventory verification — 8 October 2026

Story: Admin Inventory edit → protected API → persistent equipment rows → refreshed stock cards; booking approval/lifecycle → atomic stock allocation.

`node scripts/test-booking-workflow.mjs` runs the real route handlers against isolated in-memory SQLite using generated migrations. The identity provider is replaced only inside the test harness. No production orders are modified.

| Scenario | Expected and actual | Result |
| --- | --- | --- |
| First initialization | 20 Classic / 20 Premium / 10 stoves / 20 tongs, none unavailable | Pass |
| Saved edit and repeated reads | Updated quantities persist; initialization does not reset them | Pass |
| Old version / duplicate edit | 409, no overwritten update | Pass |
| Negative/fractional quantities, invalid price | 400 | Pass |
| Unauthenticated access / cross-origin edit | 401 / 403 | Pass |
| Reduce usable stock below active holds | 409 | Pass |
| Approval / payment | Actual order quantities reserved | Pass |
| Handover / returned awaiting inspection | Reserved becomes out and remains out | Pass |
| Completion | Equipment becomes available again | Pass |
| Competing approvals for last tongs | One succeeds, one gets 409; no overbooking | Pass |
| Database outage | Recoverable 503 rather than false success | Pass |
| Existing order lifecycle and customer tracking | Status, totals, pagination, declines and payment verification preserved | Pass |

Additional checks: admin authentication regression suite passed; local sign-in page returned HTTP 200 and rendered in browser. Full authenticated browser edit/reload acceptance awaits owner sign-in. Do not bypass authentication for this test.

## Boundaries

- Updated by date-based availability: planned rentals reserve 24-hour intervals. Equipment out/awaiting inspection stays blocked until completion.
- Admin reference-price edits do not alter customer catalogue prices or historical totals.
- Existing active orders are counted, so available stock can be lower than the confirmed total. Existing oversubscription is shown rather than silently changing customer orders.
- Existing unrelated type-check errors in checkout, payment and DB environment typing remain; inventory modules should introduce no new errors.
- Owner acceptance required before GitHub push.

## Date-based availability follow-up

The same isolated route suite additionally verifies:

- Separate rental periods can reserve the same unit; exact 24-hour boundaries are non-overlapping.
- Partial overlaps exceeding stock receive 409.
- A candidate touching two mutually non-overlapping bookings counts their peak, not their combined quantity.
- Stock reductions cannot invalidate peak future commitments.
- UTC and South Africa inputs represent the same instant; cross-month boundaries work.
- Invalid dates receive 400 and fully ended rental requests receive 409.
- Concurrent overlapping approvals have one winner; separate-date approvals both succeed.
- Handover checks physical units. Out/returned bookings block new approvals until inspected/completed, even beyond their planned return time.
- Client shortage calculations match server window results for the tested peak scenario.

All passed. No live customer orders or payments were mutated for testing. Accurate handover/completion updates are required operationally. There is no automatic late-return cancellation, rescheduling, cleaning buffer, customer-side availability calendar or stock-unit serial tracking in this scope. Full signed-in browser acceptance is pending the owner.
