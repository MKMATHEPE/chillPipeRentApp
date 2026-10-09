'use client';

import { useState } from 'react';
import { Wallet, Users, Tag, Package, Info } from 'lucide-react';
import { performanceReport, earliestReportDay, reportDay as day, shiftDay as shift, type ReportBooking } from '@/lib/performance';

const money = (value: number) => `R${value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;

export default function Performance({ bookings }: { bookings: ReportBooking[] }) {
  const today = day(Date.now());
  const [period, setPeriod] = useState('Week');
  const [metric, setMetric] = useState('Money');
  const [start, setStart] = useState(today.slice(0, 8) + '01');
  const [end, setEnd] = useState(today);
  const [picked, setPicked] = useState<number | null>(null);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const from = period === 'Custom' ? start : period === 'All time' ? earliestReportDay(bookings,today) : period === 'Month' ? today.slice(0, 8) + '01' : shift(today, -(weekday + 6) % 7);
  const to = period === 'Custom' ? end : today;
  const {valid,completed,statusValues,closedBookingValue,handedOver,received,average,quantities,returning,group,undated,bars:results} = performanceReport(bookings,from,to,today);
  const bars = results.map(bar => ({...bar,value:metric === 'Money' ? bar.money : bar.rentals}));
  const max = Math.max(1, ...bars.map(b => b.value));
  const label = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const format = (value: number) => metric === 'Money' ? money(value) : `${value} rentals`;
  const selected = picked === null ? undefined : bars[picked];
  return <section className="cp-performance" aria-label="Performance results">
    <div className="cp-booking-views" role="group" aria-label="Reporting period">{['Week', 'Month', 'All time', 'Custom'].map(p => <button key={p} aria-pressed={period === p} onClick={() => { setPeriod(p); setPicked(null); }}>{p}</button>)}</div>
    {period === 'Custom' && <div className="cp-report-dates"><label>From<input type="date" value={start} max={today} onChange={e => { setStart(e.target.value); setPicked(null); }} /></label><label>To<input type="date" value={end} max={today} onChange={e => { setEnd(e.target.value); setPicked(null); }} /></label></div>}
    {!valid ? <p role="alert">Choose a valid date range ending today or earlier.</p> : <>
      <p className="cp-report-range">{label(from)} – {label(to)} · South Africa time</p>
      {undated > 0 && <p className="cp-inventory-note" role="status">{undated} older booking{undated === 1 ? ' has' : 's have'} missing event dates. Undated events are excluded from date-based results.</p>}
      <div className="cp-report-kpis"><article><Wallet size={20} /><span>Money received</span><strong>{money(received)}</strong></article><article><Users size={20} /><span>Completed rentals</span><strong>{completed.length}</strong></article></div>
      <section className="cp-report-card"><div className="cp-report-chart-heading"><h2>Results</h2><div role="group" aria-label="Chart metric">{['Money', 'Rentals'].map(m => <button key={m} aria-pressed={metric === m} onClick={() => { setMetric(m); setPicked(null); }}>{m}</button>)}</div></div>
        <p className="cp-report-selection" aria-live="polite">{selected ? `${label(selected.first)}${selected.first !== selected.last ? ` – ${label(selected.last)}` : ''}: ${format(selected.value)}` : bars.some(b => b.value) ? 'Tap a bar to see the result' : `No ${metric === 'Money' ? 'payments recorded' : 'completed rentals'} in this period`}</p>
        <div className="cp-report-bars">{bars.map((bar, i) => <button key={bar.first} aria-label={`${label(bar.first)} to ${label(bar.last)}: ${format(bar.value)}`} aria-pressed={picked === i} onClick={() => setPicked(i)}><span className="cp-report-bar-track"><i style={{ height: `${bar.value / max * 100}%` }} /></span><small>{group === 1 ? new Date(`${bar.first}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }) : label(bar.first)}</small></button>)}</div>
      </section>
      <section className="cp-report-card" aria-labelledby="booking-value-heading">
        <div className="cp-report-value-heading"><h2 id="booking-value-heading">Booking value by status</h2><div className="cp-report-value-total"><span>Total</span><strong>{money(closedBookingValue)}</strong></div>
          <details className="cp-report-value-help"><summary aria-label="About booking values"><Info size={18} /></summary><p>Booking values—not money received. Includes delivery and extras. Uses completion, decline, cancellation or expiry date within the selected period.</p></details>
        </div>
        <dl className="cp-report-value-grid">
          {statusValues.map(row => <div key={row.status}><dt>{row.status}<span>{row.count} booking{row.count === 1 ? '' : 's'}</span></dt><dd>{money(row.value)}</dd></div>)}
        </dl>
      </section>
      <dl className="cp-report-card cp-report-stats"><div><Tag size={18} /><dt>Average rental value</dt><dd>{average === null ? '—' : money(average)}</dd></div><div><Package size={18} /><dt>Rentals handed over</dt><dd>{handedOver.length}</dd></div><div><Package size={18} /><dt>Hookahs rented</dt><dd>{quantities.Classic + quantities.Premium}</dd></div><div><Users size={18} /><dt>Repeat customers</dt><dd>{returning}</dd></div></dl>
      <section className="cp-report-card"><h2>Most rented</h2>{(['Classic', 'Premium'] as const).map(name => <div className="cp-report-popular" key={name}><span>{name}</span><div><i style={{ width: `${quantities[name] / Math.max(1, quantities.Classic, quantities.Premium) * 100}%` }} /></div><strong>{quantities[name]}</strong></div>)}</section>
      <details className="cp-stock-help"><summary>How results are calculated</summary><p>Money received uses bookings marked paid, dated when payment was recorded, including delivery and add-ons. It is gross recorded receipts, not profit or net refunds. Historical deposits remain part of their recorded totals. Handovers use the saved handover event date. Rentals, average rental value and equipment counts use completed bookings and their completion dates. One completed booking is one rental. Repeat customers have an earlier dated completed booking. Dates use South Africa time; undated events are not assigned invented dates. Expired requests are counted by their scheduled rental start date and are not completed rentals or revenue. Results refresh while this page is open.</p></details>
    </>}
  </section>;
}
