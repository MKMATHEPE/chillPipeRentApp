import { getDb } from '../../../db';

const json = (data: unknown, status = 200) => Response.json(data, { status });
const clean = (value: unknown, max = 200) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, any>;
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
    if (!pipeQty) return json({ error: 'Add at least one hookah pipe.' }, 400);
    const reference = `CP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const total = Math.max(0, Math.round(Number(body.total) || 0));
    const deposit = pipeQty * 308;
    const now = Date.now();
    await getDb()
      .prepare(
        `INSERT INTO bookings (reference,customer_name,phone,rental_date,location,notes,order_json,rental_total,deposit,delivery_fee,status,payment_method,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,NULL,'awaiting_review',NULL,?,?)`,
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
        }),
        total,
        deposit,
        now,
        now,
      )
      .run();
    return json(
      {
        reference,
        status: 'awaiting_review',
        total,
        deposit,
        deliveryFee: null,
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
