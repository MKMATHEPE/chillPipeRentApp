'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import '../admin-test-customers/style.css';
type Customer={id:string;email:string;fullName:string;phone:string;status:string;mustChange:number;revision:number};
export default function Customers(){
  const [rows,setRows]=useState<Customer[]>([]),[page,setPage]=useState(1),[more,setMore]=useState(false);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[verified,setVerified]=useState(false);
  const [removing,setRemoving]=useState<Customer|null>(null);const lock=useRef(false);
  async function load(number:number,signal?:AbortSignal){
    setLoading(true);
    try{const r=await fetch('/api/admin/customers?page='+number,{cache:'no-store',signal});if(r.status===401){location.replace('/admin-login');return;}const d=await r.json() as {customers?:Customer[];hasMore?:boolean;error?:string};if(!r.ok)throw new Error(d.error||'Unable to load customers.');setRows(d.customers||[]);setMore(d.hasMore===true);}
    catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Unable to load customers.');}finally{if(!signal?.aborted)setLoading(false);}
  }
  useEffect(()=>{const controller=new AbortController();void load(page,controller.signal);return()=>controller.abort();},[page]);
  async function change(body:Record<string,unknown>){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try{const r=await fetch('/api/admin/customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.status===401){location.replace('/admin-login');return;}const d=await r.json() as {error?:string};if(!r.ok)throw new Error(d.error||'Unable to save.');
      if(body.action==='create'){setName('');setEmail('');setPhone('');setVerified(false);setMessage('Customer created. Share the temporary password privately. They must replace it on first sign-in.');}
      else setMessage(body.action==='remove'?'Customer access removed. Booking history is retained.':'Customer access updated. They must sign in again.');
      setRemoving(null);await load(page);
    }catch(e){setError(e instanceof Error?e.message:'Unable to save.');}finally{setPassword('');lock.current=false;setBusy(false);}
  }
  function create(e:FormEvent){e.preventDefault();void change({action:'create',fullName:name,email,phone,temporaryPassword:password,identityConfirmed:verified});}
  return <main className="test-customers"><header><img src="/chill-pipe-logo.webp" alt="The Chill Pipe"/><a href="/admin-preview">Back to admin</a></header><section>
    <h1>Customers</h1><p>Create customer access and manage sign-in permissions. Only you can manage these accounts.</p>
    <form onSubmit={create}><h2>Add a customer</h2><fieldset disabled={busy}>
      <label>Full name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Email address<input type="email" autoComplete="off" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Contact number<input type="tel" required maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <label>Temporary password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <small>12–128 characters. Share privately; no invitation email is sent. Passwords are never displayed in this list.</small>
      <label style={{display:'flex',alignItems:'flex-start',gap:8}}><input style={{width:20,height:20,flexShrink:0}} type="checkbox" required checked={verified} onChange={e=>setVerified(e.target.checked)}/>I have verified this customer and their email address directly.</label>
      <button type="submit">{busy?'Saving…':'Create customer'}</button>
    </fieldset></form>
    {error&&<p role="alert">{error} <button disabled={busy} onClick={()=>{setError('');void load(page);}}>Reload list</button></p>}{message&&<p role="status">{message}</p>}
    <h2>Customer accounts</h2>{loading?<p role="status">Loading…</p>:!rows.length?<p>No customers on this page.</p>:<ul>{rows.map(c=><li key={c.id}><div><strong>{c.fullName}</strong><span>{c.email}</span><small>{c.status==='active'?(c.mustChange?'Password change required':'Active'):c.status==='changing'?'Password update in progress':'Disabled'}</small></div><div className="test-actions"><button disabled={busy||c.status==='changing'} onClick={()=>void change({action:c.status==='active'?'disable':'enable',id:c.id,revision:c.revision})}>{c.status==='active'?'Disable':'Enable'}</button><button disabled={busy} onClick={()=>setRemoving(c)}>Remove access</button></div></li>)}</ul>}
    {removing&&<div className="test-confirm" role="alert"><p>Remove access for {removing.email}? Their bookings and profile will be retained. They will no longer be able to sign in to this app.</p><button disabled={busy} onClick={()=>void change({action:'remove',id:removing.id,revision:removing.revision})}>Confirm removal</button><button disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button></div>}
    <nav aria-label="Customer pages"><button disabled={busy||loading||page===1} onClick={()=>setPage(p=>p-1)}>Previous</button> <span>Page {page}</span> <button disabled={busy||loading||!more} onClick={()=>setPage(p=>p+1)}>Next</button></nav>
    <p><a href="/customer-login">Open customer sign-in</a></p>
  </section></main>;
}
