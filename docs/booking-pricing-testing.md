# Server-side rental pricing — 8 October 2026

Scope: no visual changes. POST /api/bookings calculates rental totals from server-owned Classic R650, Premium R850, extra coconut coal packs R30 and stoves R200. One selected flavour unit per hookah is included; additional selected units cost R50. Suggested flavours remain unpriced, pending confirmation. No security deposit is added.

Equipment/add-on quantities must be integers 0–10 (matching the existing UI); at least one hookah is required. Selected flavour quantities are positive safe integers with no business quantity cap. Unknown equipment/flavours, fractional/negative quantities and malformed requests are rejected. Older string-form flavour drafts still work; duplicate flavours are combined without losing units.

The server rejects stale, missing or manipulated totals with a recoverable 409 message before writing anything. Checkout retains the selection and displays the error; refresh/review uses current prices. It never silently increases the accepted price. New orders save server-created unit-price snapshots for future admin display. Historical booking totals are unchanged; no production records were edited.

Verification: isolated actual-route SQLite tests cover normal saved bookings through approval/payment/handover/return/completion, admin and tracking consistency, performance receipts, invalid payloads creating zero records, current client/server price parity, historical totals, injected price tables, suggestions, included units and extras. Existing inventory/concurrency/authorization regression tests and Performance tests pass. No production test orders were created.

Remaining boundary: delivery retains its existing R250/R350 validation. The booking endpoint does not yet authenticate the map quote or independently verify driving distance; the customer-supplied delivery flag/address also requires operational review. This change protects rental-item prices, not every aspect of delivery pricing. Online payment integration remains on hold pending merchant eligibility. Full authenticated browser acceptance remains with the owner.
