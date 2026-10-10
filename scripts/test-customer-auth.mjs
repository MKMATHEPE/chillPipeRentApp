// Real route handlers, isolated SQLite and fake identity provider. No live accounts/emails.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));
const db={prepare(q){const s=sql.prepare(q);let args=[];const p={bind(...a){args=a;return p;},async first(){return s.get(...args)||null;},async all(){return {results:s.all(...args)};},async run(){return {meta:{changes:Number(s.run(...args).changes)}};}};return p;},batch(stmts){return Promise.all(stmts.map(s=>s.run()));}};
let identity={id:'alice',email:'alice@example.invalid',email_confirmed_at:'2026-10-10',user_metadata:{fullName:'Alice',phone:'0712345678'}};
let providerError=null,signupError=null,signupArgs,mailArgs,resetCount=0;
const identities=new Map();
const fake={auth:{
  async signUp(args){signupArgs=args;return {data:{user:identity,session:null},error:signupError};},
  async signInWithPassword(){identities.set('token-'+identity.id,structuredClone(identity));return {data:{user:identity,session:{access_token:'token-'+identity.id,expires_at:Math.floor(Date.now()/1000)+3600}},error:providerError};},
  async getUser(token){return {data:{user:identities.get(token)||null},error:providerError};},
  async resetPasswordForEmail(email,options){mailArgs={email,...options};return {error:providerError};},
  async resend(args){mailArgs=args;return {error:providerError};},
}};
const env={SUPABASE_URL:'https://identity.invalid',SUPABASE_PUBLISHABLE_KEY:'fake',ADMIN_USER_ID:'owner',ADMIN_EMAIL:'owner@example.invalid',ADMIN_RESET_URL:'https://app.example/admin-reset'};
const modules={};
function load(file){const mod={exports:{}};const src=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const require=n=>{if(n==='cloudflare:workers')return {env};if(n==='@supabase/supabase-js')return {createClient:()=>fake};if(n.endsWith('/db'))return {getDb:()=>db};if(n.endsWith('/admin-auth'))return modules.admin;if(n.endsWith('/admin-recovery'))return modules.recovery;if(n.endsWith('/customer-auth'))return modules.customer;if(n.endsWith('/booking-expiry'))return {expirePendingBookings:async()=>{}};throw new Error(n);};new Function('require','module','exports',src)(require,mod,mod.exports);return mod.exports;}
modules.admin=load('lib/admin-auth.ts');modules.recovery=load('lib/admin-recovery.ts');modules.customer=load('lib/customer-auth.ts');
const auth=load('app/api/customer/auth/[action]/route.ts'),profile=load('app/api/customer/profile/route.ts'),bookings=load('app/api/customer/bookings/route.ts');
const request=(action,body={},cookie='',method='POST',origin='https://app.example')=>new Request('https://app.example/api/customer/auth/'+action,{method,headers:{origin,cookie,'content-type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)})});
const credentials={email:'alice@example.invalid',password:'LongPassword12!',fullName:'Alice',phone:'0712345678'};
assert.equal((await auth.POST(request('signup',credentials,'','POST','https://evil.invalid'))).status,403);
assert.equal((await auth.POST(request('signup',{...credentials,password:'short'}))).status,400);
assert.equal((await auth.POST(request('signup',credentials))).status,200);
assert.equal(signupArgs.options.emailRedirectTo,'https://app.example/customer-login');
assert.deepEqual(signupArgs.options.data,{fullName:'Alice',phone:'0712345678'});
assert.equal(sql.prepare('SELECT COUNT(*) n FROM customer_sessions').get().n,0);
assert.equal((await auth.GET(request('session',{},'','GET'))).status,401);
identity.email_confirmed_at=null;
assert.equal((await auth.POST(request('login',credentials))).status,401);
identity.email_confirmed_at='2026-10-10';
let r=await auth.POST(request('login',credentials));assert.equal(r.status,200);
const cookie=r.headers.get('set-cookie').split(';')[0];
assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure/);
assert.ok(!r.headers.get('set-cookie').includes('token-alice'));
assert.equal((await modules.customer.verifyCustomer(cookie)).id,'alice');
assert.equal(await modules.admin.verifyAdmin(cookie),null);
assert.equal((await (await auth.GET(request('session',{},cookie,'GET'))).json()).profile.fullName,'Alice');
console.log('PASS signup validation, trusted confirmation destination, no unverified session, opaque secure customer cookie and admin separation');
const values={fullName:'Alice Updated',phone:'0712345678',location:'Test address',alternativePhone:''};
assert.equal((await profile.PATCH(request('profile',values))).status,401);
assert.equal((await profile.PATCH(request('profile',{...values,user_id:'bob'},cookie,'PATCH'))).status,200);
assert.equal(sql.prepare('SELECT full_name FROM customer_profiles WHERE user_id=?').get('alice').full_name,'Alice Updated');
assert.equal(sql.prepare('SELECT COUNT(*) n FROM customer_profiles').get().n,1);
identity={id:'bob',email:'bob@example.invalid',email_confirmed_at:'2026-10-10',user_metadata:{fullName:'Bob',phone:'0712345678',role:'admin'}};
r=await auth.POST(request('login',{...credentials,email:'bob@example.invalid'}));const bobCookie=r.headers.get('set-cookie').split(';')[0];
assert.equal(await modules.admin.verifyAdmin(bobCookie),null);
for(const [id,user] of [['A','alice'],['B','bob'],['OLD',null]])sql.prepare("INSERT INTO bookings(reference,customer_name,phone,rental_date,location,order_json,rental_total,deposit,created_at,updated_at,customer_user_id) VALUES (?,'Customer','0712345678','2099-01-01T12:00','Test','{}',650,0,1,1,?)").run(id,user);
r=await bookings.GET(request('bookings',{},cookie,'GET'));assert.deepEqual((await r.json()).bookings.map(b=>b.reference),['A']);
r=await bookings.GET(request('bookings',{},bobCookie,'GET'));assert.deepEqual((await r.json()).bookings.map(b=>b.reference),['B']);
assert.equal((await bookings.GET(request('bookings',{},'','GET'))).status,401);
console.log('PASS profile write ownership, same-phone accounts isolated, no legacy auto-claim and private booking lists');
providerError={status:503};assert.equal((await auth.GET(request('session',{},cookie,'GET'))).status,503);providerError=null;
assert.equal((await auth.POST(request('logout',{},cookie))).status,200);assert.equal(await modules.customer.verifyCustomer(cookie),null);
sql.exec('UPDATE customer_sessions SET expires_at=0');assert.equal(await modules.customer.verifyCustomer(bobCookie),null);
assert.equal((await auth.POST(request('recover',{email:'bob@example.invalid'}))).status,200);assert.equal(mailArgs.redirectTo,'https://app.example/customer-reset');
assert.equal((await auth.POST(request('resend',{email:'bob@example.invalid'}))).status,200);assert.equal(mailArgs.options.emailRedirectTo,'https://app.example/customer-login');
globalThis.fetch=async()=>{resetCount++;return Response.json({});};
identities.set('owner-token',{id:'owner',email_confirmed_at:'yes'});
assert.equal((await auth.POST(request('reset',{accessToken:'owner-token',password:'DifferentPassword12!'}))).status,403);
assert.equal((await auth.POST(request('reset',{accessToken:'token-bob',password:'DifferentPassword12!'}))).status,200);
assert.equal((await auth.POST(request('reset',{accessToken:'token-bob',password:'DifferentPassword12!'}))).status,401);assert.equal(resetCount,1);
sql.exec('DELETE FROM admin_login_limits');
for(let i=0;i<10;i++)await auth.POST(request('login',{}));
assert.equal((await auth.POST(request('login',{}))).status,429);
console.log('PASS outage recovery, logout, expiry, password-reset ownership/replay, admin reset separation and rate limits');
