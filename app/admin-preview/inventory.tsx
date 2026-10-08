'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import type { EquipmentId, Equipment, Allocation } from '@/lib/inventory';

export default function Inventory({ equipment, allocations, onSave }: {
  equipment: Equipment[]; allocations: Record<EquipmentId, Allocation>;
  onSave: (item: Equipment) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [stock, setStock] = useState('');
  const [unavailable, setUnavailable] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  function edit(item: Equipment) {
    setEditing(item); setStock(String(item.total)); setUnavailable(String(item.unavailable)); setPrice(String(item.price ?? '')); setError('');
  }
  async function save() {
    if (!editing || saving) return;
    const total = Number(stock), blocked = Number(unavailable), amount = Number(price);
    const held = allocations[editing.id].reserved + allocations[editing.id].out;
    if (!stock.trim() || !unavailable.trim() || !Number.isSafeInteger(total) || !Number.isSafeInteger(blocked) || total < 0 || blocked < 0 || total > 9999) {
      setError('Enter whole stock quantities between 0 and 9,999.'); return;
    }
    if (total < held + blocked) { setError(`Keep at least ${held + blocked} units: ${held} reserved or out, plus ${blocked} unavailable.`); return; }
    if (editing.price !== null && (!price.trim() || !Number.isFinite(amount) || amount <= 0 || amount > 999999 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001)) {
      setError('Enter a price above R0 with no more than two decimal places.'); return;
    }
    setSaving(true); setError('');
    try { await onSave({ ...editing, total, unavailable: blocked, price: editing.price === null ? null : amount }); setEditing(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save inventory.'); }
    finally { setSaving(false); }
  }
  return <section className="cp-inventory" aria-label="Equipment inventory">
    {equipment.map(item => {
      const { reserved, out } = allocations[item.id];
      return <article className="cp-equipment" key={item.id} aria-label={item.name}>
        <div className="cp-equipment-top"><h2>{item.name} <span>· {item.price === null ? 'Included' : `R${item.price.toLocaleString('en-ZA')}`}</span></h2><button onClick={() => edit(item)} aria-label={`Edit ${item.name}`}>Edit</button></div>
        <dl>{[['Available', item.total - item.unavailable - reserved - out], ['Reserved', reserved], ['Out', out], ['Unavailable', item.unavailable]].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
      </article>;
    })}
    <details className="cp-stock-help"><summary>How stock works</summary><p className="cp-inventory-note">Each rental reserves a 24-hour period in South Africa time. Separate periods can reuse equipment; overlapping rentals share the stock limit. Reserved shows the highest upcoming simultaneous demand, not the sum of all bookings. Available is the remaining capacity after that peak and equipment out. Out includes returns awaiting inspection and stays blocked until completion. Handover also checks physical stock. Tongs are included with each hookah.</p></details>
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !saving) setEditing(null); }}><DialogContent className="cp-confirm cp-inventory-dialog"><DialogTitle>Edit {editing?.name.toLowerCase()}</DialogTitle><DialogDescription>Customer prices and existing booking totals will not change.</DialogDescription><form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={saving} style={{border:0,padding:0,margin:0,minWidth:0}}>
      <label>Total stock<input type="number" min="0" max="9999" step="1" value={stock} onChange={e => setStock(e.target.value)} /></label>
      <label>Unavailable units<input type="number" min="0" step="1" value={unavailable} onChange={e => setUnavailable(e.target.value)} /></label>
      <p className="cp-inventory-note">Use unavailable for damaged equipment or maintenance. Reserved and out quantities are controlled by bookings.</p>
      {editing?.price !== null && <label>Rental price (R)<input type="number" min="0.01" max="999999" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label>}
      {error && <p className="cp-stock-error" role="alert">{error}</p>}
      <div className="cp-actions"><button type="button" className="cp-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="cp-primary">{saving ? 'Saving…' : 'Save changes'}</button></div>
    </fieldset></form></DialogContent></Dialog>
  </section>;
}
