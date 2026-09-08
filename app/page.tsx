'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, MapPin, Minus, Plus, Send, Sparkles } from 'lucide-react';

type Product = { id: string; name: string; note: string; price: number };
const products: Product[] = [
  { id: 'pipe', name: 'Hookah pipe', note: '24-hour rental', price: 450 },
  { id: 'coal', name: 'Coal box', note: '36 pieces', price: 50 },
  { id: 'stove', name: 'Coal stove', note: 'Optional add-on', price: 150 },
];
const flavours = ['Lady Killer', 'Gum and Mint', 'Cream Mint', 'Double Apple', 'Grape Mint', 'Blue Mist'];
const money = (value: number) => `R${value.toLocaleString('en-ZA')}`;

export default function Home() {
  const [quantities, setQuantities] = useState<Record<string, number>>({ pipe: 2, coal: 2, stove: 1 });
  const [selectedFlavours, setSelectedFlavours] = useState<string[]>(['Lady Killer', 'Gum and Mint', 'Cream Mint']);
  const [delivery, setDelivery] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', date: '', location: '', notes: '' });
  const flavourTotal = selectedFlavours.length * 50;
  const itemTotal = products.reduce((sum, item) => sum + quantities[item.id] * item.price, 0);
  const total = itemTotal + flavourTotal;
  const selectedItems = useMemo(() => products.filter((item) => quantities[item.id] > 0), [quantities]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const allowedFlavours = new Set(flavours);
    void Promise.resolve(context.registerTool({
      name: 'stage_rental_request',
      title: 'Stage a hookah rental request',
      description: 'Fill the visible Chill Pipe request form with customer details, rental quantities, flavours, and delivery preference. This stages the request but does not send or confirm it.',
      inputSchema: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1 }, phone: { type: 'string', minLength: 5 }, date: { type: 'string' }, location: { type: 'string', minLength: 1 },
          pipes: { type: 'integer', minimum: 0, maximum: 10 }, coalBoxes: { type: 'integer', minimum: 0, maximum: 10 }, stoves: { type: 'integer', minimum: 0, maximum: 10 },
          flavours: { type: 'array', items: { type: 'string', enum: flavours }, uniqueItems: true }, delivery: { type: 'boolean' }, notes: { type: 'string' },
        }, required: ['name', 'phone', 'date', 'location', 'pipes', 'coalBoxes', 'stoves', 'flavours', 'delivery'],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== 'object') throw new Error('A complete rental request is required.');
        const value = input as Record<string, unknown>;
        const incomingFlavours = Array.isArray(value.flavours) ? value.flavours : [];
        if (!incomingFlavours.every((item) => typeof item === 'string' && allowedFlavours.has(item))) throw new Error('One or more flavours are unavailable.');
        const number = (key: string) => { const n = value[key]; if (!Number.isInteger(n) || Number(n) < 0 || Number(n) > 10) throw new Error(`${key} must be between 0 and 10.`); return Number(n); };
        for (const key of ['name', 'phone', 'date', 'location']) if (typeof value[key] !== 'string' || !String(value[key]).trim()) throw new Error(`${key} is required.`);
        setCustomer({ name: String(value.name), phone: String(value.phone), date: String(value.date), location: String(value.location), notes: typeof value.notes === 'string' ? value.notes : '' });
        setQuantities({ pipe: number('pipes'), coal: number('coalBoxes'), stove: number('stoves') });
        setSelectedFlavours(incomingFlavours as string[]); setDelivery(Boolean(value.delivery)); setSubmitted(false);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        return { status: 'staged', estimatedTotal: number('pipes') * 450 + number('coalBoxes') * 50 + number('stoves') * 150 + incomingFlavours.length * 50, currency: 'ZAR' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  function adjust(id: string, amount: number) { setQuantities((q) => ({ ...q, [id]: Math.max(0, Math.min(10, q[id] + amount)) })); }
  function toggleFlavour(name: string) { setSelectedFlavours((f) => f.includes(name) ? f.filter((item) => item !== name) : [...f, name]); }
  const requestText = `Hi The Chill Pipe, I would like to request a rental.\n\nName: ${customer.name}\nPhone: ${customer.phone}\nDate: ${customer.date}\nLocation: ${customer.location}\n\n${selectedItems.map((item) => `${item.name} x ${quantities[item.id]} — ${money(item.price * quantities[item.id])}`).join('\n')}\nFlavours: ${selectedFlavours.join(', ') || 'None'}\nDelivery & collection: ${delivery ? 'Required — price to be confirmed' : 'Not required'}\nEstimated total: ${money(total)}${delivery ? ' + delivery/collection' : ''}\nNotes: ${customer.notes || 'None'}`;
  async function copyRequest() { await navigator.clipboard.writeText(requestText); setCopied(true); setTimeout(() => setCopied(false), 1800); }
  function submit(event: React.FormEvent) { event.preventDefault(); setSubmitted(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  if (submitted) return <main className="success-shell"><section className="success-card"><div className="success-mark"><Check size={28} /></div><p className="eyebrow">Request ready</p><h1>Nice choice, {customer.name.split(' ')[0]}.</h1><p className="success-copy">Your rental request has been prepared. Send it to The Chill Pipe on WhatsApp to confirm availability and delivery pricing.</p><div className="request-preview"><pre>{requestText}</pre></div><div className="success-actions"><a className="primary-button" href={`https://wa.me/?text=${encodeURIComponent(requestText)}`} target="_blank" rel="noreferrer"><Send size={16} /> Send via WhatsApp</a><button className="secondary-button" onClick={copyRequest}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy request'}</button></div><button className="text-button" onClick={() => setSubmitted(false)}>Edit request</button></section></main>;

  return <main>
    <header className="site-header"><a className="brand" href="#top" aria-label="The Chill Pipe home"><img src="/chill-pipe-logo.png" alt="The Chill Pipe" /></a><div className="header-note"><span className="pulse" /> Taking rental requests</div></header>
    <section className="intro" id="top"><div><p className="eyebrow"><Sparkles size={14} /> Your event, sorted</p><h1>Bring the chill.<br /><em>We’ll bring the pipe.</em></h1></div><p>Build your 24-hour hookah rental, choose your flavours and tell us where the good times are happening.</p></section>
    <form className="booking-layout" onSubmit={submit}>
      <div className="builder-column">
        <section className="section-block"><div className="section-heading"><span>01</span><div><h2>Choose your setup</h2><p>Adjust quantities to match your occasion.</p></div></div><div className="product-list">{products.map((product) => <div className="product-row" key={product.id}><div><h3>{product.name}</h3><p>{product.note} · {money(product.price)} each</p></div><div className="stepper" aria-label={`${product.name} quantity`}><button type="button" onClick={() => adjust(product.id, -1)} aria-label={`Remove one ${product.name}`}><Minus size={15} /></button><output>{quantities[product.id]}</output><button type="button" onClick={() => adjust(product.id, 1)} aria-label={`Add one ${product.name}`}><Plus size={15} /></button></div></div>)}</div></section>
        <section className="section-block"><div className="section-heading"><span>02</span><div><h2>Pick your flavours</h2><p>R50 per flavour. Two per hookah is a good starting point.</p></div></div><div className="flavour-grid">{flavours.map((flavour) => { const active = selectedFlavours.includes(flavour); return <button type="button" key={flavour} className={active ? 'flavour active' : 'flavour'} onClick={() => toggleFlavour(flavour)}><span>{flavour}</span><span className="flavour-check">{active && <Check size={14} />}</span></button>; })}</div></section>
        <section className="section-block"><div className="section-heading"><span>03</span><div><h2>Tell us about the booking</h2><p>We’ll use these details to confirm availability.</p></div></div><div className="form-grid"><label><span>Full name</span><input required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Your name" /></label><label><span>WhatsApp number</span><input required type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="e.g. 071 234 5678" /></label><label><span>Rental date</span><input required type="date" value={customer.date} onChange={(e) => setCustomer({ ...customer, date: e.target.value })} /></label><label><span>Area / suburb</span><input required value={customer.location} onChange={(e) => setCustomer({ ...customer, location: e.target.value })} placeholder="Where is the event?" /></label><label className="wide"><span>Anything we should know?</span><textarea value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} placeholder="Event time, access notes or special flavour request" /></label></div><label className="delivery-option"><input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} /><span className="custom-check"><Check size={13} /></span><span><strong>Delivery and collection</strong><small><MapPin size={13} /> Charged separately based on your location</small></span></label></section>
      </div>
      <aside className="summary-column"><div className="summary-card"><p className="eyebrow">Your rental</p><h2>Order summary</h2><div className="summary-items">{selectedItems.map((item) => <div className="summary-line" key={item.id}><span>{item.name} × {quantities[item.id]}</span><strong>{money(item.price * quantities[item.id])}</strong></div>)}{selectedFlavours.length > 0 && <div className="summary-line"><span>{selectedFlavours.length} flavour{selectedFlavours.length !== 1 && 's'}</span><strong>{money(flavourTotal)}</strong></div>}</div><div className="summary-total"><span>Estimated total</span><strong>{money(total)}</strong></div><p className="delivery-note">{delivery ? 'Delivery and collection will be quoted separately after we confirm your location.' : 'You will collect and return the equipment at the agreed location.'}</p><button className="request-button" type="submit">Request this setup <Send size={16} /></button><p className="fine-print">No payment is taken here. We’ll confirm availability and the final amount first.</p></div><details className="terms-preview"><summary>Good to know <ChevronDown size={15} /></summary><ul><li>Rental period is 24 hours.</li><li>Free cancellation up to 48 hours before.</li><li>Equipment must be returned complete and undamaged.</li><li>For use by adults aged 18 and over.</li></ul></details></aside>
    </form>
    <footer><img src="/chill-pipe-logo.png" alt="" /><p>Bring the chill, we bring the pipe.</p><span>24-hour hookah rentals</span></footer>
  </main>;
}
