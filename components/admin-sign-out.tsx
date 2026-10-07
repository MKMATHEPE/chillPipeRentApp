'use client';
import { useState } from 'react';
import './admin-sign-out.css';
export default function AdminSignOut() {
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function logout(){setBusy(true);setError('');try{const r=await fetch('/api/admin/auth/logout',{method:'POST'});if(!r.ok)throw new Error();window.location.replace('/admin-login');}catch{setError('Could not sign out. Try again.');setBusy(false);}}
  return <div className="cp-admin-signout"><button disabled={busy} onClick={logout}>{busy?'Signing out…':'Sign out'}</button>{error && <span role="alert">{error}</span>}</div>;
}
