'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, RotateCcw, Truck } from 'lucide-react';

type Booking={reference:string;status:string;total:number;deposit:number;deliveryFee:number|null;customer:{name:string;phone?:string;date:string;location:string};quantities:Record<string,number>};
const money=(n:number)=>`R${n.toLocaleString('en-ZA')}`;
const actions:Record<string,{next:string;label:string}>={approved:{next:'paid',label:'Verify payment'},payment_review:{next:'paid',label:'Verify EFT payment'},paid:{next:'handed_over',label:'Mark as handed over'},handed_over:{next:'returned',label:'Mark as returned'},returned:{next:'complete',label:'Approve deposit refund'}};
const labels:Record<string,string>={awaiting_review:'Needs review',approved:'Awaiting payment',payment_review:'Payment submitted',paid:'Paid & confirmed',handed_over:'Rental active',returned:'Inspect return',complete:'Completed'};

export default function Admin(){
  const [booking,setBooking]=useState<Booking|null>(null); const [fee,setFee]=useState('');
  useEffect(()=>{const raw=localStorage.getItem('chill-pipe-booking');if(raw){const value=JSON.parse(raw);setBooking(value);setFee(value.deliveryFee?.toString()||'');}},[]);
  function save(updated:Booking){localStorage.setItem('chill-pipe-booking',JSON.stringify(updated));setBooking(updated);}
  function approve(){if(booking)save({...booking,status:'approved',deliveryFee:Number(fee||0)});}
  function advance(){if(!booking)return;const action=actions[booking.status];if(action)save({...booking,status:action.next});}
  return <main className="admin-app"><aside className="admin-nav"><img src="/chill-pipe-logo.png" alt="The Chill Pipe"/><a className="active"><ClipboardList/>Bookings</a><a><Truck/>Fulfilment</a><a><RotateCcw/>Returns</a></aside><section className="admin-main"><div className="admin-head"><div><p className="eyebrow">Operations</p><h1>Booking requests</h1></div><span>{booking?'1 active booking':'No active bookings'}</span></div>{booking?<article className="admin-booking"><div className="admin-booking-head"><div><p>{booking.reference}</p><h2>{booking.customer.name||'New customer'}</h2><span>{booking.customer.date} · {booking.customer.location}</span></div><b>{labels[booking.status]||booking.status}</b></div><div className="admin-metrics"><div><span>Rental</span><strong>{money(booking.total)}</strong></div><div><span>Deposit</span><strong>{money(booking.deposit)}</strong></div><div><span>Hookahs</span><strong>{booking.quantities.pipe||0}</strong></div><div><span>Final total</span><strong>{money(booking.total+booking.deposit+(booking.deliveryFee||0))}</strong></div></div>{booking.status==='awaiting_review'?<><label className="delivery-fee"><span>Delivery & collection fee</span><div><b>R</b><input type="number" min="0" value={fee} onChange={e=>setFee(e.target.value)} placeholder="Enter amount"/></div></label><button onClick={approve}><CheckCircle2/>Approve final quote</button></>:actions[booking.status]?<button onClick={advance}><CheckCircle2/>{actions[booking.status].label}</button>:<div className="admin-complete"><CheckCircle2/>Rental completed and deposit refund approved.</div>}</article>:<div className="admin-empty"><ClipboardList size={36}/><h2>No rental requests yet</h2><p>New QR-code orders will appear here.</p></div>}</section></main>;
}
