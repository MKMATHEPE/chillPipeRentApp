'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, ClipboardList, Inbox, MapPin, Phone, Truck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import './preview.css';

type Status = 'Pending' | 'Approved' | 'Handover' | 'Returned' | 'Completed' | 'Declined';
type Booking = { id: string; name: string; phone: string; date: string; mode: string; address: string; payment: string; paid: boolean; status: Status; items: [string, number][]; fee: number; reason?: string; history: string[] };
const samples: Booking[] = [
  { id: 'DEMO-001', name: 'Lerato Mokoena', phone: 'Demo contact', date: '26 Sept 2026 · 14:00–14:30', mode: 'Delivery & collection', address: 'Waterfall, Midrand · Sample address', payment: 'Card on delivery', paid: false, status: 'Pending', items: [['Classic hookah × 2', 1100], ['Coconut coals · 8 pieces × 1', 30]], fee: 250, history: ['Request received · Demo booking'] },
  { id: 'DEMO-002', name: 'Thabo Nkosi', phone: 'Demo contact', date: '26 Sept 2026 · 16:00–16:30', mode: 'Customer collection', address: 'Bel Aire, Langeveld Street, Vorna Valley', payment: 'Pay online', paid: false, status: 'Pending', items: [['Premium hookah × 1', 800], ['Coal stove × 1', 200]], fee: 0, history: ['Request received · Demo booking'] },
  { id: 'DEMO-003', name: 'Alex Jacobs', phone: 'Demo contact', date: '27 Sept 2026 · 12:00–12:30', mode: 'Delivery & collection', address: 'Sandton · Sample address', payment: 'Cash on delivery', paid: false, status: 'Approved', items: [['Classic hookah × 1', 550]], fee: 350, history: ['Request received · Demo booking', 'Approved · Demo booking'] },
  { id: 'DEMO-004', name: 'Sam Dlamini', phone: 'Demo contact', date: '25 Sept 2026 · 15:00–15:30', mode: 'Customer collection', address: 'Bel Aire, Langeveld Street, Vorna Valley', payment: 'Pay online', paid: true, status: 'Returned', items: [['Premium hookah × 1', 800]], fee: 0, history: ['Approved · Demo booking', 'Payment recorded · Demo booking', 'Handover · Demo booking', 'Returned · Demo booking'] },
];
const money = (n: number) => `R${n.toLocaleString('en-ZA')}`;
const total = (b: Booking) => b.items.reduce((sum, item) => sum + item[1], b.fee);
const nextStatus: Partial<Record<Status, Status>> = { Approved: 'Handover', Handover: 'Returned', Returned: 'Completed' };

