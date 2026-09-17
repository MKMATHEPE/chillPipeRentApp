'use client';
import { useEffect, useState } from 'react';
import {
  Check,
  Clock3,
  CreditCard,
  PackageCheck,
  RotateCcw,
  Search,
  Truck,
  Home,
  ShoppingBag,
} from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import './tracking.css';
type Booking = {
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
  const [loading, setLoading] = useState(false);
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
      localStorage.setItem(
        'chill-pipe-booking-access',
        JSON.stringify({ reference: ref, phone: tel }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking not found.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = localStorage.getItem('chill-pipe-booking-access');
    const saved = raw ? JSON.parse(raw) : {};
    const ref = params.get('reference') || saved.reference || '';
    const tel = params.get('phone') || saved.phone || '';
    setReference(ref);
    setPhone(tel);
    if (ref && tel) void load(ref, tel);
  }, []);
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
  const heading =
    booking.status === 'cancelled'
      ? 'Booking cancelled.'
      : booking.status === 'returned'
        ? 'Equipment returned.'
        : booking.status === 'approved'
          ? 'Your quote is ready.'
          : booking.status === 'payment_review'
            ? 'Payment received for review.'
            : booking.status === 'complete'
              ? booking.deposit > 0
                ? 'Deposit refund approved.'
                : 'Your rental is complete.'
              : step >= 2
                ? 'Your rental is confirmed.'
                : 'Request received.';
  const rows = [
    ['Request received', 'Your details were saved securely.', PackageCheck, 0],
    [
      'Quote approved',
      'Availability and delivery pricing confirmed.',
      Clock3,
      1,
    ],
    ['Payment verified', 'Your equipment is reserved.', CreditCard, 2],
    ['Handover', 'Delivery or collection is completed.', Truck, 3],
    [
      booking.deposit > 0 ? 'Return & deposit' : 'Return & inspection',
      booking.deposit > 0
        ? 'Inspection and deposit refund.'
        : 'Equipment returned and inspected.',
      RotateCcw,
      5,
    ],
  ] as const;
  return (
    <main className="flow-app tracking-flow">
      <TrackingHeader />
      <section className="flow-sheet tracking-sheet">
        <div className="sheet-handle" />
        <div className="tracking-badge">
          <Clock3 size={15} />
          {booking.status === 'awaiting_review'
            ? 'Awaiting owner confirmation'
            : 'Booking status'}
        </div>
        <h1>{heading}</h1>
        <p>
          {booking.status === 'awaiting_review'
            ? 'We’ll confirm availability before requesting payment.'
            : 'Refresh to check the latest update on your rental.'}
        </p>
        <section className="status-layout">
          <div className="status-timeline">
            <h2>Your booking journey</h2>
            {rows.map(([title, copy, Icon, needed]) => (
              <div
                className={
                  step >= needed ? 'timeline-row active' : 'timeline-row'
                }
                key={title}
              >
                <span>{step >= needed ? <Check /> : <Icon />}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </div>
              </div>
            ))}
          </div>
          <aside className="status-card">
            <div className="tracking-summary-title">
              <strong>Your session</strong>
              <span>{booking.reference}</span>
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
            <div className="status-total">
              <span>Total</span>
              <strong>
                {money(
                  booking.total + booking.deposit + (booking.deliveryFee || 0),
                )}
              </strong>
            </div>
            {booking.status === 'approved' && (
              <a
                className="status-cta"
                href={`/payment?reference=${encodeURIComponent(booking.reference)}&phone=${encodeURIComponent(phone)}`}
              >
                Continue to payment
              </a>
            )}
            {booking.status === 'awaiting_review' && (
              <span className="status-cta disabled">Awaiting approval</span>
            )}
            {booking.status === 'payment_review' && (
              <span className="status-cta disabled">
                Payment being verified
              </span>
            )}
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
          </aside>
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
      <p>
        Your session
        <br />
        starts here
      </p>
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
