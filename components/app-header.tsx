'use client';

import { useEffect, useState } from 'react';
import { cacheCustomerProfile,clearCustomerDevice,type CustomerAccountResponse } from '@/lib/customer-profile';
import { ArrowLeft, CalendarDays, Check, ChevronRight, CircleHelp, FileText, LogOut, MapPin, Menu, MessageCircle, Pencil, UserRound, X } from 'lucide-react';

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
  const [signedIn,setSignedIn]=useState(false),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');

  useEffect(() => {
    if(panel!=='profile')return;
    const controller=new AbortController();setLoading(true);setError('');setEditing(false);setSignedIn(false);setProfile({});
    void fetch('/api/customer/auth/session',{cache:'no-store',signal:controller.signal}).then(async r=>{
      if(r.status===401){setSignedIn(false);setProfile({});return;}
      const data=await r.json() as CustomerAccountResponse;if(!r.ok)throw new Error(data.error);
      const p=data.profile;if(cacheCustomerProfile(p)){window.location.href='/';return;}setSignedIn(true);setProfile(p);setFullName(p.fullName || '');setPhone(p.phone || '');setEmail(p.email || '');setLocation(p.location || '');setAlternativePhone(p.alternativePhone || '');
    }).catch(e=>{if(!controller.signal.aborted)setError(e.message || 'Could not load profile. Close and reopen to retry.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  }, [panel]);

  useEffect(() => {
    if (!panel) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setPanel(null);
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [panel]);

  async function saveProfile() {
    if(busy)return;setBusy(true);setError('');
    try{
      const r=await fetch('/api/customer/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName,phone,location,alternativePhone})});
      const data=await r.json() as CustomerAccountResponse;if(!r.ok)throw new Error(data.error || 'Could not save details.');
      cacheCustomerProfile(data.profile);setProfile(data.profile);setEditing(false);
      // Do not silently replace a quoted rental address with a saved profile address.
      window.dispatchEvent(new CustomEvent('chill-pipe-profile-updated',{detail:{fullName:data.profile.fullName,phone:data.profile.phone}}));
    }catch(e){setError(e instanceof Error?e.message:'Could not save details.');}finally{setBusy(false);}
  }

  async function logOut() {
    if (!window.confirm('Log out and clear your saved details from this device?')) return;
    setBusy(true);setError('');try{const r=await fetch('/api/customer/auth/logout',{method:'POST'});if(!r.ok)throw new Error('Could not log out. Please retry.');clearCustomerDevice();window.location.href='/';}catch(e){setError(e instanceof Error?e.message:'Could not log out.');setBusy(false);}
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
          {error&&<p role="alert">{error}</p>}
          {loading?<p role="status">Loading account…</p>:!signedIn?<><p>Sign in to save your details and manage your rentals.</p><a className="header-panel-link" href="/customer-login"><UserRound/><span>Sign in</span><ChevronRight/></a><a className="header-panel-link" href="/customer-login?mode=signup"><span>Create account</span><ChevronRight/></a></>:editing ? <div className="profile-edit-form">
            <label><span>Full name</span><input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter your full name" /></label>
            <label><span>Contact number</span><input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 076 850 5523" /></label>
            <label><span>Email address</span><input type="email" autoComplete="email" value={email} readOnly /></label>
            <label><span>Delivery address</span><textarea autoComplete="street-address" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter your delivery address" /></label>
            <label><span>Alternative contact number <em>Optional</em></span><input type="tel" inputMode="tel" autoComplete="tel" value={alternativePhone} onChange={(event) => setAlternativePhone(event.target.value)} placeholder="Enter another contact number" /></label>
            <div><button disabled={busy} onClick={() => setEditing(false)}>Cancel</button><button className="profile-save" onClick={()=>void saveProfile()} disabled={busy || !phone.trim() || !fullName.trim()}><Check /> {busy?'Saving…':'Save details'}</button></div>
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
            <a className="header-panel-link" href="/my-bookings"><CalendarDays /><span>My bookings</span><ChevronRight /></a>
            <button className="profile-edit" onClick={() => setEditing(true)}><Pencil /> Edit details</button>
            <a className="header-panel-link" href="/customer-reset"><span>Reset password</span><ChevronRight/></a>
            <button className="profile-logout" disabled={busy} onClick={()=>void logOut()}><LogOut /> Log out</button>
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
