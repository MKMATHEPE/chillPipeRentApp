import { getDb } from '../../../db';
import { isPaymentMethod } from '@/lib/payment-methods';
import { BookingInputError, priceBooking } from '@/lib/booking-pricing';
import { verifyDeliveryQuote } from '@/lib/delivery-quotes';
import { expirePendingBookings } from '@/lib/booking-expiry';

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const clean = (value: unknown, max = 200) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
export async function POST(request: Request) {
  try {
    let body: Record<string, any>;
    try { body = await request.json(); } catch { return json({ error: 'Invalid booking request.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid booking request.' }, 400);
    if (!isPaymentMethod(body.paymentMethod))
      return json({ error: 'Choose a payment method before checkout.' }, 400);
    const customer = body.customer || {};
    const name = clean(customer.name, 100),
      phone = clean(customer.phone, 40),
      date = clean(customer.date, 60),
      location = clean(customer.location, 180);
    if (!name || !phone || !date || !location)
      return json(
        { error: 'Name, phone, rental date and location are required.' },
        400,
      );
    const priced = priceBooking(body);
    const verifiedDelivery = await verifyDeliveryQuote(body);
    const reference = `CP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const { total } = priced;
    const deliveryFee = verifiedDelivery.fee;
    // Retain the column for historical records; new rentals require no deposit.
    const deposit = 0;
    const now = Date.now();
    await getDb()
      .prepare(
        `INSERT INTO bookings (reference,customer_name,phone,rental_date,location,notes,order_json,rental_total,deposit,delivery_fee,status,payment_method,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'awaiting_review',?,?,?)`,
      )
      .bind(
        reference,
        name,
        phone,
        date,
        verifiedDelivery.location,
        clean(customer.notes, 500),
        JSON.stringify({
          quantities: priced.quantities,
          selectedFlavours: priced.selectedFlavours,
          suggestedFlavours: priced.suggestedFlavours,
          unitPrices: priced.unitPrices,
          extraFlavourPrice: priced.extraFlavourPrice,
          delivery: Boolean(body.delivery),
          deliveryDistanceKm: verifiedDelivery.distanceKm,
          deliveryQuoteId: verifiedDelivery.quoteId,
        }),
        total,
        deposit,
        deliveryFee,
        body.paymentMethod,
        now,
        now,
      )
      .run();
    return json(
      {
        reference,
        status: 'awaiting_review',
        paymentMethod: body.paymentMethod,
        quantities: priced.quantities,
        delivery: Boolean(body.delivery),
        total,
        deposit,
        deliveryFee,
        customer: { name, phone, date, location: verifiedDelivery.location },
      },
      201,
    );
  } catch (error) {
    if (error instanceof BookingInputError) return json({ error: error.message }, error.status);
    console.error(error);
    return json(
      { error: 'We could not save your booking. Please try again.' },
      500,
    );
  }
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const reference = clean(url.searchParams.get('reference'), 20);
    const phone = clean(url.searchParams.get('phone'), 40);
    if (!reference || !phone)
      return json({ error: 'Reference and phone number are required.' }, 400);
    await expirePendingBookings();
    const row = await getDb()
      .prepare(
        `SELECT reference,status,decline_reason AS declineReason,rental_total AS total,deposit,delivery_fee AS deliveryFee,customer_name AS customerName,phone,rental_date AS rentalDate,location,order_json AS orderJson,payment_method AS paymentMethod,created_at AS createdAt,updated_at AS updatedAt FROM bookings WHERE reference=? AND phone=? LIMIT 1`,
      )
      .bind(reference, phone)
      .first();
    if (!row) return json({ error: 'Booking not found.' }, 404);
    return json({
      ...row,
      customer: {
        name: row.customerName,
        phone: row.phone,
        date: row.rentalDate,
        location: row.location,
      },
      ...JSON.parse(String(row.orderJson)),
    });
  } catch (error) {
    console.error(error);
    return json({ error: 'Booking status is temporarily unavailable.' }, 500);
  }
}
