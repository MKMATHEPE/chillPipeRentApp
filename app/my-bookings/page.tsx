'use client';
import { useEffect,useRef,useState } from 'react';
import { AppHeader } from '@/components/app-header';
import './style.css';
type Booking={id:number;reference:string;phone:string;status:string;rentalDate:string;total:number};
const statuses:Record<string,string>={awaiting_review:'Awaiting approval',approved:'Approved',payment_review:'Payment review',paid:'Paid',handed_over:'Handed over',returned:'Returned',complete:'Completed',declined:'Declined',cancelled:'Cancelled',expired:'Expired'};
export default function MyBookings(){
  const [rows,setRows]=useState<Booking[]>([]),[next,setNext]=useState<number|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');const lock=useRef(false);
  async function load(cursor?:number){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const r=await fetch('/api/customer/bookings'+(cursor?'?before='+cursor:''),{cache:'no-store'});if(r.status===401){location.replace('/customer-login');return;}const data=await r.json() as {bookings:Booking[];next:number|null;error?:string};if(!r.ok)throw new Error(data.error);setRows(old=>cursor?[...old,...data.bookings]:data.bookings);setNext(data.next);}catch(e){setError(e instanceof Error?e.message:'Could not load bookings.');}finally{setBusy(false);lock.current=false;}}
  useEffect(()=>{void load();},[]);
  return <main className="flow-app customer-bookings"><AppHeader/><section className="flow-sheet"><h1>My bookings</h1><p>Your sessions, all in one place.</p>{error&&<p role="alert">{error} <button onClick={()=>void load()}>Retry</button></p>}
    {!busy&&!error&&!rows.length&&<p>No bookings yet. <a href="/">Build your first session</a>.</p>}
    <div className="customer-booking-list">{rows.map(b=><a key={b.id} href={'/track?reference='+encodeURIComponent(b.reference)+'&phone='+encodeURIComponent(b.phone)}><span><strong>{b.reference}</strong><b>R{b.total.toLocaleString('en-ZA')}</b></span><span><small>{b.rentalDate.replace('T',' · ')}</small><small>{statuses[b.status] || b.status}</small></span></a>)}</div>
    {busy&&<p role="status">Loading bookings…</p>}{next&&!busy&&<button onClick={()=>void load(next)}>Load more</button>}<a className="customer-bookings-back" href="/">Start a new rental</a>
  </section></main>;
}
