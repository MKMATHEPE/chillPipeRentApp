import { getDb } from '../db';
import type { InventorySnapshot } from './inventory';
import { RENTAL_SECONDS } from './inventory';
import { RENTAL_PRICES, type RentalPrices } from './booking-pricing';

// Every query is correlated with the enclosing equipment row.
const quantity = `CASE equipment.id
  WHEN 'classic' THEN COALESCE(json_extract(b.order_json,'$.quantities.pipe'),0)
  WHEN 'premium' THEN COALESCE(json_extract(b.order_json,'$.quantities.premium'),0)
  WHEN 'stove' THEN COALESCE(json_extract(b.order_json,'$.quantities.stove'),0)
  WHEN 'tongs' THEN COALESCE(json_extract(b.order_json,'$.quantities.pipe'),0)+COALESCE(json_extract(b.order_json,'$.quantities.premium'),0) END`;
const held = (statuses: string) => `(SELECT COALESCE(SUM(${quantity}),0) FROM bookings b WHERE b.status IN (${statuses}))`;
export const outSql = held("'handed_over','returned'");
const planned = "'approved','payment_review','paid'";
const epoch = (alias: string) => `unixepoch(CASE WHEN substr(${alias}.rental_date,-1) IN ('Z','z') OR substr(${alias}.rental_date,-6,1) IN ('+','-') THEN ${alias}.rental_date ELSE ${alias}.rental_date||'+02:00' END)`;
export function reservedPeakSql(start: number, end: number) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start) throw new Error('Invalid rental window');
  // Demand can only increase at a reservation start. Count [start,end), so an
  // exact return-time boundary can be reused. Do NOT sum all overlapping rows:
  // two bookings that do not overlap each other must not be counted together.
  return `(SELECT COALESCE(MAX((SELECT COALESCE(SUM(${quantity}),0) FROM bookings b
    WHERE b.status IN (${planned}) AND (${epoch('b')} IS NULL OR (${epoch('b')} <= slots.t AND ${epoch('b')}+${RENTAL_SECONDS} > slots.t)))),0)
    FROM (SELECT ${start} AS t UNION SELECT ${epoch('s')} AS t FROM bookings s
      WHERE s.status IN (${planned}) AND ${epoch('s')} >= ${start} AND ${epoch('s')} < ${end}) slots)`;
}
export function heldSql(start = Math.floor(Date.now()/1000), end = 253402300799) {
  // Out/awaiting-inspection equipment has no guaranteed release until completed.
  return `(${reservedPeakSql(start,end)}+${outSql})`;
}
export async function ensureInventory() {
  // Confirmed by the owner. Insert missing setup only; never reset saved edits.
  await getDb().prepare(`INSERT INTO equipment (id,name,total,unavailable,price,version) VALUES
    ('classic','Classic hookah',20,0,65000,0),('premium','Premium hookah',20,0,85000,0),
    ('stove','Coal stove',10,0,20000,0),('tongs','Tongs',20,0,NULL,0)
    ON CONFLICT(id) DO NOTHING`).run();
  // Upgrade untouched legacy setup only. Never overwrite owner-edited rows.
  await getDb().prepare(`UPDATE equipment SET price=CASE id WHEN 'classic' THEN 65000 ELSE 85000 END,version=version+1
    WHERE version=0 AND ((id='classic' AND price=55000) OR (id='premium' AND price=80000))`).run();
}
export async function rentalPrices(): Promise<RentalPrices> {
  await ensureInventory();
  const result = await getDb().prepare("SELECT id,price FROM equipment WHERE id IN ('classic','premium','stove')").all();
  const saved = Object.fromEntries(result.results.map((row: any) => [row.id,row.price]));
  if (!['classic','premium','stove'].every(id => Number.isSafeInteger(saved[id]) && saved[id] > 0)) throw new Error('Equipment prices unavailable');
  return {...RENTAL_PRICES,pipe:saved.classic/100,premium:saved.premium/100,stove:saved.stove/100};
}
export async function inventorySnapshot(): Promise<InventorySnapshot> {
  const result = await getDb().prepare(`SELECT *,${reservedPeakSql(Math.floor(Date.now()/1000),253402300799)} AS reserved,${outSql} AS out FROM equipment ORDER BY CASE id WHEN 'classic' THEN 1 WHEN 'premium' THEN 2 WHEN 'stove' THEN 3 ELSE 4 END`).all();
  return {
    equipment: result.results.map((r: any) => ({ id:r.id,name:r.name,total:r.total,unavailable:r.unavailable,price:r.price === null ? null : r.price/100,version:r.version })),
    allocations: Object.fromEntries(result.results.map((r: any) => [r.id,{reserved:r.reserved,out:r.out}])) as InventorySnapshot['allocations'],
  };
}
