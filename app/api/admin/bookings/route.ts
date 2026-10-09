import { getDb } from '../../../../db';
import { AUTH_HEADERS, sameOrigin, verifyAdmin } from '../../../../lib/admin-auth';
import { actionLabels, toAdminBooking, transition } from '../../../../lib/admin-bookings';
import { requirements, rentalEpoch, RENTAL_SECONDS } from '../../../../lib/inventory';
import { ensureInventory, heldSql, outSql } from '../../../../lib/inventory-server';
import { expirePendingBookings, rentalStartSql } from '../../../../lib/booking-expiry';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: AUTH_HEADERS });
async function denyAccess(request: Request) {
  try { return await verifyAdmin(request.headers.get('cookie')) ? null : reply({ error: 'Admin sign-in required.' }, 401); }
  catch { return reply({ error: 'Admin access temporarily unavailable.' }, 503); }
}
export async function GET(request: Request) {
  const denied = await denyAccess(request); if (denied) return denied;
  try {
    const cursor = new URL(request.url).searchParams.get('before');
    if (cursor && !/^\d{1,15}$/.test(cursor)) return reply({ error: 'Invalid page.' }, 400);
    await expirePendingBookings();
    const result = await getDb().prepare('SELECT * FROM bookings WHERE id < ? ORDER BY id DESC LIMIT 100').bind(cursor ? Number(cursor) : Number.MAX_SAFE_INTEGER).all();
    return reply({ bookings: result.results.map(toAdminBooking), nextCursor: result.results.length === 100 ? String(result.results[99].id) : null });
  } catch { console.error('admin_bookings_read_failed'); return reply({ error: 'Bookings unavailable. Please retry.' }, 503); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'Request not allowed.' }, 403);
  const denied = await denyAccess(request); if (denied) return denied;
  let body: Record<string, any>;
  try { body = await request.json(); } catch { return reply({ error: 'Invalid request.' }, 400); }
  if (!body || typeof body.reference !== 'string' || body.reference.length > 30 || typeof body.status !== 'string' || !Object.hasOwn(actionLabels, body.status) || !Number.isSafeInteger(body.version) || body.version < 0)
    return reply({ error: 'Invalid booking action.' }, 400);
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (body.status === 'declined' && (!reason || reason.length > 500)) return reply({ error: 'Enter a decline reason (up to 500 characters).' }, 400);
  try {
    const db = getDb();
    await expirePendingBookings();
    const row = await db.prepare('SELECT * FROM bookings WHERE reference=?').bind(body.reference).first();
    if (!row) return reply({ error: 'Booking not found.' }, 404);
    if (Number(row.version) !== body.version) return reply({ error: 'This booking changed. Refresh and review its latest status.' }, 409);
    if (!transition[String(row.status)]?.includes(body.status)) return reply({ error: 'Action not allowed at this stage. Payment must be recorded before handover.' }, 409);
    let stockGuard = '';
    const stockArgs: number[] = [];
    if (body.status === 'approved' || body.status === 'handed_over') {
      await ensureInventory();
      const needed = requirements(JSON.parse(String(row.order_json)).quantities || {});
      if (!Object.values(needed).every(n => Number.isSafeInteger(n) && n >= 0) || needed.tongs < 1)
        return reply({error:'This booking has invalid equipment quantities and cannot be approved.'},400);
      const start = rentalEpoch(String(row.rental_date));
      if (!Number.isSafeInteger(start)) return reply({error:'This booking has an invalid rental date. Correct the request before approval or handover.'},400);
      if (body.status === 'approved' && start <= Math.floor(Date.now()/1000))
        return reply({error:'This request has expired. A new request with a future date is required.'},409);
      const held = body.status === 'approved' ? heldSql(start,start+RENTAL_SECONDS) : outSql;
      stockGuard = ` AND NOT EXISTS (SELECT 1 FROM equipment WHERE total-unavailable-${held} < CASE equipment.id WHEN 'classic' THEN ? WHEN 'premium' THEN ? WHEN 'stove' THEN ? WHEN 'tongs' THEN ? END)`;
      stockArgs.push(needed.classic,needed.premium,needed.stove,needed.tongs);
    }
    const now = Date.now();
    if (row.status === 'awaiting_review') {
      stockGuard += ` AND ${rentalStartSql} > ?`;
      stockArgs.push(Math.floor(now/1000));
    }
    const history = JSON.parse(String(row.activity_json));
    history.push({ label: actionLabels[body.status], at: now });
    const updated = await db.prepare(`UPDATE bookings SET status=?,version=version+1,updated_at=?,activity_json=?,decline_reason=CASE WHEN ?='declined' THEN ? ELSE decline_reason END,paid_at=CASE WHEN ?='paid' THEN ? ELSE paid_at END,completed_at=CASE WHEN ?='complete' THEN ? ELSE completed_at END WHERE reference=? AND version=? AND status=?${stockGuard} RETURNING *`)
      .bind(body.status, now, JSON.stringify(history), body.status, reason, body.status, now, body.status, now, body.reference, body.version, row.status,...stockArgs).first();
    if (!updated) return reply({ error: 'This booking or available stock changed. Refresh and review Inventory before trying again.' }, 409);
    return reply({ ok: true, booking: toAdminBooking(updated) });
  } catch { console.error('admin_booking_update_failed'); return reply({ error: 'Could not save this action. Refresh to check its status before trying again.' }, 503); }
}
