'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Flame,
  Home,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquarePlus,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
  Truck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

type Step = 'home' | 'flavours' | 'delivery';
type Flavour = { id: string; name: string; description: string; image: string };
type SuggestedFlavour = { name: string; details: string; quantity: number };
type DeliveryQuote = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  distanceKm?: number;
  fee?: 250 | 350;
  message?: string;
};
const flavours: Flavour[] = [
  {
    id: 'lady',
    name: 'Lady Killer',
    description: 'Sweet berries, citrus and a smooth finish.',
    image: '/lady-killer.webp',
  },
  {
    id: 'gum',
    name: 'Gum & Mint',
    description: 'Cool, fresh and always a favourite.',
    image: '/gum-mint.webp',
  },
  {
    id: 'cream',
    name: 'Cream Mint',
    description: 'Silky, mellow and finished with a cool mint lift.',
    image: '/cream-mint.webp',
  },
  {
    id: 'blueberry',
    name: 'Blueberry Mint',
    description: 'Juicy blueberry with a crisp, refreshing finish.',
    image: '/blueberry-mint.webp',
  },
  {
    id: 'watermelon',
    name: 'Watermelon Chill',
    description: 'Bright watermelon sweetness served ice-cool.',
    image: '/watermelon-chill.webp',
  },
  {
    id: 'apple',
    name: 'Double Apple',
    description: 'A rich red-and-green apple hookah classic.',
    image: '/double-apple.webp',
  },
  {
    id: 'grape',
    name: 'Grape Mint',
    description: 'Deep grape sweetness with a fresh mint finish.',
    image: '/grape-mint.webp',
  },
  {
    id: 'peach',
    name: 'Peach Ice',
    description: 'Juicy peach cooled with a clean icy finish.',
    image: '/peach-ice.webp',
  },
];
const money = (n: number) => `R${n.toLocaleString('en-ZA')}`;
const COLLECTION_LOCATION =
  'Bel Aire, Langeveld Street, Vorna Valley, Johannesburg, South Africa';
const COLLECTION_WHATSAPP = '27768505523';
const collectionTimeSlots = Array.from({ length: 18 }, (_, index) => {
  const totalMinutes = 10 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
});
const localDateValue = (value = new Date()) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

