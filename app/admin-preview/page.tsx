'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminBooking as Booking, Status } from '@/lib/admin-bookings';
import AdminSignOut from '@/components/admin-sign-out';
import { ArrowLeft, ArrowUpRight, Check, CalendarDays, ChevronRight, ClipboardList, Package, Inbox, MapPin, Phone, Truck, ChartNoAxesColumnIncreasing } from 'lucide-react';
import Performance from './performance';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Inventory from './inventory';
import { requirements, type Equipment, type InventorySnapshot } from '@/lib/inventory';
import BookingCalendar, { localDate } from './booking-calendar';
import './preview.css';
import './client-style.css';
import './performance.css';

const reference = (id: string) => id;
const money = (n: number) => `R${n.toLocaleString('en-ZA')}`;
const total = (b: Booking) => b.items.reduce((sum, item) => sum + item[1], b.fee);
const nextStatus: Partial<Record<Status, Status>> = { Approved: 'Handover', Handover: 'Returned', Returned: 'Completed' };

export default function AdminPreview() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inventory, setInventory] = useState<InventorySnapshot | null>(null);
  const [inventoryError, setInventoryError] = useState('');
  const [tab, setTab] = useState<'Requests' | 'Bookings' | 'Inventory' | 'Performance'>('Requests');
  const [filter, setFilter] = useState('All');
  const [bookingView, setBookingView] = useState<'Active' | 'History'>('Active');
  const [calendarDay, setCalendarDay] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date()).slice(0, 7) + '-01');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileDetails, setMobileDetails] = useState(false);
  const [action, setAction] = useState<Status | 'Paid' | null>(null);
  const actionTarget = useRef<Booking | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const fetching = useRef(false);
  const saveLock = useRef(false);
  const seen = useRef<Set<string> | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  async function refresh() {
    if (fetching.current || saveLock.current) return;
    fetching.current = true;
    const current = generation.current;
    const abort = new AbortController(); controller.current = abort;
    try {
      const all: Booking[] = []; let cursor: string | null = null;
      do {
        const response: Response = await fetch('/api/admin/bookings' + (cursor ? '?before=' + encodeURIComponent(cursor) : ''), { cache: 'no-store', signal: abort.signal });
        if (response.status === 401) { window.location.href = '/admin-login'; return; }
        const data = await response.json() as { bookings: Booking[]; nextCursor: string | null; error?: string };
        if (!response.ok) throw new Error(data.error || 'Bookings unavailable.');
        all.push(...data.bookings); cursor = data.nextCursor;
      } while (cursor);
      if (abort.signal.aborted || current !== generation.current) return;
      const pending = all.filter(b => b.status === 'Pending');
      const count = seen.current ? pending.filter(b => !seen.current!.has(b.id)).length : 0;
      if (count) setNotice(`${count} new booking request${count === 1 ? '' : 's'} received.`);
      seen.current = new Set(all.map(b => b.id));
      setBookings(all); setLoadError('');
      try {
        const response = await fetch('/api/admin/inventory', {cache:'no-store',signal:abort.signal});
        if (response.status === 401) { window.location.href = '/admin-login'; return; }
        const data = await response.json() as InventorySnapshot & {error?: string};
        if (!response.ok) throw new Error(data.error || 'Inventory unavailable.');
        if (!abort.signal.aborted && current === generation.current) { setInventory(data); setInventoryError(''); }
      } catch (error) {
        if (!abort.signal.aborted) setInventoryError(error instanceof Error ? error.message : 'Inventory unavailable.');
      }
    } catch (error) {
      if (!abort.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Bookings unavailable. Retry.');
    } finally { if (controller.current === abort) fetching.current = false; if (!abort.signal.aborted) setLoading(false); }
  }
  useEffect(() => {
    void refresh();
    const tick = () => { if (document.visibilityState === 'visible') void refresh(); };
    const interval = setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(interval); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); controller.current?.abort(); fetching.current = false; };
  }, []);
  const requests = bookings.filter(b => b.status === 'Pending');
  const isClosed = (b: Booking) => b.status === 'Completed' || b.status === 'Declined' || b.status === 'Cancelled';
  const query = search.trim().toLowerCase();
  const visible = bookings.filter(b => {
    if (tab === 'Requests') return b.status === 'Pending';
    if (b.status === 'Pending' || isClosed(b) !== (bookingView === 'History')) return false;
    if (filter !== 'All' && (filter === 'Unpaid' ? b.paid : b.status !== filter)) return false;
    return bookingView !== 'History' || !query || `${b.name} ${reference(b.id)}`.toLowerCase().includes(query);
  }).sort((a, b) => tab === 'Bookings' && bookingView === 'History' ? (b.closedAt ?? 0) - (a.closedAt ?? 0) : 0);
  const isCalendar = tab === 'Bookings' && bookingView === 'Active';
  const activeBookings = bookings.filter(b => b.status !== 'Pending' && !isClosed(b));
  const displayed = isCalendar ? activeBookings.filter(b => b.rentalStart.slice(0, 10) === calendarDay).sort((a, b) => a.rentalStart.localeCompare(b.rentalStart)) : visible;
  const booking = displayed.find(b => b.id === selected) ?? displayed[0];
  const needed = requirements(booking?.quantities || {});
  const shortages = inventory?.equipment.filter(item => needed[item.id] > item.total-item.unavailable-inventory.allocations[item.id].reserved-inventory.allocations[item.id].out).map(item => item.name) ?? [];
  async function saveInventory(item: Equipment) {
    if (saveLock.current) throw new Error('Another action is saving. Please retry.');
    saveLock.current = true; generation.current++; controller.current?.abort(); fetching.current = false;
    try {
      const response = await fetch('/api/admin/inventory', {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(item)});
      if (response.status === 401) { window.location.href = '/admin-login'; throw new Error('Please sign in again.'); }
      const data = await response.json() as InventorySnapshot & {error?: string};
      if (!response.ok) throw new Error(data.error || 'Could not save inventory.');
      setInventory(data); setInventoryError(''); setNotice(`${item.name}: inventory saved.`);
    } finally { saveLock.current = false; void refresh(); }
  }
  function changeTab(value: 'Requests' | 'Bookings' | 'Inventory' | 'Performance') { setTab(value); setBookingView('Active'); setSearch(''); setFilter('All'); setSelected(null); setMobileDetails(false); setNotice(''); window.scrollTo({ top: 0 }); }
  function changeView(value: 'Active' | 'History') { setBookingView(value); setFilter('All'); setSearch(''); setSelected(null); setMobileDetails(false); setNotice(''); }
  function startAction(value: Status | 'Paid') { actionTarget.current = booking ?? null; setActionError(''); setAction(value); }
  async function confirm() {
    const booking = actionTarget.current;
    if (!booking || !action || saveLock.current || (action === 'Declined' && !reason.trim())) return;
    const statuses: Record<string, string> = { Approved: 'approved', Declined: 'declined', Paid: 'paid', Handover: 'handed_over', Returned: 'returned', Completed: 'complete' };
    saveLock.current = true; generation.current++; controller.current?.abort(); fetching.current = false; setSaving(true); setActionError('');
    try {
      const response = await fetch('/api/admin/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reference: booking.id, version: booking.version, status: statuses[action], reason }) });
      if (response.status === 401) { window.location.href = '/admin-login'; return; }
      const data = await response.json() as { error?: string; booking: Booking };
      if (!response.ok) throw new Error(data.error || 'Could not save this action.');
      setBookings(all => all.map(b => b.id === data.booking.id ? data.booking : b));
      const closed = action === 'Completed' || action === 'Declined';
      setNotice(`${booking.id}: ${action === 'Paid' ? 'payment recorded' : action.toLowerCase()}.${closed ? ' Saved in Bookings → History.' : ''}`);
      setAction(null); setReason(''); setMobileDetails(tab === 'Bookings' && !closed); setSelected(null);
      window.scrollTo({ top: 0 });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save this action.');
    } finally { saveLock.current = false; setSaving(false); void refresh(); }
  }
  return <main className="cp-admin">
    <header className="cp-admin-header"><div className="cp-admin-brand"><img src="/chill-pipe-logo.webp" alt="The Chill Pipe" /><span>ADMIN</span></div><AdminSignOut /></header>
    <div className="cp-admin-hero"><img src="/hookah-hero.webp" alt="" /></div>
    <div className={`cp-admin-shell ${mobileDetails ? 'detail-open' : ''}`}>
      <div className="cp-panel-handle" aria-hidden="true" />
      <nav className="cp-admin-tabs" aria-label="Admin sections">{(['Requests', 'Bookings', 'Inventory', 'Performance'] as const).map(t => <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => changeTab(t)}>{t === 'Requests' ? <Inbox size={19} /> : t === 'Inventory' ? <Package size={19} /> : t === 'Performance' ? <ChartNoAxesColumnIncreasing size={19} /> : <ClipboardList size={19} />}{t}{t === 'Requests' && <span>{requests.length}</span>}</button>)}</nav>
      {!mobileDetails && <div className="cp-admin-heading"><div><h1>{tab === 'Requests' ? 'Booking requests' : tab === 'Inventory' ? 'Equipment inventory' : tab === 'Performance' ? 'Performance' : 'Your bookings'}</h1></div>{tab !== 'Performance' && <span>{tab === 'Inventory' ? '4 equipment types' : `${visible.length} ${tab === 'Requests' ? 'awaiting review' : 'bookings'}`}</span>}</div>}
      <p className="cp-admin-notice" role="status">{loading ? 'Loading bookings…' : notice}</p>
      {loadError && <p className="cp-stock-error" role="alert">{loadError} <button onClick={() => void refresh()}>Retry</button></p>}
      {tab === 'Bookings' && !mobileDetails && <>
        <div className="cp-booking-views" role="group" aria-label="Booking view">{(['Active', 'History'] as const).map(v => <button key={v} aria-pressed={bookingView === v} onClick={() => changeView(v)}>{v}</button>)}</div>
        {isCalendar && <><BookingCalendar starts={activeBookings.map(b => b.rentalStart)} selected={calendarDay} month={calendarMonth} onSelect={day => { setCalendarDay(day); setSelected(null); }} onMonth={day => { setCalendarMonth(day); setCalendarDay(day); setSelected(null); }} /><div className="cp-calendar-day-heading" aria-live="polite"><h2>{localDate(calendarDay).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}</h2><span>{displayed.length} {displayed.length === 1 ? 'booking' : 'bookings'}</span></div></>}
        {bookingView === 'History' && <div className="cp-history-search"><input type="search" aria-label="Search booking history" placeholder="Customer name or booking reference" value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} />{search && <button onClick={() => setSearch('')}>Clear</button>}</div>}
        {!isCalendar && <div className="cp-filters" aria-label="Filter bookings">{(bookingView === 'History' ? ['All', 'Completed', 'Declined', 'Cancelled'] : ['All', 'Approved', 'Handover', 'Returned', 'Unpaid']).map(f => <button key={f} aria-pressed={filter === f} onClick={() => { setFilter(f); setSelected(null); setMobileDetails(false); }}>{f}</button>)}</div>}
      </>}
      {inventoryError && <p className="cp-stock-error" role="alert">{inventoryError} <button onClick={() => void refresh()}>Retry</button></p>}
      {tab === 'Performance' ? <Performance bookings={bookings} /> : tab === 'Inventory' ? inventory ? <Inventory equipment={inventory.equipment} allocations={inventory.allocations} onSave={saveInventory} /> : <p role="status">{inventoryError ? 'Inventory could not be loaded.' : 'Loading inventory…'}</p> : <div className={`cp-admin-workspace ${mobileDetails ? 'show-detail' : ''}`}>
        <section className="cp-booking-list" aria-label={tab}>
          {displayed.map(b => <button className="cp-booking-row cp-compact-card" key={b.id} onClick={() => { setSelected(b.id); setMobileDetails(true); window.scrollTo({ top: 0 }); }}>
            <div className="cp-compact-top"><h2>{b.name}</h2><strong>{money(total(b))}</strong></div>
            <div className="cp-compact-bottom"><span>{isCalendar ? b.date.split(' · ')[1] : b.date.replace(/\s\d{4}(?=\s·)/, '')} · {b.mode === 'Customer collection' ? 'Collection' : 'Delivery'}</span><ChevronRight size={17} aria-hidden="true" /></div>
            {tab === 'Bookings' && (filter === 'All' || filter === 'Unpaid') && <span className="cp-compact-status">{b.status}</span>}
          </button>)}
          {isCalendar && !loading && !loadError && !displayed.length && <div className="cp-empty"><CalendarDays size={30} /><h2>No bookings on this date</h2><p>Select another date to see its bookings.</p></div>}
          {!isCalendar && !loading && !loadError && !displayed.length && <div className="cp-empty"><Inbox size={30} /><h2>{tab === 'Requests' ? 'All caught up' : search || filter !== 'All' ? 'No matching bookings' : bookingView === 'History' ? 'No booking history yet' : 'No active bookings'}</h2><p>{tab === 'Requests' ? 'No pending requests to review.' : search || filter !== 'All' ? 'Try another search or filter.' : bookingView === 'History' ? 'Completed and declined bookings will be kept here.' : 'Approved rentals will appear here. Finished bookings are in History.'}</p></div>}
        </section>
        {booking && <article className="cp-booking-detail">
          <button className="cp-back" onClick={() => setMobileDetails(false)}><ArrowLeft size={17} /> Back to {tab.toLowerCase()}</button>
          <div className="cp-detail-heading"><div><p>{reference(booking.id)}</p><h2>{booking.name}</h2></div>{['Pending', 'Declined'].includes(booking.status) && <span className="cp-status">{booking.status === 'Pending' ? 'Needs review' : booking.status}</span>}</div>
          <div className="cp-contact"><Phone size={16} />{booking.phone}</div>
          <div className="cp-fulfilment"><div><span>Rental date & time</span><strong>{booking.date}</strong><small>24-hour rental</small></div><div><span>{booking.mode}</span><strong>{booking.address}</strong></div></div>
          <section className="cp-session"><h3>Your session</h3>{booking.items.map(([name, cost]) => <div key={name}><span>{name}</span><strong>{money(cost)}</strong></div>)}<div><span>{booking.fee ? 'Delivery & collection' : 'Customer collection'}</span><strong>{booking.fee ? money(booking.fee) : 'Included'}</strong></div><p>Included per hookah: 1 flavour · 8 coconut coals · 4 disposable mouthpieces · Tongs · 2 Pipe</p><p>Selected flavours: {booking.flavours}</p>{booking.suggestions && <p>Requested flavours (availability and price unconfirmed): {booking.suggestions}</p>}{booking.notes && <p>Customer notes: {booking.notes}</p>}<div className="cp-total"><span>Total</span><strong>{money(total(booking))}</strong></div></section>
          <div className="cp-payment"><div><span>Payment · {booking.paid ? 'Paid' : 'Unpaid'}</span><strong>{booking.payment}</strong></div>{!booking.paid && !['Pending', 'Declined', 'Cancelled'].includes(booking.status) && <button onClick={() => startAction('Paid')}>Mark paid <Check size={16} /></button>}{booking.paid && <Check aria-label="Paid" size={22} />}</div>
          {booking.reason && <div className="cp-decline-reason"><h3>Decline reason</h3><p>{booking.reason}</p></div>}
          {booking.status === 'Pending' && shortages.length > 0 && <p className="cp-stock-error" role="status">Not enough available equipment: {shortages.join(', ')}. Update Inventory before approving.</p>}
          {booking.status === 'Pending' ? <div className="cp-actions"><button className="cp-secondary" onClick={() => startAction('Declined')}>Decline</button><button className="cp-primary" disabled={shortages.length > 0} onClick={() => startAction('Approved')}>Approve booking <ArrowUpRight size={19} /></button></div> : !['Declined', 'Cancelled'].includes(booking.status) ? <div className="cp-lifecycle"><div className="cp-progress" aria-label="Booking progress">{(['Approved', 'Handover', 'Returned', 'Completed'] as Status[]).map((s, i, all) => <span key={s} aria-current={s === booking.status ? 'step' : undefined} className={i <= all.indexOf(booking.status) ? 'done' : ''}><i />{s}</span>)}</div>{nextStatus[booking.status] && <button className="cp-primary" disabled={(booking.status === 'Approved' || booking.status === 'Returned') && !booking.paid} onClick={() => startAction(nextStatus[booking.status]!)}>Mark {nextStatus[booking.status]?.toLowerCase()} <ChevronRight size={19} /></button>}{!booking.paid && (booking.status === 'Approved' || booking.status === 'Returned') && <p>{booking.status === 'Approved' ? 'Mark paid before handing over the equipment.' : 'Record payment before completing this booking.'}</p>}</div> : null}
          <details className="cp-history"><summary>Activity · {booking.history.length} updates</summary>{booking.history.map((h, i) => <p key={i}>{h}</p>)}</details>
        </article>}
      </div>}
    </div>
    <Dialog open={!!action} onOpenChange={open => { if (!open && !saving) { setAction(null); setReason(''); setActionError(''); } }}><DialogContent className="cp-confirm"><DialogTitle>{action === 'Paid' ? 'Record payment?' : `${action === 'Approved' ? 'Approve this booking' : action === 'Declined' ? 'Decline this booking' : `Mark as ${action?.toLowerCase()}`}?`}</DialogTitle><DialogDescription>{actionTarget.current?.id} · {action === 'Declined' ? 'Give a clear reason for the customer.' : action === 'Handover' ? 'Confirm the customer has received the equipment.' : action === 'Returned' ? 'Confirm the equipment has been received back.' : action === 'Completed' ? 'Confirm you have inspected the equipment and can close this booking.' : action === 'Paid' ? 'Only record payment after you have verified receipt.' : 'Confirm the equipment and requested rental slot are available.'}</DialogDescription>{action === 'Declined' && <label>Reason for declining<textarea maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this request cannot be accepted" /></label>}{actionError && <p role="alert" className="cp-stock-error">{actionError}</p>}<div className="cp-actions"><button className="cp-secondary" disabled={saving} onClick={() => { setAction(null); setActionError(''); }}>Cancel</button><button className="cp-primary" disabled={saving || (action === 'Declined' && !reason.trim())} onClick={() => void confirm()}>{saving ? 'Saving…' : 'Confirm'}</button></div></DialogContent></Dialog>
  </main>;
}
