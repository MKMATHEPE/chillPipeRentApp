'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, CircleHelp, FileText, Menu, MessageCircle, Pencil, UserRound, X } from 'lucide-react';

type SavedProfile = { phone?: string; location?: string; bookingReference?: string };

export function AppHeader({ onBack }: { onBack?: () => void }) {
  const [panel, setPanel] = useState<'profile' | 'menu' | null>(null);
  const [profile, setProfile] = useState<SavedProfile>({});
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('chill-pipe-profile') || '{}');
      const draft = JSON.parse(localStorage.getItem('chill-pipe-draft') || '{}');
      const order = JSON.parse(localStorage.getItem('chill-pipe-order') || '{}');
      const booking = JSON.parse(localStorage.getItem('chill-pipe-booking-access') || '{}');
      const nextProfile = {
        phone: saved.phone || draft.phone || order.customer?.phone || booking.phone,
        location: saved.location || draft.address || order.customer?.location,
        bookingReference: booking.reference,
      };
      setProfile(nextProfile);
      setPhone(nextProfile.phone || '');
      setLocation(nextProfile.location || '');
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
    const nextProfile = { ...profile, phone: phone.trim(), location: location.trim() };
    localStorage.setItem('chill-pipe-profile', JSON.stringify(nextProfile));
    const rawDraft = localStorage.getItem('chill-pipe-draft');
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft);
        localStorage.setItem('chill-pipe-draft', JSON.stringify({ ...draft, phone: nextProfile.phone, address: nextProfile.location }));
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
        <div className="header-panel-title"><h2>{panel === 'profile' ? 'Profile' : 'Menu'}</h2><button aria-label="Close panel" onClick={() => setPanel(null)}><X /></button></div>
        {panel === 'profile' ? <div className="profile-panel-content">
          {editing ? <div className="profile-edit-form">
            <label><span>Contact number</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 076 850 5523" /></label>
            <label><span>Delivery address</span><textarea value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter your delivery address" /></label>
            <div><button onClick={() => setEditing(false)}>Cancel</button><button className="profile-save" onClick={saveProfile} disabled={!phone.trim()}><Check /> Save details</button></div>
          </div> : <>
            <button className="profile-edit" onClick={() => setEditing(true)}><Pencil /> Edit details</button>
            <section><small>Customer details</small><strong>{profile.phone || 'No contact number saved'}</strong></section>
            <section><small>Saved delivery address</small><strong>{profile.location || 'No address saved'}</strong></section>
            <a className="header-panel-link" href={trackHref}><span>My bookings</span><ChevronRight /></a>
          </>}
        </div> : <nav className="header-panel-menu">
          <a href="/how-it-works"><CircleHelp /><span>How it works</span><ChevronRight /></a>
          <a href="https://wa.me/27768505523" target="_blank" rel="noreferrer"><MessageCircle /><span>Contact us</span><ChevronRight /></a>
          <a href="/terms"><FileText /><span>Terms and conditions</span><ChevronRight /></a>
        </nav>}
      </aside>
    </div> : null}
  </>;
}

function BrandLogo() {
  return <a className="flow-brand" href="/" aria-label="The Chill Pipe home"><img src="/chill-pipe-logo.webp" alt="The Chill Pipe" /><span>Hookah rentals</span></a>;
}
