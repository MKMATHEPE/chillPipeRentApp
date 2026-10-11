import { getDb } from '../db';
import { authClient, AUTH_HEADERS, digest } from './admin-auth';
import type { Session, User } from '@supabase/supabase-js';
import {testCustomersEnabled,verifyTestCustomer} from './test-customers';
import {customerAccess} from './customer-management';

export { AUTH_HEADERS };
export const CUSTOMER_COOKIE = 'cp_customer_session';
export function customerToken(header: string | null) {
  const value = header?.split(';').map(p=>p.trim()).find(p=>p.startsWith(CUSTOMER_COOKIE+'='))?.slice(CUSTOMER_COOKIE.length+1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export function customerCookie(request: Request, token: string, age: number) {
  const url=new URL(request.url);
  const local=url.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  return `${CUSTOMER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${local?'':'; Secure'}`;
}
export async function revokeCustomer(header:string|null) {
  const token=customerToken(header);
  if(token)await getDb().prepare('DELETE FROM customer_sessions WHERE token_hash=?').bind(await digest(token)).run();
}
export async function verifyCustomer(header:string|null) {
  const token=customerToken(header); if(!token)return null;
  const hash=await digest(token);
  const row=await getDb().prepare('SELECT user_id,access_token,managed_revision FROM customer_sessions WHERE token_hash=? AND expires_at>?').bind(hash,Date.now()).first<{user_id:string;access_token:string;managed_revision:number}>();
  if(!row)return null;
  if(testCustomersEnabled){const user=row.access_token.startsWith('test:')?await verifyTestCustomer(row.access_token):null;return user?.id===row.user_id?user:null;}
  if(row.access_token.startsWith('test:'))return null;
  const {data,error}=await authClient().auth.getUser(row.access_token);
  if(error){
    if(error.status===401 || error.status===403){await revokeCustomer(header);return null;}
    throw new Error('Identity service unavailable');
  }
  if(!data.user?.email_confirmed_at || data.user.id!==row.user_id)return null;
  if(!(await customerAccess(data.user,row.managed_revision)).allowed)return null;
  return {id:row.user_id,email:data.user.email || ''};
}
export async function startCustomer(request:Request,user:User,session:Session,expectedRevision?:number) {
  if(!user.email_confirmed_at)throw new Error('Email confirmation required');
  const access=testCustomersEnabled?{allowed:true,revision:0}:await customerAccess(user,expectedRevision,true);
  if(!access.allowed)throw new Error('Customer access unavailable');
  const expires=Math.min((session.expires_at || 0)*1000,Date.now()+3600000);
  if(expires<=Date.now())throw new Error('Session expired');
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  // Metadata supplies display defaults only; ownership always comes from the verified user ID.
  const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
  await getDb().prepare('INSERT INTO customer_profiles(user_id,full_name,phone,location,alternative_phone,updated_at) VALUES (?,?,?,\'\',\'\',?) ON CONFLICT(user_id) DO NOTHING').bind(user.id,text(user.user_metadata?.fullName,100),text(user.user_metadata?.phone,40),Date.now()).run();
  await revokeCustomer(request.headers.get('cookie'));
  await getDb().prepare('DELETE FROM customer_sessions WHERE expires_at<=?').bind(Date.now()).run();
  await getDb().prepare('INSERT INTO customer_sessions(token_hash,user_id,access_token,expires_at,managed_revision) VALUES (?,?,?,?,?)').bind(await digest(token),user.id,session.access_token,expires,access.revision).run();
  return customerCookie(request,token,Math.floor((expires-Date.now())/1000));
}
export async function customerProfile(id:string,email:string) {
  const row=await getDb().prepare('SELECT full_name AS fullName,phone,location,alternative_phone AS alternativePhone FROM customer_profiles WHERE user_id=?').bind(id).first();
  return {...row,id,email};
}
