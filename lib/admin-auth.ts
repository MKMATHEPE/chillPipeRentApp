import { env } from 'cloudflare:workers';
import { createClient } from '@supabase/supabase-js';
import { getDb } from '../db';

export const ADMIN_COOKIE = 'cp_admin_session';
export const AUTH_HEADERS = { 'Cache-Control': 'no-store, private', 'Pragma': 'no-cache' };
type Config = { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string; ADMIN_USER_ID?: string };
export function authConfig() {
  const values = env as unknown as Config;
  if (!values.SUPABASE_URL || !values.SUPABASE_PUBLISHABLE_KEY || !values.ADMIN_USER_ID) throw new Error('Admin auth is not configured');
  return values as Required<Config>;
}
export function authClient() {
  const config = authConfig();
  return createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000), cache: 'no-store' }) },
  });
}
export async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function readSessionCookie(header: string | null) {
  const value = header?.split(';').map(part => part.trim()).find(part => part.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin && request.headers.get('sec-fetch-site') !== 'cross-site';
}
export function sessionCookie(request: Request, value: string, age: number) {
  const url = new URL(request.url);
  const local = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${local ? '' : '; Secure'}`;
}
export async function verifyAdmin(cookieHeader: string | null) {
  const token = readSessionCookie(cookieHeader);
  if (!token) return null;
  const hash = await digest(token);
  const row = await getDb().prepare('SELECT user_id,access_token,expires_at FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(hash, Date.now()).first<{user_id:string;access_token:string;expires_at:number}>();
  if (!row || row.user_id !== authConfig().ADMIN_USER_ID) return null;
  const { data, error } = await authClient().auth.getUser(row.access_token);
  if (error) {
    if (error.status === 401 || error.status === 403) { await getDb().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(hash).run(); return null; }
    throw new Error('Identity service unavailable');
  }
  if (data.user?.id !== authConfig().ADMIN_USER_ID || !data.user.email_confirmed_at) return null;
  return { id: data.user.id, expiresAt: row.expires_at };
}
export async function revokeSession(cookieHeader: string | null) {
  const token = readSessionCookie(cookieHeader);
  if (token) await getDb().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).run();
}
export async function allowLogin(request: Request, scope = 'login', limit = 10, windowMs = 600000) {
  const now = Date.now();
  // CF-Connecting-IP is supplied by the trusted hosting proxy, never by form data.
  const bucket = await digest(`${scope}:${request.headers.get('cf-connecting-ip') || 'shared'}:${Math.floor(now / windowMs)}`);
  await getDb().batch([
    getDb().prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now),
    getDb().prepare('DELETE FROM admin_login_limits WHERE expires_at<=?').bind(now),
  ]);
  const row = await getDb().prepare('INSERT INTO admin_login_limits(bucket,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(bucket, now + windowMs).first<{attempts:number}>();
  return !!row && row.attempts <= limit;
}
