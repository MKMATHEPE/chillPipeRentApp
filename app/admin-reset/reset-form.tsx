'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
export default function ResetForm(){
  const mounted=useRef(false);
  const [token,setToken]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [complete,setComplete]=useState(false);
  useEffect(()=>{
    if(mounted.current)return;mounted.current=true;
    const fragment=new URLSearchParams(window.location.hash.slice(1));
    const value=fragment.get('access_token');
    if(value && fragment.get('type')==='recovery')setToken(value);
    else if(fragment.has('error') || value)setError('This link is invalid or expired. Request a new password link.');
    // Remove credentials from the address bar immediately; keep only the access token in memory.
    window.history.replaceState(null,'',window.location.pathname);
    setReady(true);
  },[]);
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;
    setError('');setMessage('');
    if(token && password!==confirm){setError('The passwords do not match.');return;}
    setBusy(true);
    try{
      const response=await fetch(token?'/api/admin/auth/reset':'/api/admin/auth/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(token?{accessToken:token,password}:{email})});
      const data=await response.json() as {error?:string;message?:string};
      if(!response.ok){setError(data.error||'Please try again.');if(response.status===401)setToken('');}
      else if(token){setToken('');setComplete(true);setMessage('Your password has been saved. Sign in with your new password.');}
      else setMessage(data.message||'Check your email for the password link.');
    }catch{setError('Could not connect. Please try again.');}
    finally{setPassword('');setConfirm('');setBusy(false);}
  }
  if(!ready)return <p role="status">Preparing secure password setup…</p>;
  return <><p className="cp-login-note">{token?'Choose a unique password of at least 12 characters.':'Enter your administrator email to receive a secure password link.'}</p>
    {!complete && <form onSubmit={submit}>{token?<><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy} value={confirm} onChange={e=>setConfirm(e.target.value)}/></>:<><label htmlFor="recovery-email">Email address</label><input id="recovery-email" type="email" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={e=>setEmail(e.target.value)}/></>}
    <button className="cp-login-submit" disabled={busy} type="submit">{busy?'Please wait…':token?'Save password':'Send password link'}</button></form>}
    {error && <p className="cp-login-error" role="alert">{error}</p>}{message && <p className="cp-login-note" role="status">{message}</p>}
    {complete && <a className="cp-login-back" href="/admin-login">Sign in</a>}
  </>;
}
