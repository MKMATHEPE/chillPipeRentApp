'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export type EquipmentId = 'classic' | 'premium' | 'stove' | 'tongs';
export type Equipment = { id: EquipmentId; name: string; total: number; unavailable: number; price: number | null };
export type Allocation = { reserved: number; out: number };
export const demoEquipment: Equipment[] = [
  { id: 'classic', name: 'Classic hookah', total: 6, unavailable: 0, price: 550 },
  { id: 'premium', name: 'Premium hookah', total: 4, unavailable: 0, price: 800 },
  { id: 'stove', name: 'Coal stove', total: 3, unavailable: 0, price: 200 },
  { id: 'tongs', name: 'Tongs', total: 10, unavailable: 0, price: null },
];
export const demoRequirements: Record<string, Partial<Record<EquipmentId, number>>> = {
  'DEMO-001': { classic: 2, tongs: 2 },
  'DEMO-002': { premium: 1, stove: 1, tongs: 1 },
  'DEMO-003': { classic: 1, tongs: 1 },
  'DEMO-004': { premium: 1, tongs: 1 },
};
export function equipmentAllocation(bookings: { id: string; status: string }[], id: EquipmentId): Allocation {
  return bookings.reduce((a, b) => {
    const quantity = demoRequirements[b.id]?.[id] ?? 0;
    if (b.status === 'Approved') a.reserved += quantity;
    if (b.status === 'Handover' || b.status === 'Returned') a.out += quantity;
    return a;
  }, { reserved: 0, out: 0 });
}

export default function Inventory({ equipment, allocations, onSave }: {
  equipment: Equipment[]; allocations: Record<EquipmentId, Allocation>;
  onSave: (item: Equipment) => void;
}) {
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [stock, setStock] = useState('');
  const [unavailable, setUnavailable] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  function edit(item: Equipment) {
    setEditing(item); setStock(String(item.total)); setUnavailable(String(item.unavailable)); setPrice(String(item.price ?? '')); setError('');
  }
  function save() {
    if (!editing) return;
    const total = Number(stock), blocked = Number(unavailable), amount = Number(price);
    const held = allocations[editing.id].reserved + allocations[editing.id].out;
    if (!stock.trim() || !unavailable.trim() || !Number.isSafeInteger(total) || !Number.isSafeInteger(blocked) || total < 0 || blocked < 0 || total > 9999) {
      setError('Enter whole stock quantities between 0 and 9,999.'); return;
    }
    if (total < held + blocked) { setError(`Keep at least ${held + blocked} units: ${held} reserved or out, plus ${blocked} unavailable.`); return; }
    if (editing.price !== null && (!price.trim() || !Number.isFinite(amount) || amount <= 0 || amount > 999999 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001)) {
      setError('Enter a price above R0 with no more than two decimal places.'); return;
    }
    onSave({ ...editing, total, unavailable: blocked, price: editing.price === null ? null : amount }); setEditing(null);
  }
  return <section className="cp-inventory" aria-label="Equipment inventory">
    {equipment.map(item => {
      const { reserved, out } = allocations[item.id];
      return <article className="cp-equipment" key={item.id} aria-label={item.name}>
        <div className="cp-equipment-top"><h2>{item.name} <span>· {item.price === null ? 'Included' : `R${item.price.toLocaleString('en-ZA')}`}</span></h2><button onClick={() => edit(item)} aria-label={`Edit ${item.name}`}>Edit</button></div>
        <dl>{[['Available', item.total - item.unavailable - reserved - out], ['Reserved', reserved], ['Out', out], ['Unavailable', item.unavailable]].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
      </article>;
    })}
    <details className="cp-stock-help"><summary>How stock works</summary><p className="cp-inventory-note">Approval reserves equipment; handover marks it out. Out includes returns awaiting inspection. Completing a booking releases its stock. Tongs are included with each hookah. Reservations hold stock until completion.</p></details>
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="cp-confirm cp-inventory-dialog"><DialogTitle>Edit {editing?.name.toLowerCase()}</DialogTitle><DialogDescription>Customer prices and existing booking totals will not change.</DialogDescription><form onSubmit={e => { e.preventDefault(); save(); }}>
      <label>Total stock<input type="number" min="0" max="9999" step="1" value={stock} onChange={e => setStock(e.target.value)} /></label>
      <label>Unavailable units<input type="number" min="0" step="1" value={unavailable} onChange={e => setUnavailable(e.target.value)} /></label>
      <p className="cp-inventory-note">Use unavailable for damaged equipment or maintenance. Reserved and out quantities are controlled by bookings.</p>
      {editing?.price !== null && <label>Rental price (R)<input type="number" min="0.01" max="999999" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label>}
      {error && <p className="cp-stock-error" role="alert">{error}</p>}
      <div className="cp-actions"><button type="button" className="cp-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="cp-primary">Save changes</button></div>
    </form></DialogContent></Dialog>
  </section>;
}
