'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import CustomerAuthShell from '@/components/customer-auth-shell';
import { cacheCustomerProfile,customerNext,type CustomerAccountResponse } from '@/lib/customer-profile';
export default function CustomerLogin(){
  const [signup,setSignup]=useState(false),[next,setNext]=useState('/my-bookings');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[name,setName]=useState(''),[phone,setPhone]=useState('');
  const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');const lock=useRef(false);
  useEffect(()=>{
    const p=new URLSearchParams(location.search);setNext(customerNext(p.get('next')));setSignup(p.get('mode')==='signup');
    const fragment=new URLSearchParams(location.hash.slice(1));
    if(fragment.get('type')==='recovery'){location.replace('/customer-reset'+location.hash);return;}
    if(fragment.has('access_token'))setMessage('Your email link was opened. Sign in to continue.');
    if(fragment.has('error'))setError('The email link is invalid or expired. Request a new confirmation email.');
    history.replaceState(null,'',location.pathname+location.search);
  },[]);
  async function send(action:'login'|'signup'|'resend'){
    if(lock.current)return;
    setError('');setMessage('');
    if(action==='signup' && password!==confirm){setError('The passwords do not match.');return;}
    lock.current=true;setBusy(true);
    try{
      const r=await fetch('/api/customer/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,fullName:name,phone})});
      const data=await r.json() as CustomerAccountResponse;if(!r.ok)throw new Error(data.error || 'Please try again.');
      setPassword('');setConfirm('');
      if(action==='login'){cacheCustomerProfile(data.profile);location.replace(next);return;}
      setMessage(data.message || 'Check your email, then sign in.');setSignup(false);
    }catch(e){setError(e instanceof Error?e.message:'Could not connect. Please try again.');setPassword('');setConfirm('');}
    finally{lock.current=false;setBusy(false);}
  }
  function submit(e:FormEvent){e.preventDefault();void send(signup?'signup':'login');}
  return <CustomerAuthShell title={signup?'Create account':'Welcome back'} subtitle={next==='/checkout'?'Sign in to finish your rental. Your session is saved.':'Your next session starts here.'}>
    <form onSubmit={submit}>
      {signup&&<><label htmlFor="customer-name">Full name</label><input id="customer-name" autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/><label htmlFor="customer-phone">Contact number</label><input id="customer-phone" type="tel" autoComplete="tel" required maxLength={40} pattern="[+0-9 ()\-]{7,40}" value={phone} onChange={e=>setPhone(e.target.value)} disabled={busy}/></>}
      <label htmlFor="customer-email">Email address</label><input id="customer-email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/>
      <label htmlFor="customer-password">Password</label><div className="cp-login-password"><input id="customer-password" type={show?'text':'password'} autoComplete={signup?'new-password':'current-password'} required minLength={signup?12:undefined} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/><button type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div>
      {signup&&<><label htmlFor="customer-confirm">Confirm password</label><input id="customer-confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy}/><p className="cp-login-note">Use at least 12 characters. We’ll email you a confirmation link.</p></>}
      <button className="cp-login-submit" disabled={busy}>{busy?'Please wait…':signup?'Create account':'Sign in'}</button>
    </form>
    {error&&<p className="cp-login-error" role="alert">{error}</p>}{message&&<p className="cp-login-note" role="status">{message}</p>}
    <button className="cp-login-back" style={{background:'none',border:0,padding:0,cursor:'pointer'}} disabled={busy} onClick={()=>{setSignup(!signup);setError('');setMessage('');setPassword('');setConfirm('');}}>{signup?'Already have an account? Sign in':'New here? Create an account'}</button>
    {!signup&&<><br/><a className="cp-login-back" href="/customer-reset">Forgot password?</a><br/><button className="cp-login-back" style={{background:'none',border:0,padding:0,cursor:'pointer'}} disabled={busy || !email} onClick={()=>void send('resend')}>Resend confirmation email</button></>}
  </CustomerAuthShell>;
}
