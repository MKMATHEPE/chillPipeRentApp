import { getDb } from '../db';
import type { InventorySnapshot } from './inventory';

// Conservative holds: all approved rentals reserve stock until inspected/completed.
const quantity = `CASE equipment.id
  WHEN 'classic' THEN COALESCE(json_extract(b.order_json,'$.quantities.pipe'),0)
  WHEN 'premium' THEN COALESCE(json_extract(b.order_json,'$.quantities.premium'),0)
  WHEN 'stove' THEN COALESCE(json_extract(b.order_json,'$.quantities.stove'),0)
  WHEN 'tongs' THEN COALESCE(json_extract(b.order_json,'$.quantities.pipe'),0)+COALESCE(json_extract(b.order_json,'$.quantities.premium'),0) END`;
const held = (statuses: string) => `(SELECT COALESCE(SUM(${quantity}),0) FROM bookings b WHERE b.status IN (${statuses}))`;
export const reservedSql = held("'approved','payment_review','paid'");
export const outSql = held("'handed_over','returned'");
export const heldSql = held("'approved','payment_review','paid','handed_over','returned'");
export async function ensureInventory() {
  // Confirmed by the owner. Insert missing setup only; never reset saved edits.
  await getDb().prepare(`INSERT INTO equipment (id,name,total,unavailable,price,version) VALUES
    ('classic','Classic hookah',20,0,55000,0),('premium','Premium hookah',20,0,80000,0),
    ('stove','Coal stove',10,0,20000,0),('tongs','Tongs',20,0,NULL,0)
    ON CONFLICT(id) DO NOTHING`).run();
}
export async function inventorySnapshot(): Promise<InventorySnapshot> {
  const result = await getDb().prepare(`SELECT *,${reservedSql} AS reserved,${outSql} AS out FROM equipment ORDER BY CASE id WHEN 'classic' THEN 1 WHEN 'premium' THEN 2 WHEN 'stove' THEN 3 ELSE 4 END`).all();
  return {
    equipment: result.results.map((r: any) => ({ id:r.id,name:r.name,total:r.total,unavailable:r.unavailable,price:r.price === null ? null : r.price/100,version:r.version })),
    allocations: Object.fromEntries(result.results.map((r: any) => [r.id,{reserved:r.reserved,out:r.out}])) as InventorySnapshot['allocations'],
  };
}
