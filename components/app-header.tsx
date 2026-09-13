'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, CircleHelp, FileText, Menu, MessageCircle, UserRound, X } from 'lucide-react';

type SavedProfile = { phone?: string; location?: string; bookingReference?: string };

export function AppHeader({ onBack }: { onBack?: () => void }) {
  const [panel, setPanel] = useState<'profile' | 'menu' | null>(null);
  const [profile, setProfile] = useState<SavedProfile>({});

  useEffect(() => {
    try {
      const order = JSON.parse(localStorage.getItem('chill-pipe-order') || '{}');
      const booking = JSON.parse(localStorage.getItem('chill-pipe-booking-access') || '{}');
      setProfile({ phone: order.customer?.phone || booking.phone, location: order.customer?.location, bookingReference: booking.reference });
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
          <section><small>Customer details</small><strong>{profile.phone || 'No contact number saved'}</strong></section>
          <section><small>Saved delivery address</small><strong>{profile.location || 'No address saved'}</strong></section>
          <a className="header-panel-link" href={trackHref}><span>My bookings</span><ChevronRight /></a>
        </div> : <nav className="header-panel-menu">
          <a href="/how-it-works"><CircleHelp /><span>How it works</span><ChevronRight /></a>
          <a href="https://wa.me/27768505523"><MessageCircle /><span>Contact us</span><ChevronRight /></a>
          <a href="/terms"><FileText /><span>Terms and conditions</span><ChevronRight /></a>
        </nav>}
      </aside>
    </div> : null}
  </>;
}

function BrandLogo() {
  return <a className="flow-brand" href="/" aria-label="The Chill Pipe home"><img src="/chill-pipe-logo.webp" alt="The Chill Pipe" /><span>Hookah rentals</span></a>;
}
