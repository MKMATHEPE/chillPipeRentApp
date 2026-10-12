'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { quickReviews } from '../lib/booking-reviews';
import './booking-review.css';
export function BookingReviewPrompt() {
  const pathname = usePathname();
  const [reference, setReference] = useState('');
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const dismissed = useRef(new Set<string>());
  const submitting = useRef(false);
  const paused = useRef(false);
  useEffect(() => {
    // Never interrupt a booking form, sign-in, payment or admin work.
    if (!['/', '/track', '/my-bookings'].includes(pathname)) return;
    let active = true;
    const controller = new AbortController();
    async function check() {
      if (paused.current || document.visibilityState !== 'visible' || reference || (pathname === '/' && new URLSearchParams(location.search).get('step'))) return;
      try { if (sessionStorage.getItem('cp-review-paused')) return; } catch { /* Storage may be unavailable. */ }
      try {
        const res = await fetch('/api/customer/reviews', { cache: 'no-store', signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json() as { bookings?: { reference: string }[] };
        const next = data.bookings?.find((b: { reference: string }) => {
          if (dismissed.current.has(b.reference)) return false;
          try { return !sessionStorage.getItem(`cp-review-dismissed:${b.reference}`); } catch { return true; }
        });
        if (active && next) { setReference(next.reference); setRating(0); setTags([]); setComment(''); setExpanded(false); setError(''); setSent(false); }
      } catch { /* A review prompt must not block the rental flow. */ }
    }
    void check();
    const timer = setInterval(() => void check(), 60000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [pathname, reference]);
  function dismiss() {
    if (submitting.current) return;
    dismissed.current.add(reference);
    paused.current = true;
    try { sessionStorage.setItem(`cp-review-dismissed:${reference}`, '1'); sessionStorage.setItem('cp-review-paused', '1'); } catch { /* In-memory fallback. */ }
    setReference('');
  }
  async function submit() {
    if (!rating || submitting.current) return;
    submitting.current = true; setSaving(true); setError('');
    try {
      const res = await fetch('/api/customer/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference, rating, tags, comment }) });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error || 'Could not save your review. Please retry.');
      setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your review. Please retry.'); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <Dialog open={!!reference && ['/', '/track', '/my-bookings'].includes(pathname)} onOpenChange={open => { if (!open) dismiss(); }}>
    <DialogContent className="cp-review" showCloseButton={false}>
      <div className="cp-review-handle" aria-hidden="true" />
      <DialogTitle>{sent ? 'Thank you for your review' : 'How was your experience?'}</DialogTitle>
      <DialogDescription>{sent ? 'Your feedback has been saved.' : `Booking ${reference} · Your feedback helps us improve.`}</DialogDescription>
      {sent ? <button className="cp-review-submit" onClick={dismiss}>Done</button> : <form onSubmit={e => { e.preventDefault(); void submit(); }}>
        <fieldset disabled={saving}><legend className="cp-review-label">Your rating</legend>
          <div className="cp-review-stars" role="group" aria-label="Choose a star rating">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} aria-pressed={rating === value} onClick={() => { if (rating !== value) { setRating(value); setTags([]); setExpanded(false); } }}><Star aria-hidden="true" fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div>
          <p className="cp-review-rating" aria-live="polite">{['Select a rating', 'Disappointing', 'Could be better', 'Okay', 'Good', 'Excellent'][rating]}</p>
          {!!rating && <><h3>Quick review</h3><p className="cp-review-hint">Choose any that apply</p><div className="cp-review-tags">{quickReviews[rating].slice(0, expanded ? undefined : 4).map(tag => <button type="button" key={tag} aria-pressed={tags.includes(tag)} onClick={() => setTags(current => current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])}>{tags.includes(tag) ? '✓ ' : ''}{tag}</button>)}</div><button type="button" className="cp-review-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Fewer options' : 'More options'}</button></>}
          <label className="cp-review-comment">Anything to add? <small>(optional)</small><textarea maxLength={1000} rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Tell us a little more…" /></label>
          {error && <p role="alert" className="cp-review-error">{error}</p>}
          <button className="cp-review-submit" disabled={!rating || saving}>{saving ? 'Saving…' : 'Submit review'}</button>
          <button type="button" className="cp-review-later" onClick={dismiss}>Not now</button>
        </fieldset>
      </form>}
    </DialogContent>
  </Dialog>;
}
