'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, ChevronRight, CircleHelp, FileText, MapPin, Menu, MessageCircle, Pencil, UserRound, X } from 'lucide-react';

type SavedProfile = {
  fullName?: string;
  phone?: string;
  email?: string;
  location?: string;
  alternativePhone?: string;
  bookingReference?: string;
};

export function AppHeader({ onBack }: { onBack?: () => void }) {
  const [panel, setPanel] = useState<'profile' | 'menu' | null>(null);
  const [profile, setProfile] = useState<SavedProfile>({});
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [alternativePhone, setAlternativePhone] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('chill-pipe-profile') || '{}');
      const draft = JSON.parse(localStorage.getItem('chill-pipe-draft') || '{}');
      const order = JSON.parse(localStorage.getItem('chill-pipe-order') || '{}');
      const booking = JSON.parse(localStorage.getItem('chill-pipe-booking-access') || '{}');
      const nextProfile = {
        fullName: saved.fullName || (order.customer?.name !== 'Customer' ? order.customer?.name : ''),
        phone: saved.phone || draft.phone || order.customer?.phone || booking.phone,
        email: saved.email,
        location: saved.location || draft.address || order.customer?.location,
        alternativePhone: saved.alternativePhone,
        bookingReference: booking.reference,
      };
      setProfile(nextProfile);
      setFullName(nextProfile.fullName || '');
      setPhone(nextProfile.phone || '');
      setEmail(nextProfile.email || '');
      setLocation(nextProfile.location || '');
      setAlternativePhone(nextProfile.alternativePhone || '');
    } catch {
      setProfile({});
    }
  }, [panel]);

  useEffect(() => {
    if (!panel) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setPanel(null);
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [panel]);

  const trackHref = profile.bookingReference
    ? `/track?reference=${encodeURIComponent(profile.bookingReference)}&phone=${encodeURIComponent(profile.phone || '')}`
    : '/track';

  function saveProfile() {
    const nextProfile = {
      ...profile,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      location: location.trim(),
      alternativePhone: alternativePhone.trim(),
    };
    localStorage.setItem('chill-pipe-profile', JSON.stringify(nextProfile));
    const rawDraft = localStorage.getItem('chill-pipe-draft');
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft);
        localStorage.setItem('chill-pipe-draft', JSON.stringify({ ...draft, phone: nextProfile.phone, address: nextProfile.location }));
      } catch {}
    }
    const rawOrder = localStorage.getItem('chill-pipe-order');
    if (rawOrder) {
      try {
        const order = JSON.parse(rawOrder);
        localStorage.setItem('chill-pipe-order', JSON.stringify({
          ...order,
          customer: {
            ...order.customer,
            name: nextProfile.fullName || order.customer?.name,
            phone: nextProfile.phone,
            location: nextProfile.location || order.customer?.location,
          },
        }));
      } catch {}
    }
    setProfile(nextProfile);
    setEditing(false);
    window.dispatchEvent(new CustomEvent('chill-pipe-profile-updated', { detail: nextProfile }));
  }

  return <>
    <header className="flow-header">
      {onBack ? <button aria-label="Go back" onClick={onBack}><ArrowLeft /></button> : <BrandLogo />}
      {onBack && <BrandLogo />}
      <div className="flow-head-actions">
        <button aria-label="Open profile" aria-expanded={panel === 'profile'} onClick={() => setPanel(panel === 'profile' ? null : 'profile')}><UserRound /></button>
        <button aria-label="Open menu" aria-expanded={panel === 'menu'} onClick={() => setPanel(panel === 'menu' ? null : 'menu')}><Menu /></button>
      </div>
    </header>
    {panel ? <div className="header-panel-layer">
      <button className="header-panel-backdrop" aria-label="Close panel" onClick={() => setPanel(null)} />
      <aside className="header-panel" aria-label={panel === 'profile' ? 'Profile' : 'Menu'}>
        <div className="header-panel-visual">
          <img src="/hookah-hero.webp" alt="" />
          <BrandLogo />
          <button aria-label="Close panel" onClick={() => setPanel(null)}><X /></button>
        </div>
        <div className={`header-panel-sheet ${panel === 'profile' ? 'profile-sheet' : ''}`}>
          <span className="header-panel-handle" />
          <div className="header-panel-title"><h2>{panel === 'profile' ? 'Profile' : 'Menu'}</h2></div>
        {panel === 'profile' ? <div className="profile-panel-content">
          {editing ? <div className="profile-edit-form">
            <label><span>Full name</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter your full name" /></label>
            <label><span>Contact number</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 076 850 5523" /></label>
            <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" /></label>
            <label><span>Delivery address</span><textarea value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter your delivery address" /></label>
            <label><span>Alternative contact number <em>Optional</em></span><input type="tel" value={alternativePhone} onChange={(event) => setAlternativePhone(event.target.value)} placeholder="Enter another contact number" /></label>
            <div><button onClick={() => setEditing(false)}>Cancel</button><button className="profile-save" onClick={saveProfile} disabled={!phone.trim()}><Check /> Save details</button></div>
          </div> : <>
            <section className="profile-contact-summary">
              <UserRound />
              <span>
                <strong>{profile.fullName || 'Add your name'}</strong>
                <small>{[profile.phone, profile.email].filter(Boolean).join(' · ') || 'Add your contact details'}</small>
                {profile.alternativePhone ? <em>Alternative: {profile.alternativePhone}</em> : null}
              </span>
            </section>
            <section className="profile-address-summary">
              <MapPin />
              <span><small>Delivery address</small><strong title={profile.location}>{profile.location || 'No address saved'}</strong></span>
            </section>
            <a className="header-panel-link" href={trackHref}><CalendarDays /><span>My bookings</span><ChevronRight /></a>
            <button className="profile-edit" onClick={() => setEditing(true)}><Pencil /> Edit details</button>
          </>}
        </div> : <nav className="header-panel-menu">
          <a href="/how-it-works"><CircleHelp /><span>How it works</span><ChevronRight /></a>
          <a href="https://wa.me/27768505523" target="_blank" rel="noreferrer"><MessageCircle /><span>Contact us</span><ChevronRight /></a>
          <a href="/terms"><FileText /><span>Terms and conditions</span><ChevronRight /></a>
        </nav>}
        </div>
      </aside>
    </div> : null}
  </>;
}

function BrandLogo() {
  return <a className="flow-brand" href="/" aria-label="The Chill Pipe home"><img src="/chill-pipe-logo.webp" alt="The Chill Pipe" /><span>Hookah rentals</span></a>;
}
