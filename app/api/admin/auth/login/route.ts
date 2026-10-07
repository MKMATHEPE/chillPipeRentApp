import { getDb } from '../../../../../db';
import { allowLogin, authClient, authConfig, AUTH_HEADERS, digest, revokeSession, sameOrigin, sessionCookie } from '../../../../../lib/admin-auth';
export async function POST(request: Request) {
  const reply = (error: string, status: number) => Response.json({ error }, { status, headers: AUTH_HEADERS });
  if (!sameOrigin(request)) return reply('Request not allowed.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('Invalid request.', 400);
  try {
    if (!await allowLogin(request)) return reply('Too many attempts. Please try again in 10 minutes.', 429);
    const reader = request.body?.getReader();
    if (!reader) return reply('Enter your email and password.', 400);
    let raw = '', size = 0; const decoder = new TextDecoder();
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 4096) { await reader.cancel(); return reply('Invalid request.', 400); } raw += decoder.decode(chunk.value, { stream: true }); }
    raw += decoder.decode();
    let body; try { body = JSON.parse(raw); } catch { return reply('Invalid request.', 400); }
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string' || !body.email.trim() || !body.password || body.email.length > 254 || body.password.length > 1024) return reply('Enter your email and password.', 400);
    const { data, error } = await authClient().auth.signInWithPassword({ email: body.email.trim().toLowerCase(), password: body.password });
    if (error) return reply(error.status === 429 ? 'Too many attempts. Please try again later.' : error.status && error.status >= 500 ? 'Sign-in is temporarily unavailable. Please try again.' : 'Unable to sign in. Check your email and password.', error.status === 429 ? 429 : error.status && error.status >= 500 ? 503 : 401);
    if (!data.session || data.user?.id !== authConfig().ADMIN_USER_ID || !data.user.email_confirmed_at) return reply('Unable to sign in. Check your email and password.', 401);
    const expiresAt = Math.min((data.session.expires_at ?? 0) * 1000, Date.now() + 3600000);
    if (expiresAt <= Date.now()) return reply('Please try signing in again.', 401);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2,'0')).join('');
    await revokeSession(request.headers.get('cookie'));
    await getDb().prepare('INSERT INTO admin_sessions(token_hash,user_id,access_token,expires_at) VALUES (?,?,?,?)').bind(await digest(token), data.user.id, data.session.access_token, expiresAt).run();
    return Response.json({ ok: true }, { headers: { ...AUTH_HEADERS, 'Set-Cookie': sessionCookie(request, token, Math.floor((expiresAt - Date.now()) / 1000)) } });
  } catch { console.error('Admin sign-in service unavailable'); return reply('Sign-in is temporarily unavailable. Please try again.', 503); }
}
