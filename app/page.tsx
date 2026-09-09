'use client';
import { useMemo, useState } from 'react';
import { ChevronDown, Clock3, Flame, MapPin, Minus, Package, Plus, Search, ShoppingBag, Sparkles } from 'lucide-react';
import AppDock from './components/AppDock';

type Item = { id:string; name:string; description:string; price:number; category:'Rentals'|'Flavours'|'Extras'; badge?:string };
const items:Item[]=[
  {id:'pipe',name:'Classic hookah pipe',description:'A complete 24-hour rental, cleaned and ready to use.',price:550,category:'Rentals',badge:'Most popular'},
  {id:'lady',name:'Lady Killer',description:'A bright, sweet fruit blend with a cool finish.',price:50,category:'Flavours'},
  {id:'gum',name:'Gum and Mint',description:'Fresh mint balanced with a smooth bubblegum note.',price:50,category:'Flavours'},
  {id:'cream',name:'Cream Mint',description:'Soft, creamy and refreshingly cool.',price:50,category:'Flavours'},
  {id:'apple',name:'Double Apple',description:'A classic bold apple flavour with a spiced finish.',price:50,category:'Flavours'},
  {id:'coal',name:'Coal box',description:'36 pieces of coal—one box per hookah recommended.',price:50,category:'Extras'},
  {id:'stove',name:'Coal stove',description:'Fast, convenient coal heating for your event.',price:150,category:'Extras'},
];
const money=(n:number)=>`R${n.toLocaleString('en-ZA')}`;

export default function Store(){
  const [cart,setCart]=useState<Record<string,number>>({pipe:2,lady:2,gum:1,cream:1,coal:2,stove:1});
  const [category,setCategory]=useState<'All'|'Rentals'|'Flavours'|'Extras'>('All');
  const [search,setSearch]=useState('');
  const [delivery,setDelivery]=useState(true);
  const visible=items.filter(item=>(category==='All'||item.category===category)&&item.name.toLowerCase().includes(search.toLowerCase()));
  const count=Object.values(cart).reduce((a,b)=>a+b,0);
  const total=useMemo(()=>items.reduce((sum,item)=>sum+(cart[item.id]||0)*item.price,0),[cart]);
  const adjust=(id:string,change:number)=>setCart(current=>({...current,[id]:Math.max(0,Math.min(10,(current[id]||0)+change))}));
  function checkout(){
    const quantities={pipe:cart.pipe||0,coal:cart.coal||0,stove:cart.stove||0};
    const flavourMap:Record<string,string>={lady:'Lady Killer',gum:'Gum and Mint',cream:'Cream Mint',apple:'Double Apple'};
    const selectedFlavours=Object.entries(flavourMap).flatMap(([id,name])=>Array.from({length:cart[id]||0},()=>name));
    localStorage.setItem('chill-pipe-order',JSON.stringify({quantities,selectedFlavours,delivery,customer:{name:'',phone:'',date:'',location:'',notes:''},total}));
    window.location.href='/checkout';
  }
  return <main className="store-app">
    <header className="app-header"><a href="/" className="app-logo"><img src="/chill-pipe-logo.png" alt="The Chill Pipe"/></a><button className="location-pill" type="button"><MapPin size={16}/><span><small>Deliver to</small>Choose your area</span><ChevronDown size={15}/></button><nav><a href="/how-it-works">How it works</a><a href="/terms">Terms</a></nav></header>
    <section className="store-hero"><div><p><Sparkles size={14}/> Bring the chill, we bring the pipe</p><h1>Hookah night?<br/>Consider it handled.</h1><span>Build your setup, pick your flavours and check out in minutes.</span></div><div className="hero-badge"><Clock3 size={22}/><strong>24 hours</strong><span>One simple rental period</span></div></section>
    <section className="store-toolbar"><label><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search pipes, flavours and extras"/></label><div className="category-row">{(['All','Rentals','Flavours','Extras'] as const).map(value=><button type="button" key={value} className={category===value?'active':''} onClick={()=>setCategory(value)}>{value}</button>)}</div></section>
    <div className="store-layout"><section className="catalog"><div className="catalog-heading"><div><p className="eyebrow">Order your way</p><h2>{category==='All'?'Everything you need':category}</h2></div><span>{visible.length} items</span></div><div className="product-grid">{visible.map((item,index)=>{const qty=cart[item.id]||0;return <article className={`app-product card-${item.category.toLowerCase()} item-${item.id}`} key={item.id}><div className={`product-visual ${item.category.toLowerCase()}`}><i>{String(index+1).padStart(2,'0')}</i>{item.category==='Rentals'?<img src="/chill-pipe-logo.png" alt=""/>:item.category==='Flavours'?<Flame size={30}/>:<Package size={30}/>} {item.badge&&<span>{item.badge}</span>}</div><div className="product-copy"><small>{item.category}</small><div><h3>{item.name}</h3><strong>{money(item.price)}</strong></div><p>{item.description}</p></div><div className="product-action">{qty===0?<button type="button" aria-label={`Add ${item.name}`} onClick={()=>adjust(item.id,1)}>Add <Plus size={15}/></button>:<div className="mini-stepper"><button type="button" aria-label={`Remove one ${item.name}`} onClick={()=>adjust(item.id,-1)}><Minus size={14}/></button><span>{qty}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={()=>adjust(item.id,1)}><Plus size={14}/></button></div>}</div></article>})}</div></section>
      <aside className="basket"><div className="basket-card"><div className="basket-title"><ShoppingBag size={20}/><div><p>Your order</p><span>{count} items</span></div></div><div className="fulfil-toggle"><button type="button" className={delivery?'active':''} onClick={()=>setDelivery(true)}>Delivery</button><button type="button" className={!delivery?'active':''} onClick={()=>setDelivery(false)}>Collection</button></div>{items.filter(item=>cart[item.id]>0).map(item=><div className="basket-line" key={item.id}><span>{item.name}<small>× {cart[item.id]}</small></span><strong>{money(item.price*cart[item.id])}</strong></div>)}<div className="basket-total"><span>Subtotal</span><strong>{money(total)}</strong></div><p className="basket-note">{delivery?'Delivery and collection are quoted separately based on location.':'Collection details will be confirmed after checkout.'}</p><button className="checkout-button" onClick={checkout} disabled={!count}><span>View cart · {count}</span><strong>{money(total)}</strong></button></div></aside>
    </div>
    <button className="mobile-cart" onClick={checkout} disabled={!count}><span><ShoppingBag size={17}/> View cart · {count}</span><strong>{money(total)}</strong></button><AppDock active="home"/>
  </main>
}
