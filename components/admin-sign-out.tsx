'use client';
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import './admin-sign-out.css';
export default function AdminSignOut() {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const [email,setEmail]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [changing,setChanging]=useState(false),[current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
  const lock=useRef(false);
  const clearPasswords=()=>{setCurrent('');setPassword('');setConfirmation('');};
  async function loadAccount() {
    setLoading(true);setError('');setEmail('');
    try {
      const response=await fetch('/api/admin/auth/session',{cache:'no-store'});
      if(response.status===401){window.location.replace('/admin-login');return;}
      const data=await response.json() as {email?:string};
      if(!response.ok || !data.email) throw new Error('Could not load your account. Please retry.');
      setEmail(data.email);
    } catch(err){setError(err instanceof Error?err.message:'Could not load account.');}
    finally{setLoading(false);}
  }
  async function perform(kind:'password'|'recover'|'logout') {
    if(lock.current)return;
    setError('');setMessage('');
    if(kind==='password' && password!==confirmation){setError('New passwords do not match.');return;}
    lock.current=true;setBusy(true);
    try {
      const response=await fetch(`/api/admin/auth/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},...(kind==='logout'?{}:{body:JSON.stringify(kind==='password'?{currentPassword:current,password}:{email})})});
      const data=await response.json() as {error?:string;message?:string};
      if(!response.ok)throw new Error(data.error || 'Could not complete this request.');
      clearPasswords();
      if(kind==='recover')setMessage(data.message || 'Check your inbox for a reset link.');
      else if(kind==='password'){setMessage('Password changed. Please sign in with your new password.');setChanging(false);setEmail('');}
      else window.location.replace('/admin-login');
    } catch(err){setError(err instanceof Error?err.message:'Could not complete this request.');}
    finally{lock.current=false;setBusy(false);}
  }
  const changed=message.startsWith('Password changed.');
  return <><div className="cp-admin-signout"><button onClick={()=>{setOpen(true);setMessage('');setChanging(false);void loadAccount();}}>Account</button></div>
    <Dialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);if(!value){clearPasswords();if(changed)window.location.replace('/admin-login');}}}}>
      <DialogContent className="cp-account-dialog"><DialogTitle>Admin account</DialogTitle><DialogDescription>Manage your sign-in details.</DialogDescription>
        {loading?<p role="status">Loading account…</p>:email&&<div className="cp-account-email"><span>Signed in as</span><strong>{email}</strong></div>}
        {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
        {changed?<a className="cp-account-primary" href="/admin-login">Sign in</a>:<>
          {!email&&!loading&&<button disabled={busy} onClick={()=>void loadAccount()}>Retry</button>}
          {email&&<><button disabled={busy} onClick={()=>{setChanging(!changing);clearPasswords();setError('');setMessage('');}}>{changing?'Cancel password change':'Change password'}</button>
            {changing&&<form onSubmit={e=>{e.preventDefault();void perform('password');}}><fieldset disabled={busy}>
              <label>Current password<input type="password" autoComplete="current-password" required maxLength={128} value={current} onChange={e=>setCurrent(e.target.value)}/></label>
              <label>New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
              <label>Confirm new password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
              <p>Use 12–128 characters. You’ll be signed out of admin sessions after saving.</p><button className="cp-account-primary" type="submit">{busy?'Saving…':'Save password'}</button>
            </fieldset></form>}
            <button disabled={busy} onClick={()=>void perform('recover')}>{busy?'Please wait…':'Send password-reset email'}</button></>}
          <button disabled={busy} onClick={()=>void perform('logout')}>Sign out</button>
        </>}
      </DialogContent>
    </Dialog></>;
}
