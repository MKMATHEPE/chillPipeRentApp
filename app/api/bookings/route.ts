import { getDb } from '../../../db';
import { isPaymentMethod } from '@/lib/payment-methods';

const json = (data: unknown, status = 200) => Response.json(data, { status });
const clean = (value: unknown, max = 200) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, any>;
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
    const pipeQty = Math.max(
      0,
      Math.min(10, Number(body.quantities?.pipe) || 0),
    );
    const premiumQty = Math.max(
      0,
      Math.min(10, Number(body.quantities?.premium) || 0),
    );
    if (!pipeQty && !premiumQty)
      return json({ error: 'Add at least one hookah.' }, 400);
    const reference = `CP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const total = Math.max(0, Math.round(Number(body.total) || 0));
    const deliveryFee = body.delivery ? Number(body.deliveryFee) : 0;
    if (body.delivery && deliveryFee !== 250 && deliveryFee !== 350)
      return json({ error: 'Calculate the delivery fee before checkout.' }, 400);
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
        location,
        clean(customer.notes, 500),
        JSON.stringify({
          quantities: body.quantities || {},
          selectedFlavours: body.selectedFlavours || [],
          suggestedFlavours: body.suggestedFlavours || [],
          delivery: Boolean(body.delivery),
          deliveryDistanceKm: Number(body.deliveryDistanceKm) || 0,
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
        total,
        deposit,
        deliveryFee,
        customer: { name, phone, date, location },
      },
      201,
    );
  } catch (error) {
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
    const row = await getDb()
      .prepare(
        `SELECT reference,status,rental_total AS total,deposit,delivery_fee AS deliveryFee,customer_name AS customerName,phone,rental_date AS rentalDate,location,order_json AS orderJson,payment_method AS paymentMethod,created_at AS createdAt,updated_at AS updatedAt FROM bookings WHERE reference=? AND phone=? LIMIT 1`,
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
