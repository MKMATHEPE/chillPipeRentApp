'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Home,
  LockKeyhole,
  RotateCcw,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { AppHeader } from '@/components/app-header';

type FlavourItem = string | { name: string; quantity: number };
type SuggestedFlavour = { name: string; details: string; quantity: number };
type Order = {
  quantities: Record<string, number>;
  selectedFlavours: FlavourItem[];
  suggestedFlavours?: SuggestedFlavour[];
  delivery: boolean;
  deliveryFee?: number;
  deliveryDistanceKm?: number;
  customer: {
    name: string;
    phone: string;
    date: string;
    location: string;
    notes: string;
  };
  total: number;
};
const prices: Record<string, number> = {
  pipe: 550,
  premium: 800,
  coalPack: 30,
  stove: 200,
};
const names: Record<string, string> = {
  pipe: 'Classic hookah',
  premium: 'Premium hookah',
  coalPack: 'Coconut coals (8 pieces)',
  stove: 'Coal stove',
};
const money = (value: number) => `R${value.toLocaleString('en-ZA')}`;
const rentalDate = (value: string) =>
  value
    ? new Date(value).toLocaleString('en-ZA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not provided';

export default function Checkout() {
  const [order, setOrder] = useState<Order | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  useEffect(() => {
    const raw = localStorage.getItem('chill-pipe-order');
    if (raw) {
      try {
        setOrder(JSON.parse(raw));
      } catch {
        localStorage.removeItem('chill-pipe-order');
      }
    }
    setHydrated(true);
    const syncProfile = () => {
      const updated = localStorage.getItem('chill-pipe-order');
      if (updated) setOrder(JSON.parse(updated));
    };
    window.addEventListener('chill-pipe-profile-updated', syncProfile);
    return () => window.removeEventListener('chill-pipe-profile-updated', syncProfile);
  }, []);
  async function placeOrder() {
    if (!order || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(order),
      });
      const booking = await response.json();
      if (!response.ok)
        throw new Error(booking.error || 'Could not create booking.');
      localStorage.setItem(
        'chill-pipe-booking-access',
        JSON.stringify({
          reference: booking.reference,
          phone: order.customer.phone,
        }),
      );
      window.location.href = `/track?reference=${encodeURIComponent(booking.reference)}&phone=${encodeURIComponent(order.customer.phone)}`;
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not create booking.',
      );
      setSubmitting(false);
    }
  }
  const lines = useMemo(
    () =>
      order
        ? Object.entries(order.quantities)
            .filter(([id, q]) => q > 0 && prices[id] !== undefined)
            .map(([id, q]) => ({
              name: names[id],
              qty: q,
              amount: q * prices[id],
            }))
        : [],
    [order],
  );
  const flavourItems = (order?.selectedFlavours || []).map((item) =>
    typeof item === 'string' ? { name: item, quantity: 1 } : item,
  );
  const flavourUnits = flavourItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const suggestedFlavours = order?.suggestedFlavours || [];
  const deliveryFee = order?.delivery ? order.deliveryFee ?? 350 : 0;
  const hookahUnits =
    (order?.quantities.pipe || 0) + (order?.quantities.premium || 0);
  const additionalFlavourUnits = Math.max(0, flavourUnits - hookahUnits);
  const deposit =
    (order?.quantities.pipe || 0) * 400 +
    (order?.quantities.premium || 0) * 650;
  if (!hydrated)
    return (
      <main className="empty-cart checkout-loading" aria-busy="true">
        <span className="checkout-loading-mark" />
        <p className="eyebrow">Loading your session…</p>
      </main>
    );
  if (!order)
    return (
      <main className="empty-cart">
        <ShoppingBag size={34} />
        <p className="eyebrow">Your cart is empty</p>
        <h1>Build your rental first.</h1>
        <a href="/">Start an order</a>
      </main>
    );
  const ready =
    accepted &&
    Boolean(
      order.customer.phone && order.customer.date && order.customer.location,
    );
  return (
    <main className="flow-app checkout-flow">
      <section className="flow-photo-head checkout-photo-head">
        <img src="/hookah-hero.webp" alt="Premium hookah with drifting smoke" />
        <AppHeader onBack={() => (window.location.href = '/?step=delivery')} />
        <p>
          Review
          <br />
          confirm
          <br />
          and chill
        </p>
      </section>
      <section className="flow-sheet checkout-flow-sheet">
        <div className="sheet-handle" />
        <div className="checkout-flow-title">
          <div>
            <h1>Checkout</h1>
            <p>Review your session and send your request.</p>
          </div>
          <span>
            <LockKeyhole /> Secure
          </span>
        </div>
        <section className="checkout-flow-summary">
          <div className="summary-heading">
            <strong>Your session</strong>
            <a href="/?step=home">Edit order</a>
          </div>
          {lines.map((line) => (
            <div className="checkout-line" key={line.name}>
              <span>
                {line.name} × {line.qty}
              </span>
              <strong>{money(line.amount)}</strong>
            </div>
          ))}
          <div className="checkout-included">
            <strong>
              Included with your {hookahUnits === 1 ? 'hookah' : 'hookahs'}
            </strong>
            <p>
              {hookahUnits * 2} pipes · {hookahUnits}{' '}
              {hookahUnits === 1 ? 'tong' : 'tongs'} · {hookahUnits * 4}{' '}
              disposable mouthpieces
            </p>
            <p>
              {hookahUnits}{' '}
              {hookahUnits === 1 ? 'flavour unit' : 'flavour units'} ·{' '}
              {hookahUnits * 8} coconut coals
            </p>
            {flavourUnits === 0 ? (
              <a href="/?step=flavours">Choose your included flavour</a>
            ) : null}
          </div>
          {additionalFlavourUnits > 0 ? (
            <div className="checkout-line">
              <span>Additional flavour units × {additionalFlavourUnits}</span>
              <strong>{money(additionalFlavourUnits * 50)}</strong>
            </div>
          ) : null}
          {flavourItems.length > 0 ? (
            <p className="checkout-flavour-list">
              {flavourItems
                .map((item) => `${item.name} × ${item.quantity}`)
                .join(' · ')}
            </p>
          ) : null}
          {suggestedFlavours.length > 0 ? (
            <div className="checkout-suggestions">
              <strong>Suggested flavours</strong>
              {suggestedFlavours.map((item, index) => (
                <div key={`${item.name}-${index}`}>
                  <span>
                    {item.name} × {item.quantity}
                    {item.details ? <small>{item.details}</small> : null}
                  </span>
                  <em>Pending confirmation</em>
                </div>
              ))}
            </div>
          ) : null}
          <div className="checkout-line">
            <span>Refundable deposit</span>
            <strong>{money(deposit)}</strong>
          </div>
          <div className="checkout-line">
            <span>
              {order.delivery ? 'Delivery & collection' : 'Customer collection'}
            </span>
            <strong>
              {order.delivery ? money(deliveryFee) : 'Included'}
            </strong>
          </div>
          {order.delivery && order.deliveryDistanceKm ? (
            <p className="checkout-flavour-list">
              {order.deliveryDistanceKm} km driving from Vorna Valley.
            </p>
          ) : null}
          <div className="checkout-total">
            <span>Due after approval</span>
            <strong>
              {money(
                order.total +
                  deposit +
                  deliveryFee,
              )}
            </strong>
          </div>
          <div className="checkout-session-details">
            <div className="checkout-line">
              <span>WhatsApp number</span>
              <strong>{order.customer.phone}</strong>
            </div>
            <div className="checkout-line">
              <span>Rental date & time</span>
              <strong>{rentalDate(order.customer.date)}</strong>
            </div>
            <div className="checkout-line">
              <span>Area / suburb</span>
              <strong>{order.customer.location}</strong>
            </div>
          </div>
          <div className="checkout-session-fulfilment">
            <span>{order.delivery ? <Truck /> : <Home />}</span>
            <div>
              <small>Fulfilment</small>
              <strong>
                {order.delivery
                  ? 'Delivery & collection'
                  : 'Customer collection'}
              </strong>
              <p>
                {order.delivery
                  ? `${order.deliveryDistanceKm || '—'} km driving · ${money(deliveryFee)} delivery & collection.`
                  : 'Collection and return details will be confirmed with you.'}
              </p>
            </div>
            <Check />
          </div>
        </section>
        <label className="checkout-flow-accept">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span className="accept-box">
            <Check size={12} />
          </span>
          <span>
            I accept the rental <a href="/terms">terms and conditions</a>.
          </span>
        </label>
        <button
          className={
            ready ? 'checkout-flow-submit' : 'checkout-flow-submit disabled'
          }
          disabled={!ready || submitting}
          onClick={placeOrder}
        >
          <ShoppingBag />
          {submitting ? 'Processing checkout…' : 'Checkout'}
        </button>
        {submitError ? (
          <div className="checkout-submit-error" role="alert">
            <span>{submitError}</span>
            <button type="button" onClick={placeOrder} disabled={submitting}>
              <RotateCcw /> Try again
            </button>
          </div>
        ) : null}
        <p className="checkout-flow-note">
          Availability and delivery pricing are confirmed before payment.
        </p>
      </section>
      <nav className="flow-nav checkout-flow-nav">
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
        <a className="active" href="/checkout">
          <ShoppingBag />
          <span>Checkout</span>
        </a>
      </nav>
    </main>
  );
}
