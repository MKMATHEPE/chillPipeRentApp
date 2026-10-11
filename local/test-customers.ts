// TEST ONLY: excluded from production builds. Never use for real customers.
import {getDb} from '../db';
import {digest} from '../lib/admin-auth';
import type {TestLogin} from '../lib/test-customers';
export const testCustomersEnabled=true;
type TestUser={id:string;email:string;full_name:string;phone:string;salt:string;password_hash:string;enabled:number;removed:number;must_change:number;version:number};
async function ready(){await getDb().prepare(`CREATE TABLE IF NOT EXISTS local_test_customers (
  id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,full_name TEXT NOT NULL,phone TEXT NOT NULL,
  salt TEXT NOT NULL,password_hash TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,
  removed INTEGER NOT NULL DEFAULT 0,must_change INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1
)`).run();}
const hex=(v:Uint8Array)=>Array.from(v,n=>n.toString(16).padStart(2,'0')).join('');
async function hash(password:string,salt:string){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256)));
}
function equal(a:string,b:string){let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return difference===0;}
function validPassword(v:unknown):v is string{return typeof v==='string'&&v.length>=12&&v.length<=128;}
export async function listTestCustomers(){await ready();return (await getDb().prepare('SELECT id,email,full_name AS fullName,phone,enabled,must_change AS mustChange FROM local_test_customers WHERE removed=0 ORDER BY email LIMIT 100').all()).results;}
export async function manageTestCustomer(body:Record<string,unknown>){
  await ready();
  if(body.action==='create'){
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(!/^[a-z0-9._+-]{1,64}@test\.invalid$/.test(email))throw new Error('Use a fictional address such as alice@test.invalid.');
    if(typeof body.fullName!=='string'||!body.fullName.trim()||body.fullName.length>100||typeof body.phone!=='string'||!/^[+\d ()-]{7,40}$/.test(body.phone)||!validPassword(body.temporaryPassword))throw new Error('Enter a name, contact number and a 12–128-character temporary password.');
    if((await getDb().prepare('SELECT COUNT(*) AS n FROM local_test_customers WHERE removed=0').first<{n:number}>())!.n>=100)throw new Error('This test environment is limited to 100 customers.');
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    const result=await getDb().prepare('INSERT INTO local_test_customers(id,email,full_name,phone,salt,password_hash) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING').bind('test-'+crypto.randomUUID(),email,body.fullName.trim(),body.phone.trim(),salt,await hash(body.temporaryPassword,salt)).run();
    if(!result.meta.changes)throw new Error('That test email has already been used. Choose another.');
    return;
  }
  if(!['enable','disable','remove'].includes(String(body.action))||typeof body.id!=='string')throw new Error('Invalid action.');
  const user=await getDb().prepare('SELECT id FROM local_test_customers WHERE id=? AND removed=0').bind(body.id).first();
  if(!user)throw new Error('Test customer not found.');
  await getDb().batch([
    getDb().prepare('UPDATE local_test_customers SET enabled=?,removed=?,version=version+1,password_hash=CASE WHEN ?=1 THEN \'\' ELSE password_hash END WHERE id=? AND removed=0').bind(body.action==='enable'?1:0,body.action==='remove'?1:0,body.action==='remove'?1:0,body.id),
    getDb().prepare('DELETE FROM customer_sessions WHERE user_id=?').bind(body.id),
  ]);
}
export async function loginTestCustomer(email:string,password:string):Promise<TestLogin|null>{
  await ready();const user=await getDb().prepare('SELECT * FROM local_test_customers WHERE email=?').bind(email).first<TestUser>();
  // Do equivalent password work even for missing/disabled accounts.
  const calculated=await hash(password,user?.salt || '00000000000000000000000000000000');
  if(!user||!user.enabled||user.removed||!equal(calculated,user.password_hash))return null;
  return {user:{id:user.id,email:user.email,email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),aud:'authenticated',app_metadata:{},user_metadata:{fullName:user.full_name,phone:user.phone}},session:{access_token:`test:${user.id}:${user.version}`,expires_at:Math.floor(Date.now()/1000)+3600} as TestLogin['session'],requiresPasswordChange:!!user.must_change};
}
export async function verifyTestCustomer(token:string){
  await ready();const [,id,version]=token.split(':');
  const user=await getDb().prepare('SELECT id,email FROM local_test_customers WHERE id=? AND version=? AND enabled=1 AND removed=0 AND must_change=0').bind(id||'',Number(version)||0).first<{id:string;email:string}>();return user;
}
export async function changeTestPassword(cookie:string|null,body:Record<string,unknown>){
  await ready();
  const token=cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('cp_customer_session='))?.slice('cp_customer_session='.length);
  if(!token||!/^[a-f0-9]{64}$/.test(token))throw new Error('Sign in with your temporary password first.');
  const session=await getDb().prepare('SELECT user_id,access_token FROM customer_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token),Date.now()).first<{user_id:string;access_token:string}>();
  if(!session)throw new Error('Your session expired. Sign in again.');
  const user=await getDb().prepare('SELECT * FROM local_test_customers WHERE id=? AND enabled=1 AND removed=0').bind(session.user_id).first<TestUser>();
  if(!user||session.access_token!==`test:${user.id}:${user.version}`)throw new Error('Your session expired. Sign in again.');
  if(!validPassword(body.password)||body.password!==body.confirmation)throw new Error('Use matching passwords of 12–128 characters.');
  if(equal(await hash(body.password,user.salt),user.password_hash))throw new Error('Choose a different password from your temporary password.');
  const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  const updated=await getDb().prepare('UPDATE local_test_customers SET salt=?,password_hash=?,must_change=0,version=version+1 WHERE id=? AND version=? AND enabled=1 AND removed=0').bind(salt,await hash(body.password,salt),user.id,user.version).run();
  if(!updated.meta.changes)throw new Error('Account changed. Sign in again.');
  await getDb().prepare('DELETE FROM customer_sessions WHERE user_id=?').bind(user.id).run();
}
