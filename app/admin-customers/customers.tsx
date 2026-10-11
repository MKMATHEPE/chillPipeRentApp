'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowLeft,ChevronRight,Plus,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import './style.css';
type Customer={id:string;email:string;fullName:string;phone:string;status:string;mustChange:number;revision:number};
export default function Customers(){
  const [rows,setRows]=useState<Customer[]>([]),[page,setPage]=useState(1),[more,setMore]=useState(false);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[verified,setVerified]=useState(false);
  const [removing,setRemoving]=useState<Customer|null>(null);const lock=useRef(false);
  const [adding,setAdding]=useState(false),[selected,setSelected]=useState<Customer|null>(null),[showPassword,setShowPassword]=useState(false);
  const status=(c:Customer)=>c.status==='active'?(c.mustChange?'Set password':'Active'):c.status==='changing'?'Updating password':'Disabled';
  function close(){if(lock.current)return;setAdding(false);setSelected(null);setRemoving(null);setPassword('');setShowPassword(false);setError('');}
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
      setRemoving(null);setAdding(false);setSelected(null);setShowPassword(false);await load(page);
    }catch(e){setError(e instanceof Error?e.message:'Unable to save.');}finally{setPassword('');lock.current=false;setBusy(false);}
  }
  function create(e:FormEvent){e.preventDefault();void change({action:'create',fullName:name,email,phone,temporaryPassword:password,identityConfirmed:verified});}
  return <main className="cp-customers"><header className="cp-customers-header"><img src="/chill-pipe-logo.webp" alt="The Chill Pipe"/><span>ADMIN</span></header><section className="cp-customers-body">
    <div className="cp-customers-heading"><a href="/admin-preview" aria-label="Back to admin"><ArrowLeft size={22}/></a><h1>Customers</h1></div>
    <div className="cp-customers-toolbar"><span>{loading?'Loading…':`${rows.length} customer${rows.length===1?'':'s'}${more||page>1?' on this page':''}`}</span><button className="cp-customers-primary" onClick={()=>{setError('');setMessage('');setAdding(true);}}><Plus size={17}/>Add customer</button></div>
    {error&&!adding&&!selected&&<p role="alert" className="cp-customers-notice">{error} <button onClick={()=>{setError('');void load(page);}}>Reload list</button></p>}{message&&<p role="status" className="cp-customers-notice">{message}</p>}
    {loading?<p role="status" className="cp-customers-empty">Loading customers…</p>:!rows.length?<div className="cp-customers-empty"><h2>No customers yet</h2><p>Add a customer to set up their sign-in.</p></div>:<ul className="cp-customers-list">{rows.map(c=><li key={c.id}><button onClick={()=>{setError('');setSelected(c);}} aria-label={`Manage ${c.fullName}, ${c.email}`}><span className="cp-customers-person"><strong>{c.fullName}</strong><span>{c.email}</span></span><span className="cp-customers-status">{status(c)}</span><ChevronRight size={18} aria-hidden="true"/></button></li>)}</ul>}
    {(page>1||more)&&<nav className="cp-customers-pagination" aria-label="Customer pages"><button disabled={busy||loading||page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button disabled={busy||loading||!more} onClick={()=>setPage(p=>p+1)}>Next</button></nav>}
    <a className="cp-customers-login" href="/customer-login">Open customer sign-in</a>
  </section>
  <Dialog open={adding||!!selected} onOpenChange={open=>{if(!open)close();}}><DialogContent className="cp-customers-sheet" showCloseButton={false}>
    <div className="cp-customers-handle" aria-hidden="true"/><button className="cp-customers-close" aria-label="Close" disabled={busy} onClick={close}><X size={22}/></button>
    <DialogTitle>{adding?'Add customer':selected?.fullName}</DialogTitle><DialogDescription className="sr-only">{adding?'Create customer sign-in access.':'Manage this customer’s sign-in access.'}</DialogDescription>
    {adding?<form onSubmit={create}><fieldset disabled={busy}>
      <label>Full name<input placeholder="Customer name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Email address<input placeholder="name@example.com" type="email" autoComplete="off" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Contact number<input placeholder="e.g. 076 000 0000" type="tel" required maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <div><label htmlFor="customer-temp-password">Temporary password</label><div className="cp-customers-password"><input id="customer-temp-password" aria-describedby="customer-password-help" type={showPassword?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?'Hide':'Show'}</button></div></div>
      <small id="customer-password-help">12–128 characters · Change required on first sign-in. Share privately; no email is sent.</small>
      <label className="cp-customers-verify"><input type="checkbox" required checked={verified} onChange={e=>setVerified(e.target.checked)}/>I have verified this customer and their email address directly.</label>
      {error&&<p role="alert" className="cp-customers-error">{error}</p>}
      <button className="cp-customers-primary" type="submit">{busy?'Creating…':'Create customer'}</button>
    </fieldset></form>:selected&&<div className="cp-customers-details"><p>{selected.email}</p><p>{selected.phone}</p><span className="cp-customers-status">{status(selected)}</span>
      {error&&<p role="alert" className="cp-customers-error">{error}</p>}
      {removing?<div role="alert"><p>Remove access? Their profile and booking history will be retained, but they will no longer be able to sign in.</p><button className="cp-customers-primary" disabled={busy} onClick={()=>void change({action:'remove',id:selected.id,revision:selected.revision})}>{busy?'Removing…':'Confirm removal'}</button><button disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button></div>:<div><button className="cp-customers-primary" disabled={busy||selected.status==='changing'} onClick={()=>void change({action:selected.status==='active'?'disable':'enable',id:selected.id,revision:selected.revision})}>{busy?'Saving…':selected.status==='active'?'Disable access':'Enable access'}</button><button disabled={busy} onClick={()=>setRemoving(selected)}>Remove access</button></div>}
    </div>}
  </DialogContent></Dialog></main>;
}
