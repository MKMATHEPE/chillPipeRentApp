export type EquipmentId = 'classic' | 'premium' | 'stove' | 'tongs';
export type Equipment = { id: EquipmentId; name: string; total: number; unavailable: number; price: number | null; version: number };
export type Allocation = { reserved: number; out: number };
export type InventorySnapshot = { equipment: Equipment[]; allocations: Record<EquipmentId, Allocation> };
export function requirements(q: Record<string, number>): Record<EquipmentId, number> {
  const classic = Number(q.pipe ?? 0), premium = Number(q.premium ?? 0), stove = Number(q.stove ?? 0);
  return { classic, premium, stove, tongs: classic + premium };
}
