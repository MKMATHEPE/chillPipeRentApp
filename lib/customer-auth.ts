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
type CustomerSession={user_id:string;access_token:string;managed_revision:number;refresh_token:string|null;access_expires_at:number};
async function currentSession(hash:string) {
  return getDb().prepare('SELECT user_id,access_token,managed_revision,refresh_token,access_expires_at FROM customer_sessions WHERE token_hash=? AND expires_at>?').bind(hash,Date.now()).first<CustomerSession>();
}
async function renewableSession(hash:string) {
  // A database lease serializes rotation across workers and simultaneous browser requests.
  for(let attempt=0;attempt<48;attempt++) {
    const row=await currentSession(hash);
    if(!row || !row.refresh_token || row.access_expires_at>Date.now()+60000)return row;
    const owner=crypto.randomUUID();
    const locked=await getDb().prepare('UPDATE customer_sessions SET refresh_owner=?,refresh_until=? WHERE token_hash=? AND refresh_token=? AND refresh_until<=? AND expires_at>?').bind(owner,Date.now()+60000,hash,row.refresh_token,Date.now(),Date.now()).run();
    if(!locked.meta.changes){await new Promise(resolve=>setTimeout(resolve,250));continue;}
    try {
      const {data,error}=await authClient().auth.refreshSession({refresh_token:row.refresh_token});
      if(error) {
        if(['refresh_token_not_found','refresh_token_already_used','session_not_found','user_banned','user_not_found'].includes(error.code || '')) {
          await getDb().prepare('DELETE FROM customer_sessions WHERE token_hash=? AND refresh_owner=?').bind(hash,owner).run();
          return null;
        }
        throw new Error('Identity service unavailable');
      }
      const session=data.session,user=data.user;
      if(!session || !user?.email_confirmed_at || user.id!==row.user_id || !(await customerAccess(user,row.managed_revision)).allowed) {
        await getDb().prepare('DELETE FROM customer_sessions WHERE token_hash=? AND refresh_owner=?').bind(hash,owner).run();
        return null;
      }
      if(!session.refresh_token || !session.expires_at || session.expires_at*1000<=Date.now())throw new Error('Identity service unavailable');
      // UPDATE only: logout, password changes and account revocation must never be undone.
      const saved=await getDb().prepare('UPDATE customer_sessions SET access_token=?,refresh_token=?,access_expires_at=?,refresh_owner=NULL,refresh_until=0 WHERE token_hash=? AND refresh_owner=? AND expires_at>?').bind(session.access_token,session.refresh_token,session.expires_at*1000,hash,owner,Date.now()).run();
      if(!saved.meta.changes)return null;
      return currentSession(hash);
    } finally {
      await getDb().prepare('UPDATE customer_sessions SET refresh_owner=NULL,refresh_until=0 WHERE token_hash=? AND refresh_owner=?').bind(hash,owner).run();
    }
  }
  throw new Error('Session renewal busy. Please retry.');
}
export async function verifyCustomer(header:string|null) {
  const token=customerToken(header); if(!token)return null;
  const hash=await digest(token);
  const row=await renewableSession(hash);
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
  if(!await currentSession(hash))return null;
  return {id:row.user_id,email:data.user.email || ''};
}
export async function startCustomer(request:Request,user:User,session:Session,expectedRevision?:number) {
  if(!user.email_confirmed_at)throw new Error('Email confirmation required');
  const access=testCustomersEnabled?{allowed:true,revision:0}:await customerAccess(user,expectedRevision,true);
  if(!access.allowed)throw new Error('Customer access unavailable');
  const accessExpires=(session.expires_at || 0)*1000;
  if(accessExpires<=Date.now())throw new Error('Session expired');
  const refreshToken=!testCustomersEnabled ? session.refresh_token || null : null;
  const expires=refreshToken?Date.now()+24*3600000:Math.min(accessExpires,Date.now()+3600000);
  if(expires<=Date.now())throw new Error('Session expired');
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  // Metadata supplies display defaults only; ownership always comes from the verified user ID.
  const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
  await getDb().prepare('INSERT INTO customer_profiles(user_id,full_name,phone,location,alternative_phone,updated_at) VALUES (?,?,?,\'\',\'\',?) ON CONFLICT(user_id) DO NOTHING').bind(user.id,text(user.user_metadata?.fullName,100),text(user.user_metadata?.phone,40),Date.now()).run();
  await revokeCustomer(request.headers.get('cookie'));
  await getDb().prepare('DELETE FROM customer_sessions WHERE expires_at<=?').bind(Date.now()).run();
  await getDb().prepare('INSERT INTO customer_sessions(token_hash,user_id,access_token,expires_at,managed_revision,refresh_token,access_expires_at) VALUES (?,?,?,?,?,?,?)').bind(await digest(token),user.id,session.access_token,expires,access.revision,refreshToken,accessExpires).run();
  return customerCookie(request,token,Math.floor((expires-Date.now())/1000));
}
export async function customerProfile(id:string,email:string) {
  const row=await getDb().prepare('SELECT full_name AS fullName,phone,location,alternative_phone AS alternativePhone FROM customer_profiles WHERE user_id=?').bind(id).first();
  return {...row,id,email};
}
