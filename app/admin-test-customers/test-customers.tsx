'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import './style.css';
type Customer={id:string;email:string;fullName:string;phone:string;enabled:number;mustChange:number};
export default function TestCustomers(){
  const [customers,setCustomers]=useState<Customer[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[password,setPassword]=useState('');
  const [removing,setRemoving]=useState<Customer|null>(null);const lock=useRef(false);
  async function load(signal?:AbortSignal){
    setLoading(true);
    try{const r=await fetch('/api/admin/test-customers',{cache:'no-store',signal});if(r.status===401){location.replace('/admin-login');return;}const d=await r.json() as {customers?:Customer[];error?:string};if(!r.ok)throw new Error(d.error);setCustomers(d.customers||[]);}
    catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Unable to load customers.');}finally{if(!signal?.aborted)setLoading(false);}
  }
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[]);
  async function change(body:Record<string,unknown>){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try{const r=await fetch('/api/admin/test-customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json() as {error?:string};if(!r.ok)throw new Error(d.error||'Unable to save.');
      if(body.action==='create'){setName('');setEmail('');setPhone('');setMessage('Test customer created. Give them the temporary password you entered; they must replace it before booking.');}
      else setMessage(body.action==='remove'?'Test account removed. Its test bookings remain for review.':'Test account updated. Previous sessions have been revoked.');
      setRemoving(null);await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to save.');}finally{setPassword('');lock.current=false;setBusy(false);}
  }
  function create(e:FormEvent){e.preventDefault();void change({action:'create',fullName:name,email,phone,temporaryPassword:password});}
  return <main className="test-customers"><header><img src="/chill-pipe-logo.webp" alt="The Chill Pipe"/><a href="/admin-preview">Back to admin</a></header>
    <section><p className="test-label">LOCAL TEST ENVIRONMENT · NO REAL CUSTOMERS</p><h1>Test customers</h1><p>Only you can create accounts. Use fictional details. No emails are sent and no real payments are processed by these controls.</p>
      <form onSubmit={create}><h2>Add a test customer</h2><fieldset disabled={busy}>
        <label>Full name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Test email<input type="email" required placeholder="alice@test.invalid" maxLength={77} value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Test contact number<input type="tel" required maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        <label>Temporary password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <small>12–128 characters. Passwords are never shown in the account list. Lost passwords require a new test account.</small><button type="submit">{busy?'Saving…':'Create test customer'}</button>
      </fieldset></form>
      {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>{setError('');void load();}}>Retry list</button></p>}{message&&<p role="status">{message}</p>}
      <h2>Test accounts</h2>{loading?<p role="status">Loading…</p>:customers.length===0?<p>No test customers yet.</p>:<ul>{customers.map(c=><li key={c.id}><div><strong>{c.fullName}</strong><span>{c.email}</span><small>{c.enabled?(c.mustChange?'Password change required':'Active'):'Disabled'}</small></div><div className="test-actions"><button disabled={busy} onClick={()=>void change({action:c.enabled?'disable':'enable',id:c.id})}>{c.enabled?'Disable':'Enable'}</button><button disabled={busy} onClick={()=>setRemoving(c)}>Remove</button></div></li>)}</ul>}
      {removing&&<div className="test-confirm" role="alert"><p>Remove {removing.email}? They will lose access immediately. Test bookings stay in the local database.</p><button disabled={busy} onClick={()=>void change({action:'remove',id:removing.id})}>Confirm removal</button><button disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button></div>}
      <a href="/customer-login">Open customer sign-in</a>
    </section></main>;
}
