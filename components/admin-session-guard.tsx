'use client';
import { useEffect, useState } from 'react';

export default function AdminSessionGuard({ children, expiresAt }: { children: React.ReactNode; expiresAt: number }) {
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      try {
        const response = await fetch('/api/admin/auth/session', { cache: 'no-store', signal: controller.signal });
        if (response.status === 401) window.location.replace('/admin-login');
        else setUnavailable(!response.ok);
      } catch { if (!controller.signal.aborted) setUnavailable(true); }
    }
    const expiry = setTimeout(() => window.location.replace('/admin-login'), Math.max(0, expiresAt - Date.now()));
    const interval = setInterval(check, 60000);
    window.addEventListener('focus', check);
    const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pageshow', restored);
    return () => { controller.abort(); clearTimeout(expiry); clearInterval(interval); window.removeEventListener('focus', check); window.removeEventListener('pageshow', restored); };
  }, [expiresAt]);
  if (unavailable) return <main style={{maxWidth:480,margin:'80px auto',padding:24}}><h1>Connection interrupted</h1><p>Reconnect to verify your admin session.</p><button onClick={() => window.location.reload()}>Try again</button></main>;
  return children;
}
