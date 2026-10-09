import { paymentLabel } from './payment-methods';

export type Status = 'Pending' | 'Approved' | 'Handover' | 'Returned' | 'Completed' | 'Declined' | 'Cancelled' | 'Expired';
export type AdminBooking = {
  id: string; version: number; rawStatus: string; customerId: string; name: string; phone: string;
  rentalStart: string; date: string; mode: string; address: string; payment: string; paid: boolean;
  paidAt?: number; handedOverAt?: number; completedAt?: number; closedAt?: number; status: Status;
  items: [string, number][]; fee: number; reason?: string; history: string[];
  flavours: string; suggestions: string; notes: string; quantities: Record<string, number>;
};
const labels: Record<string, Status> = { awaiting_review: 'Pending', approved: 'Approved', payment_review: 'Approved', paid: 'Approved', handed_over: 'Handover', returned: 'Returned', complete: 'Completed', declined: 'Declined', cancelled: 'Cancelled', expired: 'Expired' };
export const transition: Record<string, string[]> = {
  awaiting_review: ['approved', 'declined'], approved: ['paid'], payment_review: ['paid'],
  paid: ['handed_over'], handed_over: ['returned'], returned: ['complete'],
};
export const actionLabels: Record<string, string> = { approved: 'Approved', declined: 'Declined', paid: 'Payment recorded', handed_over: 'Handover', returned: 'Returned', complete: 'Completed' };
const prices: Record<string, number> = { pipe: 650, premium: 850, coalPack: 30, stove: 200 };
const names: Record<string, string> = { pipe: 'Classic hookah', premium: 'Premium hookah', coalPack: 'Coconut coals · 8 pieces', stove: 'Coal stove' };
const parse = (value: unknown, fallback: any) => { try { return JSON.parse(String(value)); } catch { return fallback; } };
const list = (value: any) => Array.isArray(value) ? value : [];
const flavourText = (value: any) => list(value).map(item => typeof item === 'string' ? `${item} × 1` : `${item.name} × ${item.quantity || 1}${item.details ? ` (${item.details})` : ''}`).join(' · ');
export function toAdminBooking(row: Record<string, any>): AdminBooking {
  const order = parse(row.order_json, {});
  const quantities = order.quantities || {};
  const items: [string, number][] = Object.entries(prices).filter(([key]) => Number(quantities[key]) > 0).map(([key, price]) => [`${names[key]} × ${quantities[key]}`, (order.unitPrices?.[key] ?? price) * Number(quantities[key])]);
  const units = list(order.selectedFlavours).reduce((sum: number, item: any) => sum + (typeof item === 'string' ? 1 : Number(item.quantity) || 0), 0);
  const extra = Math.max(0, units - (Number(quantities.pipe) || 0) - (Number(quantities.premium) || 0));
  if (extra) items.push([`Additional flavour units × ${extra}`, extra * (order.extraFlavourPrice ?? 50)]);
  // Keep the stored total authoritative when historical pricing differs.
  const difference = (Math.round(Number(row.rental_total)*100) - items.reduce((sum, [, price]) => sum + Math.round(price*100), 0))/100;
  if (difference) items.push(['Recorded pricing adjustment', difference]);
  if (Number(row.deposit) > 0) items.push(['Historical refundable deposit', Number(row.deposit)]);
  const start = String(row.rental_date);
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(start) ? start : `${start}+02:00`);
  const validDate = !Number.isNaN(date.valueOf());
  const rentalStart = validDate ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Johannesburg', dateStyle: 'short', timeStyle: 'short' }).format(date).replace(' ', 'T') : start;
  const history = list(parse(row.activity_json, [])).map((entry: any) => `${entry.label} · ${new Date(entry.at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' })}`);
  return {
    id: row.reference, version: Number(row.version), rawStatus: row.status,
    customerId: String(row.phone).replace(/\D/g, '').replace(/^0/, '27'),
    name: row.customer_name, phone: row.phone, rentalStart,
    date: validDate ? `${date.toLocaleDateString('en-GB', { timeZone: 'Africa/Johannesburg', day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString('en-GB', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' })}` : start,
    mode: order.delivery ? 'Delivery & collection' : 'Customer collection', address: row.location,
    payment: paymentLabel(row.payment_method), paid: ['paid', 'handed_over', 'returned', 'complete'].includes(row.status),
    paidAt: row.paid_at ?? undefined, completedAt: row.completed_at ?? undefined,
    handedOverAt: list(parse(row.activity_json, [])).find((entry: any) => entry?.label === 'Handover' && typeof entry.at === 'number' && Number.isFinite(entry.at))?.at,
    closedAt: ['complete', 'declined', 'cancelled', 'expired'].includes(row.status) ? row.updated_at : undefined,
    status: labels[row.status] || 'Pending', items, fee: Number(row.delivery_fee) || 0,
    reason: row.decline_reason || undefined, history: ['Request received', ...history],
    flavours: flavourText(order.selectedFlavours) || 'None selected', suggestions: flavourText(order.suggestedFlavours), notes: row.notes || '', quantities,
  };
}
