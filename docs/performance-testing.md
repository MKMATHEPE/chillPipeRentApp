# Performance reporting verification

Story: saved customer orders → admin records payment/handover/completion → real persisted timestamps and quantities → date-filtered Performance figures and charts.

## Automated results

`node scripts/test-performance.mjs`

| Scenario | Expected / actual | Result |
| --- | --- | --- |
| Paid versus unpaid and delivery/add-ons | R2,560 recorded receipts from eligible paid bookings | Pass |
| Completion and handover dates | 2 completions and 2 handovers in fixture period | Pass |
| Average and equipment | R1,005 average; 1 Classic and 2 Premium, independent of display labels | Pass |
| Repeat customer | One unique customer with earlier dated completion | Pass |
| Undated history | Missing events excluded and warning shown | Pass |
| Duplicate/stale versions | No inflated counts or totals | Pass |
| SA midnight | UTC 22:00 enters the following local date | Pass |
| Invalid/reversed/future ranges | Invalid result; no fabricated chart | Pass |
| Long ranges/empty data | At most seven chart groups; truthful zero/empty values | Pass |
| Currency rounding | R0.10 + R0.20 + R0.10 = R0.40 | Pass |
| Actual component server render | Expected KPI labels, controls, notice; no NaN/Infinity | Pass |

`node scripts/test-booking-workflow.mjs` additionally feeds real route outputs from isolated SQLite into the report: R3,820 receipts, one completion, one handover, one Classic and one Premium. Chart totals agree. No live orders or payments are changed.

## Scope and limitations

- Existing visual design and customer flow are preserved; one handover row uses the same statistics styling.
- Recorded receipts are not profit or refund-adjusted revenue; no new financial integration is implied.
- Old records without timestamps cannot be assigned to periods reliably and are flagged. No inferred/backfilled dates.
- Authentication remains intact. Owner sign-in is required for final browser interaction acceptance.
- Existing unrelated checkout/payment/DB environment type-check errors remain outside this scope.
- GitHub push follows user approval, separately from publishing for review.
