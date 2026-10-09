// Server-owned rental prices in rand. Never accept a price table from a request.
export const RENTAL_PRICES = Object.freeze({ pipe: 650, premium: 850, coalPack: 30, stove: 200 });
export const EXTRA_FLAVOUR_PRICE = 50;
export type RentalPrices = Record<keyof typeof RENTAL_PRICES, number>;
const FLAVOURS = new Set(['Lady Killer', 'Gum & Mint', 'Cream Mint', 'Blueberry Mint', 'Watermelon Chill', 'Double Apple', 'Grape Mint', 'Peach Ice']);
type Product = keyof typeof RENTAL_PRICES;
type Flavour = { name: string; quantity: number };
export class BookingInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function quantity(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new BookingInputError('Quantities must be valid whole numbers. Please review your selection.');
  return value;
}
function text(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum)
    throw new BookingInputError('Please review the flavour details.');
  return value.trim();
}
export function priceBooking(input: unknown, prices: RentalPrices = RENTAL_PRICES) {
  if (!object(input) || !object(input.quantities)) throw new BookingInputError('Please review your rental selection.');
  if (Object.keys(input.quantities).some(key => !Object.hasOwn(RENTAL_PRICES, key)))
    throw new BookingInputError('An item is no longer available. Please review your selection.');
  const suppliedQuantities = input.quantities;
  const quantities = Object.fromEntries(Object.keys(RENTAL_PRICES).map(key => [key, quantity(suppliedQuantities[key] === undefined ? 0 : suppliedQuantities[key], 0, 10)])) as Record<Product, number>;
  const hookahs = quantities.pipe + quantities.premium;
  if (!hookahs) throw new BookingInputError('Add at least one hookah.');
  const selected = input.selectedFlavours ?? [];
  if (!Array.isArray(selected)) throw new BookingInputError('Please review your selected flavours.');
  const byName = new Map<string, number>();
  for (const item of selected) {
    // Older drafts used a string for a single flavour unit.
    if (typeof item !== 'string' && !object(item)) throw new BookingInputError('Please review your selected flavours.');
    const name = text(typeof item === 'string' ? item : item.name, 100);
    if (!FLAVOURS.has(name)) throw new BookingInputError('A flavour is no longer available. Please select it again or suggest it.');
    const count = quantity(typeof item === 'string' ? 1 : item.quantity, 1);
    byName.set(name, quantity((byName.get(name) || 0) + count, 1));
  }
  const selectedFlavours: Flavour[] = Array.from(byName, ([name, quantity]) => ({ name, quantity }));
  const units = quantity(selectedFlavours.reduce((sum, item) => sum + item.quantity, 0), 0);
  const suggested = input.suggestedFlavours ?? [];
  if (!Array.isArray(suggested)) throw new BookingInputError('Please review your suggested flavours.');
  const suggestedFlavours = suggested.map(item => {
    if (!object(item)) throw new BookingInputError('Please review your suggested flavours.');
    return { name: text(item.name, 100), quantity: quantity(item.quantity, 1), details: item.details === undefined || item.details === '' ? '' : text(item.details, 500) };
  });
  const additionalFlavourUnits = Math.max(0, units - hookahs);
  const totalCents = Object.entries(prices).reduce((sum, [key, price]) => sum + quantities[key as Product] * Math.round(price * 100), 0) + additionalFlavourUnits * EXTRA_FLAVOUR_PRICE * 100;
  quantity(totalCents, 0);
  const total = totalCents / 100;
  // Never silently save an amount the customer did not see and accept.
  if (typeof input.total !== 'number' || !Number.isFinite(input.total) || input.total !== total)
    throw new BookingInputError('Your session price has changed or is invalid. Refresh checkout and review the total before trying again.', 409);
  if (typeof input.delivery !== 'boolean') throw new BookingInputError('Choose delivery or collection.');
  const deliveryFee = input.delivery ? input.deliveryFee : 0;
  if (input.delivery && deliveryFee !== 250 && deliveryFee !== 350)
    throw new BookingInputError('Calculate the delivery fee before checkout.');
  return { quantities, selectedFlavours, suggestedFlavours, total, deliveryFee: deliveryFee as number, unitPrices: prices, extraFlavourPrice: EXTRA_FLAVOUR_PRICE };
}
