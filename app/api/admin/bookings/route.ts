import { getDb } from '../../../../db';
import { AUTH_HEADERS, sameOrigin, verifyAdmin } from '../../../../lib/admin-auth';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: AUTH_HEADERS });
async function denyAccess(request: Request) {
  try { return await verifyAdmin(request.headers.get('cookie')) ? null : reply({ error: 'Admin sign-in required.' }, 401); }
  catch { return reply({ error: 'Admin access temporarily unavailable.' }, 503); }
}
export async function GET(request: Request) {
  const denied = await denyAccess(request); if (denied) return denied;
  try {
    const result = await getDb().prepare(`SELECT reference,status,rental_total AS total,deposit,delivery_fee AS deliveryFee,customer_name AS customerName,phone,rental_date AS rentalDate,location,order_json AS orderJson,payment_method AS paymentMethod,created_at AS createdAt FROM bookings ORDER BY created_at DESC LIMIT 100`).all();
    return reply({ bookings: result.results.map((row: any) => ({ ...row, customer: { name: row.customerName, phone: row.phone, date: row.rentalDate, location: row.location }, ...JSON.parse(String(row.orderJson)) })) });
  } catch { return reply({ error: 'Bookings unavailable.' }, 500); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'Request not allowed.' }, 403);
  const denied = await denyAccess(request); if (denied) return denied;
  try {
    const body = await request.json() as Record<string, any>;
    const statuses = ['approved', 'paid', 'handed_over', 'returned', 'complete', 'cancelled'];
    if (!statuses.includes(body.status)) return reply({ error: 'Invalid status.' }, 400);
    const fee = body.deliveryFee === null || body.deliveryFee === undefined ? null : Math.max(0, Math.round(Number(body.deliveryFee) || 0));
    const result = await getDb().prepare(`UPDATE bookings SET status=?,delivery_fee=COALESCE(?,delivery_fee),updated_at=? WHERE reference=?`).bind(body.status, fee, Date.now(), String(body.reference || '')).run();
    if (!result.meta.changes) return reply({ error: 'Booking not found.' }, 404);
    return reply({ ok: true });
  } catch { return reply({ error: 'Could not update booking.' }, 500); }
}
