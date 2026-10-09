import type { AdminBooking } from './admin-bookings';

export type ReportBooking = Pick<AdminBooking,'id'|'version'|'customerId'|'status'|'paid'|'paidAt'|'handedOverAt'|'completedAt'|'closedAt'|'items'|'fee'|'quantities'>;
const formatter = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'});
export const reportDay = (time: number) => formatter.format(new Date(time));
export const shiftDay = (key: string, days: number) => new Date(Date.parse(`${key}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
const validTime = (time?: number): time is number => typeof time === 'number' && Number.isFinite(time) && time > 0 && time <= 8640000000000000;
const validDay = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(Date.parse(key)) && new Date(key).toISOString().slice(0,10) === key;
export const validRange = (from: string,to: string,today: string) => validDay(from) && validDay(to) && from <= to && to <= today;
const cents = (b: ReportBooking) => Math.round(b.items.reduce((sum,[,value]) => sum+value,b.fee)*100);
const units = (value: number | undefined) => Number.isSafeInteger(value) && value! >= 0 ? value! : 0;

export function performanceReport(input: ReportBooking[],from: string,to: string,today=reportDay(Date.now())) {
  const valid = validRange(from,to,today);
  // A refreshed/paginated response must never count the same booking twice.
  const unique = new Map<string,ReportBooking>();
  input.forEach(b => { if (!unique.has(b.id) || b.version >= unique.get(b.id)!.version) unique.set(b.id,b); });
  const bookings = [...unique.values()];
  const inside = (time?: number) => valid && validTime(time) && reportDay(time) >= from && reportDay(time) <= to;
  const paid = bookings.filter(b => b.paid && inside(b.paidAt));
  const completed = bookings.filter(b => b.status === 'Completed' && inside(b.completedAt));
  const expired = bookings.filter(b => b.status === 'Expired' && inside(b.closedAt));
  const statusValues = (['Completed','Declined','Cancelled','Expired'] as const).map(status => ({
    status,
    value: bookings.filter(b => b.status === status && inside(status === 'Completed' ? b.completedAt : b.closedAt)).reduce((sum,b) => sum+cents(b),0)/100,
  }));
  const closedBookingValue = statusValues.reduce((sum,row) => sum+Math.round(row.value*100),0)/100;
  const handedOver = bookings.filter(b => inside(b.handedOverAt));
  const quantities = {Classic:0,Premium:0};
  completed.forEach(b => { quantities.Classic += units(b.quantities.pipe); quantities.Premium += units(b.quantities.premium); });
  const returning = new Set(completed.filter(b => b.customerId && bookings.some(old => old.id !== b.id && old.customerId === b.customerId && old.status === 'Completed' && validTime(old.completedAt) && old.completedAt < b.completedAt!)).map(b => b.customerId)).size;
  const days = valid ? Math.round((Date.parse(to)-Date.parse(from))/86400000)+1 : 0;
  const group = Math.max(1,Math.ceil(days/7));
  const bars = Array.from({length:Math.ceil(days/group)},(_,i) => {
    const first=shiftDay(from,i*group),last=shiftDay(from,Math.min(days-1,(i+1)*group-1));
    const within=(time:number) => reportDay(time) >= first && reportDay(time) <= last;
    return {first,last,money:paid.filter(b => within(b.paidAt!)).reduce((sum,b) => sum+cents(b),0)/100,rentals:completed.filter(b => within(b.completedAt!)).length};
  });
  const undated = bookings.filter(b => (b.paid && !validTime(b.paidAt)) || (b.status === 'Completed' && !validTime(b.completedAt)) || (['Declined','Cancelled','Expired'].includes(b.status) && !validTime(b.closedAt)) || (['Handover','Returned','Completed'].includes(b.status) && !validTime(b.handedOverAt))).length;
  return {valid,paid,completed,expired,statusValues,closedBookingValue,handedOver,received:paid.reduce((sum,b) => sum+cents(b),0)/100,average:completed.length ? completed.reduce((sum,b) => sum+cents(b),0)/100/completed.length : null,quantities,returning,bars,group,undated};
}
