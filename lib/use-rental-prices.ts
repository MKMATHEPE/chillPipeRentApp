'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RentalPrices } from './booking-pricing';

export function useRentalPrices() {
  const [prices,setPrices] = useState<RentalPrices | null>(null);
  const [error,setError] = useState('');
  const pending = useRef<Promise<RentalPrices | null> | null>(null);
  const alive = useRef(true);
  const refresh = useCallback(() => {
    if (pending.current) return pending.current;
    pending.current = (async () => {
      try {
        const response = await fetch('/api/catalog',{cache:'no-store'});
        const body = await response.json() as {prices?:RentalPrices};
        if (!response.ok || !body.prices || !['pipe','premium','stove','coalPack'].every(key => {
          const value=body.prices![key as keyof RentalPrices];
          return typeof value==='number' && Number.isFinite(value) && value>0;
        })) throw new Error('Prices are temporarily unavailable. Please retry.');
        const next=body.prices;
        if (alive.current) { setPrices(old => JSON.stringify(old)===JSON.stringify(next) ? old : next); setError(''); }
        return next;
      } catch {
        if (alive.current) setError('Prices are temporarily unavailable. Please retry.');
        return null;
      } finally { pending.current=null; }
    })();
    return pending.current;
  },[]);
  useEffect(() => {
    alive.current=true;
    void refresh();
    const update=() => { if (document.visibilityState==='visible') void refresh(); };
    const storage=(event:StorageEvent) => { if(event.key==='chill-pipe-prices-updated') update(); };
    const timer=setInterval(update,30000);
    window.addEventListener('focus',update);
    window.addEventListener('storage',storage);
    document.addEventListener('visibilitychange',update);
    return () => { alive.current=false;clearInterval(timer);window.removeEventListener('focus',update);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',update); };
  },[refresh]);
  return {prices,error,refresh};
}
