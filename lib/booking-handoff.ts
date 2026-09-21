// Short-lived, single-use display handoff; never used to authorize payment or updates.
const KEY = 'chill-pipe-checkout-handoff';
export function saveBookingHandoff(booking: unknown) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ booking, savedAt: Date.now() })); } catch {}
}
export function takeBookingHandoff(reference: string, phone: string) {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const { booking, savedAt } = JSON.parse(raw);
    const age = Date.now() - savedAt;
    if (!Number.isFinite(age) || age < 0 || age > 30000 ||
      booking?.reference !== reference || booking?.customer?.phone !== phone ||
      booking?.status !== 'awaiting_review' || !booking?.quantities ||
      typeof booking.total !== 'number') return null;
    return booking;
  } catch { return null; }
}