function BrandLogo() {
  return (
    <a className="flow-brand" href="/" aria-label="The Chill Pipe home">
      <img src="/chill-pipe-logo.webp" alt="The Chill Pipe" />
      <span>Hookah rentals</span>
    </a>
  );
}
function Header({
  step,
  cart,
  onBack,
}: {
  step: Step;
  cart: number;
  onBack?: () => void;
}) {
  return (
    <header className="flow-header">
      {onBack ? (
        <button aria-label="Go back" onClick={onBack}>
          <ArrowLeft />
        </button>
      ) : (
        <BrandLogo />
      )}
      {onBack && <BrandLogo />}
      <div className="flow-head-actions">
        <button aria-label="View order">
          <ShoppingBag />
          <i>{cart}</i>
        </button>
        <button aria-label="Open menu">
          <Menu />
        </button>
      </div>
    </header>
  );
}
function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="flow-primary" onClick={onClick}>
      {children}
      <ArrowRight />
    </button>
  );
}
function BottomNav({
  active,
  onNavigate,
  onCheckout,
}: {
  active: Step;
  onNavigate: (step: Step) => void;
  onCheckout: () => void;
}) {
  return (
    <nav className="flow-nav">
      <button
        className={active === 'home' ? 'active' : ''}
        onClick={() => onNavigate('home')}
      >
        <Home />
        <span>Home</span>
      </button>
      <button
        className={active === 'flavours' ? 'active' : ''}
        onClick={() => onNavigate('flavours')}
      >
        <span className="leaf">◒</span>
        <span>Flavours</span>
      </button>
      <button
        className={active === 'delivery' ? 'active' : ''}
        onClick={() => onNavigate('delivery')}
      >
        <Truck />
        <span>Delivery</span>
      </button>
      <button onClick={onCheckout}>
        <ShoppingBag />
        <span>Checkout</span>
      </button>
    </nav>
  );
}
function Quantity({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flow-quantity">
      <button
        aria-label="Decrease quantity"
        disabled={value === 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <Minus />
      </button>
      <span>{value}</span>
      <button
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(10, value + 1))}
      >
        <Plus />
      </button>
    </div>
  );
}
function FlavourCard({
  flavour,
  quantity,
  onIncrease,
  onDecrease,
}: {
  flavour: Flavour;
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <article
      className={quantity > 0 ? 'flow-flavour selected' : 'flow-flavour'}
    >
      <img src={flavour.image} alt="" loading="lazy" decoding="async" />
      <div>
        <h3>{flavour.name}</h3>
        <p>{flavour.description}</p>
      </div>
      {quantity > 0 ? (
        <span className="flavour-card-quantity">
          <button
            aria-label={`Remove one ${flavour.name}`}
            onClick={onDecrease}
          >
            <Minus />
          </button>
          <b>{quantity}</b>
          <button
            aria-label={`Add another ${flavour.name}`}
            onClick={onIncrease}
          >
            <Plus />
          </button>
        </span>
      ) : (
        <button aria-label={`Add ${flavour.name}`} onClick={onIncrease}>
          <Plus />
        </button>
      )}
    </article>
  );
}
function DeliveryOption({
  selected,
  icon: Icon,
  title,
  copy,
  onClick,
}: {
  selected: boolean;
  icon: typeof Truck;
  title: string;
  copy: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        selected ? 'delivery-option-card selected' : 'delivery-option-card'
      }
      onClick={onClick}
    >
      <span>
        <Icon />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{copy}</small>
      </div>
      <i>{selected ? <Check /> : null}</i>
    </button>
  );
}

