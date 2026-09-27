'use client';

import { useState } from 'react';
import { Wallet, Users, Tag, Package } from 'lucide-react';

type Record = { id: string; customerId?: string; status: string; paid: boolean; paidAt?: number; completedAt?: number; items: [string, number][]; fee: number };
const money = (value: number) => `R${value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;
const day = (time: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time));
const shift = (key: string, days: number) => new Date(Date.parse(`${key}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const total = (b: Record) => b.items.reduce((sum, [, value]) => sum + value, b.fee);

export default function Performance({ bookings }: { bookings: Record[] }) {
  const [today] = useState(() => day(Date.now()));
  const [period, setPeriod] = useState('This week');
  const [metric, setMetric] = useState('Money');
  const [start, setStart] = useState(today.slice(0, 8) + '01');
  const [end, setEnd] = useState(today);
  const [picked, setPicked] = useState<number | null>(null);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const from = period === 'Custom' ? start : period === 'This month' ? today.slice(0, 8) + '01' : shift(today, -(weekday + 6) % 7);
  const to = period === 'Custom' ? end : today;
  const valid = !!from && !!to && from <= to && to <= today;
  const inside = (time?: number) => valid && time !== undefined && day(time) >= from && day(time) <= to;
  const paid = bookings.filter(b => b.paid && inside(b.paidAt));
  const completed = bookings.filter(b => b.status === 'Completed' && inside(b.completedAt));
  const received = paid.reduce((sum, b) => sum + total(b), 0);
  const quantities = { Classic: 0, Premium: 0 };
  completed.forEach(b => b.items.forEach(([label]) => { for (const name of ['Classic', 'Premium'] as const) if (label.startsWith(`${name} hookah`)) quantities[name] += Number(label.match(/×\s*(\d+)/)?.[1] ?? 0); }));
  const returning = new Set(completed.filter(b => b.customerId && bookings.some(old => old.id !== b.id && old.customerId === b.customerId && old.status === 'Completed' && old.completedAt !== undefined && old.completedAt < b.completedAt!)).map(b => b.customerId)).size;
  const days = valid ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1 : 0;
  const group = Math.max(1, Math.ceil(days / 7));
  const bars = Array.from({ length: Math.ceil(days / group) }, (_, i) => {
    const first = shift(from, i * group), last = shift(from, Math.min(days - 1, (i + 1) * group - 1));
    const within = (time: number) => day(time) >= first && day(time) <= last;
    return { first, last, value: metric === 'Money' ? paid.filter(b => within(b.paidAt!)).reduce((sum, b) => sum + total(b), 0) : completed.filter(b => within(b.completedAt!)).length };
  });
  const max = Math.max(1, ...bars.map(b => b.value));
  const label = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const format = (value: number) => metric === 'Money' ? money(value) : `${value} rentals`;
  const selected = picked === null ? undefined : bars[picked];
  return <section className="cp-performance" aria-label="Performance results">
    <div className="cp-booking-views" role="group" aria-label="Reporting period">{['This week', 'This month', 'Custom'].map(p => <button key={p} aria-pressed={period === p} onClick={() => { setPeriod(p); setPicked(null); }}>{p}</button>)}</div>
    {period === 'Custom' && <div className="cp-report-dates"><label>From<input type="date" value={start} max={today} onChange={e => { setStart(e.target.value); setPicked(null); }} /></label><label>To<input type="date" value={end} max={today} onChange={e => { setEnd(e.target.value); setPicked(null); }} /></label></div>}
    {!valid ? <p role="alert">Choose a valid date range ending today or earlier.</p> : <>
      <p className="cp-report-range">{label(from)} – {label(to)} · South Africa time</p>
      <div className="cp-report-kpis"><article><Wallet size={20} /><span>Money received</span><strong>{money(received)}</strong></article><article><Users size={20} /><span>Completed rentals</span><strong>{completed.length}</strong></article></div>
      <section className="cp-report-card"><div className="cp-report-chart-heading"><h2>Results</h2><div role="group" aria-label="Chart metric">{['Money', 'Rentals'].map(m => <button key={m} aria-pressed={metric === m} onClick={() => { setMetric(m); setPicked(null); }}>{m}</button>)}</div></div>
        <p className="cp-report-selection" aria-live="polite">{selected ? `${label(selected.first)}${selected.first !== selected.last ? ` – ${label(selected.last)}` : ''}: ${format(selected.value)}` : bars.some(b => b.value) ? 'Tap a bar to see the result' : `No ${metric === 'Money' ? 'payments recorded' : 'completed rentals'} in this period`}</p>
        <div className="cp-report-bars">{bars.map((bar, i) => <button key={bar.first} aria-label={`${label(bar.first)} to ${label(bar.last)}: ${format(bar.value)}`} aria-pressed={picked === i} onClick={() => setPicked(i)}><span className="cp-report-bar-track"><i style={{ height: `${bar.value / max * 100}%` }} /></span><small>{group === 1 ? new Date(`${bar.first}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }) : label(bar.first)}</small></button>)}</div>
      </section>
      <dl className="cp-report-card cp-report-stats"><div><Tag size={18} /><dt>Average rental value</dt><dd>{completed.length ? money(completed.reduce((sum, b) => sum + total(b), 0) / completed.length) : '—'}</dd></div><div><Package size={18} /><dt>Hookahs rented</dt><dd>{quantities.Classic + quantities.Premium}</dd></div><div><Users size={18} /><dt>Repeat customers</dt><dd>{returning}</dd></div></dl>
      <section className="cp-report-card"><h2>Most rented</h2>{(['Classic', 'Premium'] as const).map(name => <div className="cp-report-popular" key={name}><span>{name}</span><div><i style={{ width: `${quantities[name] / Math.max(1, quantities.Classic, quantities.Premium) * 100}%` }} /></div><strong>{quantities[name]}</strong></div>)}</section>
      <details className="cp-stock-help"><summary>How results are calculated</summary><p>Money received includes full payments recorded in this period, including delivery and add-ons. Rentals, rental value and equipment counts use completed bookings. One completed booking is one rental. Repeat customers have an earlier completed booking. Dates use South Africa time.</p></details>
    </>}
  </section>;
}
