import { getDb } from '../../../../db';
import { AUTH_HEADERS, verifyCustomer } from '../../../../lib/customer-auth';
import { sameOrigin } from '../../../../lib/admin-auth';
import { validReview } from '../../../../lib/booking-reviews';
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: AUTH_HEADERS });
export async function GET(request: Request) {
  try {
    const user = await verifyCustomer(request.headers.get('cookie'));
    if (!user) return reply({ error: 'Sign in to review your booking.' }, 401);
    const result = await getDb().prepare("SELECT reference FROM bookings WHERE customer_user_id=? AND status='complete' AND json_extract(order_json,'$.review') IS NULL ORDER BY completed_at DESC LIMIT 20").bind(user.id).all();
    return reply({ bookings: result.results });
  } catch { return reply({ error: 'Reviews are temporarily unavailable.' }, 503); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'Request not allowed.' }, 403);
  try {
    const user = await verifyCustomer(request.headers.get('cookie'));
    if (!user) return reply({ error: 'Sign in to review your booking.' }, 401);
    let body;
    try { const text = await request.text(); if (text.length > 5000) return reply({ error: 'Review is too long.' }, 400); body = JSON.parse(text); }
    catch { return reply({ error: 'Invalid review.' }, 400); }
    if (!validReview(body) || typeof body.reference !== 'string' || body.reference.length > 30)
      return reply({ error: 'Choose a rating and matching quick reviews. Comments can be up to 1,000 characters.' }, 400);
    const review = { rating: body.rating, tags: body.tags, comment: body.comment.trim(), submittedAt: Date.now() };
    // Ownership, completion and one-review-only are checked atomically with the write.
    const saved = await getDb().prepare("UPDATE bookings SET order_json=json_set(order_json,'$.review',json(?)) WHERE reference=? AND customer_user_id=? AND status='complete' AND json_extract(order_json,'$.review') IS NULL RETURNING reference")
      .bind(JSON.stringify(review), body.reference, user.id).first();
    if (!saved) return reply({ error: 'This booking is not available for review, or has already been reviewed.' }, 409);
    return reply({ ok: true });
  } catch { return reply({ error: 'Could not save your review. Please try again.' }, 503); }
}