export default function BookingFlow() {
  const [step, setStep] = useState<Step>('home');
  const [pipeQty, setPipeQty] = useState(1);
  const [coalQty, setCoalQty] = useState(0);
  const [stoveQty, setStoveQty] = useState(0);
  const [flavourQuantities, setFlavourQuantities] = useState<
    Record<string, number>
  >({
    lady: 1,
    gum: 1,
  });
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedFlavour[]>([]);
  const [suggestionName, setSuggestionName] = useState('');
  const [suggestionDetails, setSuggestionDetails] = useState('');
  const [editingSuggestion, setEditingSuggestion] = useState<number | null>(
    null,
  );
  const [delivery, setDelivery] = useState(true);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [unit, setUnit] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [locationPinned, setLocationPinned] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote>({
    status: 'idle',
  });
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [date, setDate] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const flavourUnits = Object.values(flavourQuantities).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const total = useMemo(
    () => pipeQty * 550 + flavourUnits * 50 + coalQty * 75 + stoveQty * 200,
    [pipeQty, flavourUnits, coalQty, stoveQty],
  );
  const cart = pipeQty + flavourUnits + coalQty + stoveQty;
  const collectionDay = date.split('T')[0] || '';
  const collectionTime = date.split('T')[1] || '';
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('step');
    const raw = localStorage.getItem('chill-pipe-draft');
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        setPipeQty(draft.pipeQty || 1);
        setCoalQty(Math.max(0, Number(draft.coalQty) || 0));
        setStoveQty(Math.max(0, Number(draft.stoveQty) || 0));
        if (
          draft.flavourQuantities &&
          typeof draft.flavourQuantities === 'object'
        ) {
          setFlavourQuantities(draft.flavourQuantities);
        } else if (Array.isArray(draft.selected)) {
          setFlavourQuantities(
            Object.fromEntries(draft.selected.map((id: string) => [id, 1])),
          );
        }
        const isDelivery = draft.delivery !== false;
        setDelivery(isDelivery);
        setPhone(draft.phone || '');
        setAddress(isDelivery ? draft.address || '' : COLLECTION_LOCATION);
        if (isDelivery) setDeliveryAddress(draft.address || '');
        setSuburb(draft.suburb || '');
        setUnit(draft.unit || '');
        setDeliveryInstructions(draft.deliveryInstructions || '');
        if (draft.deliveryQuote?.status === 'ready')
          setDeliveryQuote(draft.deliveryQuote);
        setDate(draft.date || '');
        if (Array.isArray(draft.suggestions)) {
          setSuggestions(draft.suggestions);
        } else if (draft.flavourSuggestion) {
          setSuggestions([
            {
              name: draft.flavourSuggestion,
              details: draft.suggestionDetails || '',
              quantity: 1,
            },
          ]);
        }
      } catch {
        localStorage.removeItem('chill-pipe-draft');
      }
    }
    if (requested === 'flavours' || requested === 'delivery')
      setStep(requested);
    setDraftReady(true);
  }, []);
  useEffect(() => {
    if (draftReady)
      localStorage.setItem(
        'chill-pipe-draft',
        JSON.stringify({
          pipeQty,
          coalQty,
          stoveQty,
          flavourQuantities,
          delivery,
          phone,
          address,
          suburb,
          unit,
          deliveryInstructions,
          deliveryQuote,
          date,
          suggestions,
        }),
      );
  }, [
    draftReady,
    pipeQty,
    coalQty,
    stoveQty,
    flavourQuantities,
    delivery,
    phone,
    address,
    suburb,
    unit,
    deliveryInstructions,
    deliveryQuote,
    date,
    suggestions,
  ]);
  function navigateStep(next: Step) {
    setStep(next);
    const url = next === 'home' ? '/' : `/?step=${next}`;
    window.history.replaceState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function changeFlavourQuantity(id: string, change: number) {
    setFlavourQuantities((current) => {
      const nextQuantity = Math.max(0, (current[id] || 0) + change);
      const next = { ...current };
      if (nextQuantity === 0) delete next[id];
      else next[id] = nextQuantity;
      return next;
    });
  }
  function startNewSuggestion() {
    setSuggestionName('');
    setSuggestionDetails('');
    setEditingSuggestion(null);
    setShowSuggestion(true);
  }
  function editSuggestion(index: number) {
    const suggestion = suggestions[index];
    setSuggestionName(suggestion.name);
    setSuggestionDetails(suggestion.details);
    setEditingSuggestion(index);
  }
  function changeSuggestionQuantity(index: number, change: number) {
    setSuggestions((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item,
      ),
    );
  }
  function saveSuggestion() {
    if (!suggestionName.trim()) return;
    const suggestion = {
      name: suggestionName.trim(),
      details: suggestionDetails.trim(),
      quantity:
        editingSuggestion === null
          ? 1
          : suggestions[editingSuggestion]?.quantity || 1,
    };
    setSuggestions((current) =>
      editingSuggestion === null
        ? [...current, suggestion]
        : current.map((item, index) =>
            index === editingSuggestion ? suggestion : item,
          ),
    );
    setSuggestionName('');
    setSuggestionDetails('');
    setEditingSuggestion(null);
  }
  async function finish() {
    const bookingDate = new Date(date);
    const validTime =
      date.includes('T') &&
      collectionTimeSlots.includes(date.split('T')[1]) &&
      bookingDate.getTime() > Date.now();
    const missing = [
      !phone.trim() ? 'contact number' : '',
      !address.trim() ? 'delivery address' : '',
      delivery && !suburb.trim() ? 'area or suburb' : '',
      !validTime ? 'valid rental date and time' : '',
    ].filter(Boolean);
    if (missing.length) {
      setValidationMessage(`Please add your ${missing.join(', ')}.`);
      if (!address.trim() || (delivery && !suburb.trim()))
        setShowDeliveryDetails(true);
      navigateStep('delivery');
      return;
    }
    let confirmedQuote = deliveryQuote;
    if (delivery && deliveryQuote.status !== 'ready') {
      const calculated = await calculateDeliveryQuote({
        address: `${address}, ${suburb}, South Africa`,
        suburb,
      });
      if (!calculated) {
        setValidationMessage(
          'We could not calculate the delivery fee. Check the address or pin your location.',
        );
        setShowDeliveryDetails(true);
        navigateStep('delivery');
        return;
      }
      confirmedQuote = calculated;
    }
    setValidationMessage('');
    localStorage.setItem(
      'chill-pipe-order',
      JSON.stringify({
        quantities: { pipe: pipeQty, coal: coalQty, stove: stoveQty },
        selectedFlavours: flavours
          .filter((item) => (flavourQuantities[item.id] || 0) > 0)
          .map((item) => ({
            name: item.name,
            quantity: flavourQuantities[item.id],
          })),
        suggestedFlavours: suggestions,
        delivery,
        deliveryFee: delivery ? confirmedQuote.fee : 0,
        deliveryDistanceKm: delivery ? confirmedQuote.distanceKm : 0,
        customer: {
          name: 'Customer',
          phone: phone.trim(),
          date,
          location: delivery
            ? [address.trim(), unit.trim(), suburb.trim()]
                .filter(Boolean)
                .join(', ')
            : COLLECTION_LOCATION,
          notes: [
            suggestions.length > 0
              ? `Flavour suggestions: ${suggestions
                  .map(
                    (item) =>
                      `${item.name} × ${item.quantity}${item.details ? ` (${item.details})` : ''}`,
                  )
                  .join('; ')}`
              : '',
            delivery && deliveryInstructions.trim()
              ? `Delivery instructions: ${deliveryInstructions.trim()}`
              : '',
          ]
            .filter(Boolean)
            .join(' | '),
        },
        total,
      }),
    );
    window.location.href = '/checkout';
  }
  async function calculateDeliveryQuote(payload: {
    address?: string;
    suburb?: string;
    latitude?: number;
    longitude?: number;
  }) {
    setDeliveryQuote({ status: 'loading' });
    setLocationStatus('');
    try {
      const response = await fetch('/api/delivery-quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const quote = (await response.json()) as {
        error?: string;
        distanceKm?: number;
        fee?: 250 | 350;
        destinationLabel?: string;
        destinationSuburb?: string;
      };
      if (!response.ok)
        throw new Error(quote.error || 'Could not calculate delivery distance.');
      setDeliveryQuote({
        status: 'ready',
        distanceKm: quote.distanceKm || 0,
        fee: quote.fee || 350,
      });
      if (payload.latitude !== undefined && quote.destinationLabel) {
        setAddress(quote.destinationLabel);
        setDeliveryAddress(quote.destinationLabel);
        setSuburb(quote.destinationSuburb || 'Pinned location');
        setLocationPinned(true);
      }
      const confirmed: DeliveryQuote = {
        status: 'ready',
        distanceKm: quote.distanceKm || 0,
        fee: quote.fee || 350,
      };
      setDeliveryQuote(confirmed);
      setValidationMessage('');
      return confirmed;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not calculate delivery distance.';
      setDeliveryQuote({ status: 'error', message });
      setLocationStatus(message);
      return null;
    }
  }
  if (step === 'home')
    return (
      <main className="flow-app dark">
        <Header step={step} cart={cart} />
        <section className="flow-home-hero">
          <img
            src="/hookah-hero.webp"
            alt="Premium glass hookah in a dark lounge"
          />
          <p>
            Good people.
            <br />
            Better sessions.
          </p>
          <div>
            <h1>
              Build your
              <br />
              session
            </h1>
            <span>
              Premium hookahs. Unforgettable vibes.
              <br />
              Delivered to you.
            </span>
          </div>
        </section>
        <section className="product-sheet">
          <div className="sheet-title">
            <span>Choose your setup</span>
            <strong>{money(total)}</strong>
          </div>
          <div className="product-carousel">
            <article className="flow-product selected">
              <div className="product-photo">
                <img src="/hookah-hero.webp" alt="Classic hookah" />
              </div>
              <h2>Classic hookah · R550</h2>
              <p>Everything you need for a smooth session.</p>
              <Quantity value={pipeQty} onChange={setPipeQty} />
            </article>
            <article className="flow-product muted-card">
              <div className="product-photo">
                <img src="/hookah-hero.webp" alt="Premium hookah" />
              </div>
              <h2>Premium hookah</h2>
              <p>A signature setup. Coming soon.</p>
              <button aria-label="Premium hookah coming soon">
                <ArrowRight />
              </button>
            </article>
          </div>
          <div className="carousel-dots">
            <i className="active" />
            <i />
            <i />
          </div>
          <section className="setup-addons" aria-label="Session add-ons">
            <div className="setup-addons-title">
              <strong>Add-ons</strong>
              <span>Complete your setup</span>
            </div>
            <div className="setup-addon-row">
              <i>
                <Flame />
              </i>
              <span>
                <strong>Coal box</strong>
                <small>36 pieces · R75</small>
              </span>
              <Quantity value={coalQty} onChange={setCoalQty} />
            </div>
            <div className="setup-addon-row">
              <i>
                <Zap />
              </i>
              <span>
                <strong>Coal stove</strong>
                <small>R200</small>
              </span>
              <Quantity value={stoveQty} onChange={setStoveQty} />
            </div>
          </section>
          <PrimaryButton onClick={() => navigateStep('flavours')}>
            Choose flavours
          </PrimaryButton>
        </section>
        <BottomNav
          active="home"
          onNavigate={navigateStep}
          onCheckout={finish}
        />
      </main>
    );
  if (step === 'flavours')
    return (
      <main className="flow-app">
        <section className="flow-photo-head flavours-head">
          <img src="/hookah-hero.webp" alt="Hookah with drifting smoke" />
          <Header step={step} cart={cart} onBack={() => navigateStep('home')} />
          <p>
            Same
            <br />
            flavours
            <br />
            bigger
            <br />
            vibes
          </p>
        </section>
        <section className="flow-sheet flavours-sheet">
          <div className="sheet-handle" />
          <h1>Select flavours</h1>
          <div className="flow-flavour-grid">
            {flavours.map((flavour) => (
              <FlavourCard
                key={flavour.id}
                flavour={flavour}
                quantity={flavourQuantities[flavour.id] || 0}
                onIncrease={() => changeFlavourQuantity(flavour.id, 1)}
                onDecrease={() => changeFlavourQuantity(flavour.id, -1)}
              />
            ))}
            <article className="flow-flavour suggestion-flavour-card">
              <button
                type="button"
                aria-expanded={showSuggestion}
                onClick={startNewSuggestion}
              >
                <MessageSquarePlus />
                <span>
                  <strong>
                    {suggestions.length > 0
                      ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} saved`
                      : "Can't find your flavour?"}
                  </strong>
                  <small>
                    {suggestions.length > 0
                      ? suggestions
                          .map((item) => `${item.name} × ${item.quantity}`)
                          .join(', ')
                      : "Suggest one and we'll confirm availability."}
                  </small>
                  {suggestions.length > 0 && <em>Add or edit</em>}
                </span>
              </button>
            </article>
          </div>
          <div className="selected-head">
            <strong>Selected flavour units ({flavourUnits})</strong>
          </div>
          <div className="flavour-chips">
            {flavours
              .filter((item) => (flavourQuantities[item.id] || 0) > 0)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => changeFlavourQuantity(item.id, -1)}
                  aria-label={`Remove one ${item.name}`}
                >
                  {item.name} × {flavourQuantities[item.id]}
                  <span>×</span>
                </button>
              ))}
          </div>
          <PrimaryButton onClick={() => navigateStep('delivery')}>
            Continue
          </PrimaryButton>
        </section>
        {showSuggestion && (
          <div
            className="suggestion-backdrop"
            role="presentation"
            onClick={() => setShowSuggestion(false)}
          >
            <section
              className="suggestion-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="suggestion-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="suggestion-sheet-handle" />
              <button
                className="suggestion-close"
                type="button"
                aria-label="Close flavour suggestion"
                onClick={() => setShowSuggestion(false)}
              >
                <X />
              </button>
              <MessageSquarePlus className="suggestion-icon" />
              <h2 id="suggestion-title">Suggest a flavour</h2>
              <p>Tell us what you want and we’ll confirm availability.</p>
              {suggestions.length > 0 && (
                <div className="suggestion-list">
                  {suggestions.map((suggestion, index) => (
                    <article key={`${suggestion.name}-${index}`}>
                      <div>
                        <strong>{suggestion.name}</strong>
                        {suggestion.details && (
                          <small>{suggestion.details}</small>
                        )}
                      </div>
                      <span className="saved-suggestion-quantity">
                        <button
                          type="button"
                          disabled={suggestion.quantity === 1}
                          aria-label={`Decrease ${suggestion.name} quantity`}
                          onClick={() => changeSuggestionQuantity(index, -1)}
                        >
                          <Minus />
                        </button>
                        <b>{suggestion.quantity}</b>
                        <button
                          type="button"
                          aria-label={`Increase ${suggestion.name} quantity`}
                          onClick={() => changeSuggestionQuantity(index, 1)}
                        >
                          <Plus />
                        </button>
                      </span>
                      <button
                        type="button"
                        aria-label={`Edit ${suggestion.name}`}
                        onClick={() => editSuggestion(index)}
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${suggestion.name}`}
                        onClick={() =>
                          setSuggestions((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        <Trash2 />
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <label htmlFor="flavour-suggestion">
                Flavour name
                <input
                  id="flavour-suggestion"
                  autoFocus
                  maxLength={60}
                  placeholder="e.g. Mango mint"
                  value={suggestionName}
                  onChange={(event) => setSuggestionName(event.target.value)}
                />
              </label>
              <label htmlFor="suggestion-details">
                Brand or combination <span>Optional</span>
                <input
                  id="suggestion-details"
                  maxLength={80}
                  placeholder="e.g. Any brand, extra mint"
                  value={suggestionDetails}
                  onChange={(event) => setSuggestionDetails(event.target.value)}
                />
              </label>
              <button
                className="suggestion-save"
                type="button"
                disabled={!suggestionName.trim()}
                onClick={saveSuggestion}
              >
                <Check />{' '}
                {editingSuggestion === null
                  ? 'Add suggestion'
                  : 'Update suggestion'}
              </button>
              <small>
                Suggestions are not added to the price until confirmed.
              </small>
            </section>
          </div>
        )}
        <BottomNav
          active="flavours"
          onNavigate={navigateStep}
          onCheckout={finish}
        />
      </main>
    );
  return (
    <main className="flow-app">
      <section className="flow-photo-head delivery-head">
        <img src="/hookah-hero.webp" alt="Hookah hose with drifting smoke" />
        <Header
          step={step}
          cart={cart}
          onBack={() => navigateStep('flavours')}
        />
        <p>
          Your session
          <br />
          your journey
        </p>
      </section>
      <section className="flow-sheet delivery-sheet">
        <div className="sheet-handle" />
        <h1>Delivery and collection</h1>
        <p>Get your session, your way.</p>
        <div className="delivery-options">
          <DeliveryOption
            selected={delivery}
            icon={Truck}
            title="Delivery"
            copy="Delivered to you"
            onClick={() => {
              setDelivery(true);
              setAddress(deliveryAddress);
              setDeliveryQuote({ status: 'idle' });
              setValidationMessage('');
            }}
          />
          <DeliveryOption
            selected={!delivery}
            icon={Store}
            title="Collection"
            copy="Collect in Vorna Valley"
            onClick={() => {
              if (delivery) setDeliveryAddress(address);
              setDelivery(false);
              setAddress(COLLECTION_LOCATION);
            }}
          />
        </div>
        <label className="booking-row">
          <MessageCircle />
          <span>
            Contact number
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="071 234 5678"
            />
          </span>
        </label>
        {delivery ? (
          <>
            <button
              className="delivery-address-summary"
              type="button"
              onClick={() => setShowDeliveryDetails((current) => !current)}
              aria-expanded={showDeliveryDetails}
            >
              <MapPin />
              <span>
                <strong>Delivery address</strong>
                <small>
                  {address && suburb
                    ? [unit, address, suburb].filter(Boolean).join(', ')
                    : 'Add street address and area'}
                  {deliveryInstructions ? ' · Instructions added' : ''}
                </small>
              </span>
              <i>{showDeliveryDetails ? '−' : '+'}</i>
            </button>
            {showDeliveryDetails && (
              <section className="delivery-details-panel address-panel">
                <label className="booking-row delivery-address-row">
                  <MapPin />
                  <span>
                    Street address
                    <span className="booking-input-action">
                      <input
                        required
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          setDeliveryAddress(e.target.value);
                          setLocationPinned(false);
                          setDeliveryQuote({ status: 'idle' });
                          setValidationMessage('');
                        }}
                        placeholder="Street name and number"
                      />
                      <button
                        type="button"
                        aria-label="Use my current location"
                        onClick={(event) => {
                          event.preventDefault();
                          if (!navigator.geolocation) {
                            setLocationStatus(
                              'Location is not available on this device.',
                            );
                            return;
                          }
                          setLocationStatus('');
                          navigator.geolocation.getCurrentPosition(
                            ({ coords }) =>
                              void calculateDeliveryQuote({
                                latitude: coords.latitude,
                                longitude: coords.longitude,
                              }),
                            () =>
                              setLocationStatus(
                                'Location access was not granted.',
                              ),
                          );
                        }}
                      >
                        {locationPinned ? <Check /> : <MapPin />}
                      </button>
                    </span>
                  </span>
                </label>
                {locationStatus && (
                  <small className="location-status error">
                    {locationStatus}
                  </small>
                )}
                <label className="booking-row">
                  <MapPin />
                  <span>
                    Area / suburb
                    <input
                      required
                      value={suburb}
                      onChange={(e) => {
                        setSuburb(e.target.value);
                        setLocationPinned(false);
                        setDeliveryQuote({ status: 'idle' });
                        setValidationMessage('');
                      }}
                      placeholder="e.g. Midrand"
                    />
                  </span>
                </label>
                <label className="booking-row">
                  <Home />
                  <span>
                    Building / unit <i>Optional</i>
                    <input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="Complex, unit or floor"
                    />
                  </span>
                </label>
                <label className="booking-row delivery-notes-row">
                  <MessageCircle />
                  <span>
                    Delivery instructions <i>Optional</i>
                    <input
                      value={deliveryInstructions}
                      onChange={(e) =>
                        setDeliveryInstructions(e.target.value)
                      }
                      placeholder="Gate code, landmark or entrance"
                    />
                  </span>
                </label>
                <button
                  className="delivery-quote-button"
                  type="button"
                  disabled={
                    deliveryQuote.status === 'loading' ||
                    !address.trim() ||
                    !suburb.trim()
                  }
                  onClick={() =>
                    void calculateDeliveryQuote({
                      address: `${address}, ${suburb}, South Africa`,
                      suburb,
                    })
                  }
                >
                  {deliveryQuote.status === 'loading'
                    ? 'Calculating driving distance…'
                    : deliveryQuote.status === 'ready'
                      ? 'Recalculate delivery fee'
                      : 'Calculate delivery fee'}
                </button>
                <button
                  className="delivery-details-done"
                  type="button"
                  onClick={() => setShowDeliveryDetails(false)}
                >
                  Save address
                </button>
              </section>
            )}
            <div className="collection-schedule">
              <label className="booking-row">
                <Clock3 />
                <span>
                  Delivery date
                  <input
                    required
                    min={localDateValue()}
                    type="date"
                    value={collectionDay}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </span>
              </label>
              <label className="booking-row">
                <Clock3 />
                <span>
                  Delivery time
                  <select
                    required
                    value={collectionTime}
                    onChange={(e) =>
                      setDate(
                        collectionDay
                          ? `${collectionDay}T${e.target.value}`
                          : '',
                      )
                    }
                  >
                    <option value="">Select a time</option>
                    {collectionTimeSlots.map((time) => {
                      const elapsed =
                        !collectionDay ||
                        new Date(`${collectionDay}T${time}`).getTime() <=
                          Date.now();
                      return (
                        <option key={time} value={time} disabled={elapsed}>
                          {time}
                        </option>
                      );
                    })}
                  </select>
                </span>
              </label>
            </div>
            <p className="delivery-fee-note">
              {deliveryQuote.status === 'ready'
                ? `${deliveryQuote.distanceKm} km driving · ${money(deliveryQuote.fee || 350)} delivery & collection`
                : 'R250 within 15 km · R350 beyond 15 km'}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                Distance powered by OpenStreetMap
              </a>
            </p>
            {validationMessage ? (
              <p className="delivery-validation-message" role="alert">
                {validationMessage}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <label className="booking-row collection-location-row">
              <MapPin />
              <span>
                Collection location
                <input required value={address} readOnly />
              </span>
            </label>
            <div className="collection-schedule">
              <label className="booking-row">
                <Clock3 />
                <span>
                  Collection date
                  <input
                    required
                    min={localDateValue()}
                    type="date"
                    value={collectionDay}
                    onChange={(e) => {
                      const nextDay = e.target.value;
                      const nextDate = collectionTime
                        ? `${nextDay}T${collectionTime}`
                        : nextDay;
                      setDate(
                        nextDate && new Date(nextDate).getTime() > Date.now()
                          ? nextDate
                          : nextDay,
                      );
                    }}
                  />
                </span>
              </label>
              <label className="booking-row">
                <Clock3 />
                <span>
                  Collection time
                  <select
                    required
                    value={collectionTime}
                    onChange={(e) =>
                      setDate(
                        collectionDay
                          ? `${collectionDay}T${e.target.value}`
                          : '',
                      )
                    }
                  >
                    <option value="">Select a time</option>
                    {collectionTimeSlots.map((time) => {
                      const elapsed =
                        !collectionDay ||
                        new Date(`${collectionDay}T${time}`).getTime() <=
                          Date.now();
                      return (
                        <option key={time} value={time} disabled={elapsed}>
                          {time}
                          {elapsed && collectionDay ? ' — unavailable' : ''}
                        </option>
                      );
                    })}
                  </select>
                </span>
              </label>
            </div>
            <section
              className="collection-details"
              aria-label="Collection details"
            >
              <span>Vorna Valley · Slots confirmed after approval</span>
              <a
                className="collection-whatsapp"
                href={`https://wa.me/${COLLECTION_WHATSAPP}?text=${encodeURIComponent("Hi The Chill Pipe, I'm contacting you about my collection.")}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle /> WhatsApp us
              </a>
            </section>
          </>
        )}
        {!delivery && validationMessage ? (
          <p className="delivery-validation-message" role="alert">
            {validationMessage}
          </p>
        ) : null}
        <PrimaryButton onClick={finish}>Continue</PrimaryButton>
        <small className="relax-copy">Relax. We handle the rest.</small>
      </section>
      <BottomNav
        active="delivery"
        onNavigate={navigateStep}
        onCheckout={finish}
      />
    </main>
  );
}
