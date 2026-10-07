import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdmin } from '../lib/admin-auth';
import AdminSessionGuard from './admin-session-guard';

export default async function AdminAccess({ children }: { children: React.ReactNode }) {
  let session;
  try { session = await verifyAdmin((await headers()).get('cookie')); }
  catch { return <main style={{maxWidth:480,margin:'80px auto',padding:24}}><h1>Admin temporarily unavailable</h1><p>We couldn’t verify your session. Please try again.</p><a href="/admin-preview">Try again</a></main>; }
  if (!session) redirect('/admin-login');
  return <AdminSessionGuard expiresAt={session.expiresAt}>{children}</AdminSessionGuard>;
}