export default function AdminPreview() {
  const [bookings, setBookings] = useState(samples);
  const [tab, setTab] = useState<'Requests' | 'Bookings'>('Requests');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<string | null>('DEMO-001');
  const [mobileDetails, setMobileDetails] = useState(false);
  const [action, setAction] = useState<Status | 'Paid' | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const requests = bookings.filter(b => b.status === 'Pending');
  const visible = bookings.filter(b => tab === 'Requests' ? b.status === 'Pending' : b.status !== 'Pending' && (filter === 'All' || (filter === 'Unpaid' ? !b.paid && b.status !== 'Declined' : b.status === filter)));
  const booking = visible.find(b => b.id === selected) ?? visible[0];
  function changeTab(value: 'Requests' | 'Bookings') { setTab(value); setFilter('All'); setSelected(null); setMobileDetails(false); }
  function confirm() {
    if (!booking || !action || (action === 'Declined' && !reason.trim()) || (action === 'Completed' && !booking.paid)) return;
    const entry = `${action === 'Paid' ? 'Payment recorded' : action} · ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    setBookings(all => all.map(b => b.id !== booking.id ? b : { ...b, status: action === 'Paid' ? b.status : action, paid: action === 'Paid' ? true : b.paid, reason: action === 'Declined' ? reason.trim() : b.reason, history: [...b.history, entry] }));
    setNotice(`${booking.id}: ${action === 'Paid' ? 'payment recorded' : action.toLowerCase()}. Preview only—no customer was notified.`);
    setAction(null); setReason(''); setMobileDetails(false);
  }
  return <main className="cp-admin">
    <header className="cp-admin-header"><div className="cp-admin-brand"><img src="/chill-pipe-logo.webp" alt="The Chill Pipe" /><span>ADMIN</span></div><span className="cp-owner">Owner workspace</span></header>
    <div className="cp-preview-note">Design preview · Sample bookings only · Changes reset on refresh</div>
    <div className="cp-admin-shell">
      <nav className="cp-admin-tabs" aria-label="Admin sections">{(['Requests', 'Bookings'] as const).map(t => <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => changeTab(t)}>{t === 'Requests' ? <Inbox size={19} /> : <ClipboardList size={19} />}{t}{t === 'Requests' && <span>{requests.length}</span>}</button>)}</nav>
      <div className="cp-admin-heading"><div><p>THE CHILL PIPE / OPERATIONS</p><h1>{tab === 'Requests' ? 'Booking requests' : 'Your bookings'}</h1></div><span>{visible.length} {tab === 'Requests' ? 'awaiting review' : 'bookings'}</span></div>
      <p className="cp-admin-notice" role="status">{notice || (tab === 'Requests' ? 'Review the details. Make the call.' : 'From approval to the final return.')}</p>
      {tab === 'Bookings' && <div className="cp-filters" aria-label="Filter bookings">{['All', 'Approved', 'Handover', 'Returned', 'Completed', 'Declined', 'Unpaid'].map(f => <button key={f} aria-pressed={filter === f} onClick={() => { setFilter(f); setSelected(null); setMobileDetails(false); }}>{f}</button>)}</div>}
      <div className={`cp-admin-workspace ${mobileDetails ? 'show-detail' : ''}`}>
        <section className="cp-booking-list" aria-label={tab}>
          {visible.map(b => <button className={`cp-booking-row ${booking?.id === b.id ? 'is-selected' : ''}`} key={b.id} onClick={() => { setSelected(b.id); setMobileDetails(true); }}><div className="cp-row-top"><span>{b.id}</span><span className="cp-status">{b.status === 'Pending' ? 'Needs review' : b.status}</span></div><h2>{b.name}</h2><p>{b.date}</p><div className="cp-row-bottom"><span>{b.mode === 'Customer collection' ? <MapPin size={15} /> : <Truck size={15} />}{b.mode === 'Customer collection' ? 'Collection' : 'Delivery'}</span><strong>{money(total(b))}</strong><ChevronRight size={17} /></div></button>)}
          {!visible.length && <div className="cp-empty"><Inbox size={30} /><h2>{tab === 'Requests' ? 'All caught up' : 'No matching bookings'}</h2><p>{tab === 'Requests' ? 'New requests will appear here once live bookings are connected.' : 'Choose another filter to view your bookings.'}</p></div>}
        </section>
        {booking && <article className="cp-booking-detail">
          <button className="cp-back" onClick={() => setMobileDetails(false)}><ArrowLeft size={17} /> Back to {tab.toLowerCase()}</button>
          <div className="cp-detail-heading"><div><p>{booking.id}</p><h2>{booking.name}</h2></div><span className="cp-status">{booking.status === 'Pending' ? 'Needs review' : booking.status}</span></div>
          <div className="cp-contact"><Phone size={16} />{booking.phone}</div>
          <div className="cp-fulfilment"><div><span>Rental date & time</span><strong>{booking.date}</strong><small>24-hour rental</small></div><div><span>{booking.mode}</span><strong>{booking.address}</strong></div></div>
          <section className="cp-session"><h3>Your session</h3>{booking.items.map(([name, cost]) => <div key={name}><span>{name}</span><strong>{money(cost)}</strong></div>)}<div><span>{booking.fee ? 'Delivery & collection' : 'Customer collection'}</span><strong>{booking.fee ? money(booking.fee) : 'Included'}</strong></div><p>Included per hookah: 1 flavour · 8 coconut coals · 4 disposable mouthpieces · Tongs · 2 Pipe</p><p>Selected flavours: {booking.id === 'DEMO-001' ? 'Lady Killer × 1 · Gum & Mint × 1' : 'Lady Killer × 1'}</p><div className="cp-total"><span>Total</span><strong>{money(total(booking))}</strong></div></section>
          <div className="cp-payment"><div><span>Payment · {booking.paid ? 'Paid' : 'Unpaid'}</span><strong>{booking.payment}</strong></div>{!booking.paid && !['Pending', 'Declined'].includes(booking.status) && <button onClick={() => setAction('Paid')}>Mark paid <Check size={16} /></button>}{booking.paid && <Check aria-label="Paid" size={22} />}</div>
          {booking.reason && <div className="cp-decline-reason"><h3>Decline reason</h3><p>{booking.reason}</p><small>Customer-visible when connected.</small></div>}
          {booking.status === 'Pending' ? <div className="cp-actions"><button className="cp-secondary" onClick={() => setAction('Declined')}>Decline</button><button className="cp-primary" onClick={() => setAction('Approved')}>Approve booking <ArrowUpRight size={19} /></button></div> : nextStatus[booking.status] ? <div className="cp-lifecycle"><div className="cp-progress" aria-label="Booking progress">{(['Approved', 'Handover', 'Returned', 'Completed'] as Status[]).map((s, i, all) => <span key={s} className={i <= all.indexOf(booking.status) ? 'done' : ''}><i />{s}</span>)}</div><button className="cp-primary" disabled={booking.status === 'Returned' && !booking.paid} onClick={() => setAction(nextStatus[booking.status]!)}>Mark {nextStatus[booking.status]?.toLowerCase()} <ChevronRight size={19} /></button>{booking.status === 'Returned' && !booking.paid && <p>Record payment before completing this booking.</p>}</div> : null}
          <details className="cp-history"><summary>Activity · {booking.history.length} updates</summary>{booking.history.map((h, i) => <p key={i}>{h}</p>)}</details>
        </article>}
      </div>
    </div>
    <Dialog open={!!action} onOpenChange={open => { if (!open) { setAction(null); setReason(''); } }}><DialogContent className="cp-confirm"><DialogTitle>{action === 'Paid' ? 'Record payment?' : `${action === 'Approved' ? 'Approve this booking' : action === 'Declined' ? 'Decline this booking' : `Mark as ${action?.toLowerCase()}`}?`}</DialogTitle><DialogDescription>{action === 'Declined' ? 'Give a clear reason for the customer.' : action === 'Handover' ? 'Confirm the customer has received the equipment.' : action === 'Returned' ? 'Confirm the equipment has been received back.' : action === 'Completed' ? 'Confirm you have inspected the equipment and can close this booking.' : action === 'Paid' ? 'Only record payment after you have verified receipt.' : 'Confirm the equipment and requested rental slot are available.'} This is a demo action only.</DialogDescription>{action === 'Declined' && <label>Reason for declining<textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this request cannot be accepted" /></label>}<div className="cp-actions"><button className="cp-secondary" onClick={() => setAction(null)}>Cancel</button><button className="cp-primary" disabled={action === 'Declined' && !reason.trim()} onClick={confirm}>Confirm</button></div></DialogContent></Dialog>
  </main>;
}
