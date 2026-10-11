'use client';
import {useRef,useState,type FormEvent} from 'react';
import CustomerAuthShell from '../../components/customer-auth-shell';
import {customerNext} from '../../lib/customer-profile';
export default function PasswordForm(){
  const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
  async function submit(e:FormEvent){e.preventDefault();if(lock.current)return;setError('');if(password!==confirmation){setError('Passwords do not match.');return;}lock.current=true;setBusy(true);
    try{const r=await fetch('/api/customer/auth/change-test-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,confirmation})});const d=await r.json() as {error?:string};if(!r.ok)throw new Error(d.error||'Could not save password.');location.replace('/customer-login?passwordChanged=1&next='+encodeURIComponent(customerNext(new URLSearchParams(location.search).get('next'))));}
    catch(e){setError(e instanceof Error?e.message:'Could not save password.');}finally{setPassword('');setConfirmation('');lock.current=false;setBusy(false);}
  }
  return <CustomerAuthShell title="Choose your password" subtitle="Local test account. Replace your temporary password before booking."><form onSubmit={submit}><label htmlFor="new-test-password">New password</label><input id="new-test-password" type="password" required autoComplete="new-password" minLength={12} maxLength={128} disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/><label htmlFor="confirm-test-password">Confirm password</label><input id="confirm-test-password" type="password" required autoComplete="new-password" minLength={12} maxLength={128} disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/><button className="cp-login-submit" disabled={busy}>{busy?'Saving…':'Save password'}</button></form>{error&&<p role="alert" className="cp-login-error">{error}</p>}<a className="cp-login-back" href="/customer-login">Back to sign in</a></CustomerAuthShell>;
}
