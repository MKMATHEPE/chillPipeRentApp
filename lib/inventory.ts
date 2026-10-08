export type EquipmentId = 'classic' | 'premium' | 'stove' | 'tongs';
export type Equipment = { id: EquipmentId; name: string; total: number; unavailable: number; price: number | null; version: number };
export type Allocation = { reserved: number; out: number };
export type InventorySnapshot = { equipment: Equipment[]; allocations: Record<EquipmentId, Allocation> };
export function requirements(q: Record<string, number>): Record<EquipmentId, number> {
  const classic = Number(q.pipe ?? 0), premium = Number(q.premium ?? 0), stove = Number(q.stove ?? 0);
  return { classic, premium, stove, tongs: classic + premium };
}

export const RENTAL_SECONDS = 24 * 60 * 60;
export function rentalEpoch(value: string): number {
  // Unzoned customer date/time values are South Africa time, never server local time.
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?([zZ]|[+-]\d{2}:\d{2})?$/.test(value)) return NaN;
  const wallClock = value.slice(0,16).replace(' ','T');
  const calendarCheck = new Date(`${wallClock}:00Z`);
  if (!Number.isFinite(calendarCheck.valueOf()) || calendarCheck.toISOString().slice(0,16) !== wallClock) return NaN;
  const zoned = /[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}+02:00`;
  return Math.floor(Date.parse(zoned) / 1000);
}

// Mirror the server's peak calculation for the selected request's shortage hint.
// The atomic server-side approval check remains authoritative.
export function windowAllocation(bookings: {rawStatus:string;rentalStart:string;quantities:Record<string,number>}[], id: EquipmentId, start: number): Allocation {
  const end = start + RENTAL_SECONDS;
  const reservations = bookings.filter(b => ['approved','payment_review','paid'].includes(b.rawStatus));
  const times = [start, ...reservations.map(b => rentalEpoch(b.rentalStart)).filter(t => t >= start && t < end)];
  const reserved = Math.max(0,...times.map(t => reservations.reduce((sum,b) => {
    const from = rentalEpoch(b.rentalStart);
    return sum + (!Number.isFinite(from) || (from <= t && from + RENTAL_SECONDS > t) ? requirements(b.quantities)[id] : 0);
  },0)));
  const out = bookings.filter(b => ['handed_over','returned'].includes(b.rawStatus)).reduce((sum,b) => sum+requirements(b.quantities)[id],0);
  return {reserved,out};
}
