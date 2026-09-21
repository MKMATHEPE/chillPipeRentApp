'use client';
import { useEffect, useState } from 'react';
import { takeBookingHandoff } from '@/lib/booking-handoff';
import {
  Check,
  Clock3,
  FileText,
  ChevronRight,
  CircleHelp,
  RotateCcw,
  Search,
  Truck,
  Home,
  ShoppingBag,
} from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import './tracking.css';
import { paymentLabel, payOnArrival } from '@/lib/payment-methods';
type Booking = {
  paymentMethod?: string | null;
  delivery?: boolean;
  reference: string;
  status: string;
  total: number;
  deposit: number;
  deliveryFee: number | null;
  phone: string;
  customer: { name: string; date: string; location: string };
  quantities: Record<string, number>;
};
const money = (n: number) => `R${n.toLocaleString('en-ZA')}`;
const rank: Record<string, number> = {
  awaiting_review: 0,
  approved: 1,
  payment_review: 1,
  paid: 2,
  handed_over: 3,
  returned: 4,
  complete: 5,
};
export default function Track() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load(ref = reference, tel = phone) {
    if (!ref || !tel) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/bookings?reference=${encodeURIComponent(ref)}&phone=${encodeURIComponent(tel)}`,
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Booking not found.');
      setBooking(data);
      setReference(ref);
      setPhone(tel);
      try { localStorage.setItem(
        'chill-pipe-booking-access',
        JSON.stringify({ reference: ref, phone: tel }),
      ); } catch { /* A successful lookup does not require browser storage. */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking not found.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let saved: { reference?: string; phone?: string } = {};
    try {
      const raw = localStorage.getItem('chill-pipe-booking-access');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') saved = parsed;
    } catch { /* URL access still works if saved data is unavailable. */ }
    const ref = params.get('reference') || saved.reference || '';
    const tel = params.get('phone') || saved.phone || '';
    setReference(ref);
    setPhone(tel);
    if (ref && tel) {
      const freshBooking = takeBookingHandoff(ref, tel);
      if (freshBooking) setBooking(freshBooking);
      void load(ref, tel);
    }
    else setLoading(false);
  }, []);
  if (!booking && loading)
    return (
      <main className="flow-app tracking-flow">
        <TrackingHeader />
        <section className="flow-sheet tracking-sheet" aria-busy="true">
          <div className="sheet-handle" />
          <h1 role="status">Loading your booking…</h1>
        </section>
        <TrackingNav />
      </main>
    );
  if (!booking)
    return (
      <main className="flow-app tracking-flow">
        <TrackingHeader />
        <section className="flow-sheet tracking-sheet tracking-lookup">
          <div className="sheet-handle" />
          <Search />
          <p className="eyebrow">Find your rental</p>
          <h1>Track a booking</h1>
          <p>Enter your booking reference and contact number.</p>
          <label>
            Booking reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="CP-ABC123"
            />
          </label>
          <label>
            Contact number
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="071 234 5678"
            />
          </label>
          {error && (
            <p className="lookup-error" role="alert">
              {error}
            </p>
          )}
          <button
            onClick={() => void load()}
            disabled={loading || !reference || !phone}
          >
            {loading ? 'Looking up…' : 'Track booking'}
          </button>
        </section>
        <TrackingNav />
      </main>
    );
  const step = rank[booking.status] ?? 0;
  const [heading, description] = ({
    awaiting_review: ['Awaiting approval', 'The owner is reviewing your request.'],
    approved: ['Booking approved', payOnArrival(booking.paymentMethod) ? 'Your rental is approved. Payment is due at handover.' : 'Your quote is ready. Continue to payment.'],
    payment_review: ['Payment being verified', 'The owner is checking your payment.'],
    paid: ['Payment confirmed', 'Your equipment is reserved for your session.'],
    handed_over: ['Rental in progress', 'Enjoy your session. Return your equipment at the agreed time.'],
    returned: ['Equipment returned', 'The owner will inspect the returned equipment.'],
    complete: ['Rental completed', 'Your equipment has been returned and inspected.'],
    cancelled: ['Booking cancelled', 'Contact us if you need help with this booking.'],
  } as Record<string, string[]>)[booking.status] || ['Booking status', 'Refresh to check for an update.'];
  const stages = ['Received', 'Approved', 'Paid', 'Handover', 'Returned', 'Completed'];

  return (
    <main className="flow-app tracking-flow">
      <TrackingHeader />
      <section className="flow-sheet tracking-sheet">
        <div className="sheet-handle" />
        <h1>{heading}</h1>
        <p aria-live="polite">{description}</p>
        <section className="status-layout">
          {booking.status !== 'cancelled' && booking.status in rank && (
            <section className="booking-progress" aria-label="Your booking journey">
              <h2>Your booking journey</h2>
              <ol>
                {stages.map((label, index) => (
                  <li key={label} className={index <= step ? 'done' : ''}
                    aria-current={index === step ? 'step' : undefined}>
                    <span className="progress-dot">{index <= step ? <Check size={14} /> : null}</span>
                    <span>{label}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <aside className="status-card">
            <div className="tracking-summary-title">
              <strong>Booking summary</strong>
            </div>
            <div>
              <span>Reference</span>
              <strong>{booking.reference}</strong>
            </div>
            <div>
              <span>Rental date & time</span>
              <strong>
                {new Date(booking.customer.date).toLocaleString('en-ZA', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </strong>
            </div>
            <div><span>Fulfilment</span><strong>{booking.delivery ? 'Delivery & collection' : 'Customer collection'}</strong></div>
            <div><span>Payment type</span><strong>{paymentLabel(booking.paymentMethod)}</strong></div>
            <div className="status-total">
              <span>Total</span>
              <strong>
                {money(
                  booking.total + booking.deposit + (booking.deliveryFee || 0),
                )}
              </strong>
            </div>
            {['awaiting_review', 'approved'].includes(booking.status) && payOnArrival(booking.paymentMethod) && (
              <p>Pay the full total {booking.delivery ? 'on delivery' : 'when collecting'}.</p>
            )}
            {booking.status === 'approved' && !payOnArrival(booking.paymentMethod) && (
              <a
                className="status-cta"
                href={`/payment?reference=${encodeURIComponent(booking.reference)}&phone=${encodeURIComponent(phone)}`}
              >
                Continue to payment
              </a>
            )}
          </aside>
          <details className="booking-details">
            <summary><FileText size={20} /><span>View booking details</span><ChevronRight size={18} /></summary>
            <div className="booking-details-body">
            <div>
              <span>Contact number</span>
              <strong>{phone}</strong>
            </div>
            <div>
              <span>Location</span>
              <strong>{booking.customer.location}</strong>
            </div>
            {Object.entries(booking.quantities)
              .filter(([, qty]) => qty > 0)
              .map(([id, qty]) => (
                <div key={id}>
                  <span>
                    {{
                      pipe: 'Classic hookah',
                      premium: 'Premium hookah',
                      coalPack: 'Coconut coals (8 pieces)',
                      stove: 'Coal stove',
                    }[id] || id}
                  </span>
                  <strong>× {qty}</strong>
                </div>
              ))}
            <div>
              <span>Rental</span>
              <strong>{money(booking.total)}</strong>
            </div>
            {booking.deposit > 0 && (
              <div>
                <span>Refundable deposit</span>
                <strong>{money(booking.deposit)}</strong>
              </div>
            )}
            <div>
              <span>Delivery / collection</span>
              <strong>
                {booking.deliveryFee === null
                  ? 'Pending'
                  : money(booking.deliveryFee)}
              </strong>
            </div>

            </div>
          </details>
          <div className="tracking-actions">
            {error && (
              <p className="lookup-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="status-refresh"
              disabled={loading}
              onClick={() => void load(booking.reference, phone)}
            >
              <RotateCcw size={16} />
              {loading ? 'Refreshing…' : 'Refresh status'}
            </button>

            <a href="https://wa.me/27768505523" target="_blank" rel="noreferrer"><CircleHelp size={18} />Need help?</a>
          </div>

        </section>
      </section>
      <TrackingNav />
    </main>
  );
}

function TrackingHeader() {
  return (
    <section className="flow-photo-head tracking-photo-head">
      <img src="/hookah-hero.webp" alt="Hookah with drifting smoke" />
      <AppHeader
        onBack={() => {
          window.location.href = '/';
        }}
      />

    </section>
  );
}
function TrackingNav() {
  return (
    <nav className="flow-nav" aria-label="Booking navigation">
      <a href="/">
        <Home />
        <span>Home</span>
      </a>
      <a href="/?step=flavours">
        <span className="leaf">◒</span>
        <span>Flavours</span>
      </a>
      <a href="/?step=delivery">
        <Truck />
        <span>Delivery</span>
      </a>
      <a href="/checkout">
        <ShoppingBag />
        <span>Checkout</span>
      </a>
    </nav>
  );
}
