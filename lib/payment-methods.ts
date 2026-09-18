export const paymentMethods = {
  online: 'Pay online',
  cash_on_delivery: 'Cash on delivery',
  card_on_delivery: 'Card on delivery',
} as const;
export type PaymentMethod = keyof typeof paymentMethods;
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && Object.hasOwn(paymentMethods, value);
}
export function paymentLabel(value?: string | null) {
  return isPaymentMethod(value) ? paymentMethods[value] : value === 'eft' ? 'EFT' : value === 'yoco' ? 'Online card payment' : 'Not specified';
}
export function payOnArrival(value?: string | null) {
  return value === 'cash_on_delivery' || value === 'card_on_delivery';
}
