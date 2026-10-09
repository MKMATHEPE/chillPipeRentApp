import { getDb } from '../db';
import { BookingInputError } from './booking-pricing';

export const COLLECTION_LOCATION = 'Bel Aire, Langeveld Street, Vorna Valley, Johannesburg, South Africa';
export async function verifyDeliveryQuote(body: Record<string, any>) {
  if (!body.delivery) return { fee: 0, distanceKm: 0, location: COLLECTION_LOCATION, quoteId: null };
  if (typeof body.deliveryQuoteId !== 'string' || body.deliveryQuoteId.length > 100)
    throw new BookingInputError('Return to Delivery and recalculate your delivery fee.', 409);
  const quote = await getDb().prepare('SELECT address,suburb,metres,fee,expires_at FROM delivery_quotes WHERE id=?').bind(body.deliveryQuoteId).first();
  if (!quote || Number(quote.expires_at) <= Date.now())
    throw new BookingInputError('Your delivery quote has expired. Return to Delivery and recalculate the fee.', 409);
  const unit = typeof body.deliveryUnit === 'string' ? body.deliveryUnit.trim() : '';
  if (unit.length > 100) throw new BookingInputError('Please shorten your building or unit details.');
  const location = [quote.address, unit, quote.suburb].filter(Boolean).join(', ').slice(0, 180);
  if (typeof body.customer?.location !== 'string' || body.customer.location.trim().slice(0, 180) !== location || body.deliveryFee !== quote.fee)
    throw new BookingInputError('Your delivery details or fee have changed. Return to Delivery and recalculate the fee.', 409);
  return { fee: Number(quote.fee), distanceKm: Math.round(Number(quote.metres) / 100) / 10, location, quoteId: body.deliveryQuoteId };
}
