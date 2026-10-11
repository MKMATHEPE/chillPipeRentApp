// Real production handlers and SQLite, fake Supabase. No live users or messages.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));
const db={prepare(q){const s=sql.prepare(q);let v=[];const p={bind(...args){v=args;return p;},async first(){return s.get(...v)||null;},async all(){return {results:s.all(...v)};},async run(){return {meta:{changes:Number(s.run(...v).changes)}};}};return p;},batch:ss=>Promise.all(ss.map(s=>s.run()))};
const env={SUPABASE_URL:'https://identity.invalid',SUPABASE_PUBLISHABLE_KEY:'fake',SUPABASE_SECRET_KEY:'fake-secret',ADMIN_USER_ID:'owner',ADMIN_EMAIL:'owner@example.invalid',ADMIN_RESET_URL:'https://app.example/admin-reset',CUSTOMER_ACCOUNT_MODE:'managed'};
const users=new Map(),tokens=new Map();let admin=true,providerDown=false,onUpdate=null;
const fake={auth:{admin:{
  async createUser(input){if([...users.values()].some(u=>u.email===input.email))return {data:{},error:{status:422}};const user={id:crypto.randomUUID(),email:input.email,email_confirmed_at:'yes',user_metadata:input.user_metadata,app_metadata:input.app_metadata};users.set(user.id,{...user,password:input.password});return {data:{user},error:null};},
  async updateUserById(id,input){if(onUpdate)await onUpdate(id);if(providerDown)return {error:{status:503}};users.set(id,{...users.get(id),...input});return {data:{user:users.get(id)},error:null};},
},async signInWithPassword({email,password}){const user=[...users.values()].find(u=>u.email===email&&u.password===password);if(!user)return {data:{},error:{status:400}};const token=crypto.randomUUID();tokens.set(token,user.id);return {data:{user,session:{access_token:token,expires_at:Math.floor(Date.now()/1000)+3600}},error:null};},
async getUser(token){return {data:{user:users.get(tokens.get(token))},error:providerDown?{status:503}:null};}}};
const mods={};function load(file){const module={exports:{}};const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const require=n=>{if(n==='cloudflare:workers')return {env};if(n==='@supabase/supabase-js')return {createClient:()=>fake};if(n.endsWith('/db'))return {getDb:()=>db};if(n.endsWith('/admin-auth'))return {...mods.admin,verifyAdmin:async()=>admin?{id:'owner'}:null};if(n.endsWith('/admin-recovery'))return mods.recovery;if(n.endsWith('/customer-management'))return mods.management;if(n.endsWith('/customer-auth'))return mods.customer;if(n.endsWith('/test-customers'))return {testCustomersEnabled:false};if(n.endsWith('/booking-expiry'))return {expirePendingBookings:async()=>{}};throw new Error(n);};new Function('require','module','exports',code)(require,module,module.exports);return module.exports;}
mods.admin=load('lib/admin-auth.ts');mods.recovery=load('lib/admin-recovery.ts');mods.management=load('lib/customer-management.ts');mods.customer=load('lib/customer-auth.ts');
const auth=load('app/api/customer/auth/[action]/route.ts'),control=load('app/api/admin/customers/route.ts'),bookings=load('app/api/customer/bookings/route.ts'),profile=load('app/api/customer/profile/route.ts');
const req=(path,body,cookie='',origin='https://app.example')=>new Request('https://app.example'+path,{method:body?'POST':'GET',headers:{origin,cookie,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const create={action:'create',email:'alice@example.invalid',fullName:'Alice',phone:'0712345678',temporaryPassword:'Temporary12-Password!',identityConfirmed:true};
const manage=body=>control.POST(req('/api/admin/customers',body));
const post=(action,body,cookie='')=>auth.POST(req('/api/customer/auth/'+action,body,cookie));
const cookieOf=r=>r.headers.get('set-cookie')?.split(';')[0];
const row=id=>sql.prepare('SELECT * FROM managed_customers WHERE user_id=?').get(id);
const action=(name,id)=>manage({action:name,id,revision:row(id).revision});
admin=false;assert.equal((await manage(create)).status,401);admin=true;
assert.equal((await control.POST(req('/api/admin/customers',create,'','https://evil.invalid'))).status,403);
assert.equal((await manage({...create,identityConfirmed:false})).status,400);
assert.equal((await manage(create)).status,200);assert.equal((await manage(create)).status,400);
const alice=[...users.keys()][0];
assert.equal((await manage({action:'disable',id:'owner',revision:0})).status,400);
const listed=await (await control.GET(req('/api/admin/customers'))).json();assert.equal(listed.customers.length,1);assert.ok(!JSON.stringify(listed).includes(create.temporaryPassword));
for(const a of ['signup','resend','recover','reset'])assert.equal((await post(a,{})).status,403);
assert.equal((await post('login',{email:create.email,password:'wrong'})).status,401);
let r=await post('login',{email:create.email,password:create.temporaryPassword});assert.equal(r.status,200);let cookie=cookieOf(r);let payload=await r.json();assert.equal(payload.requiresPasswordChange,true);assert.equal(payload.profile,undefined);
assert.equal(await mods.customer.verifyCustomer(cookie),null);assert.equal((await profile.PATCH(req('/api/customer/profile',{},cookie))).status,401);
assert.equal((await bookings.GET(req('/api/customer/bookings',null,cookie))).status,401);
console.log('PASS owner-only creation, CSRF, identity attestation, duplicate/owner protection, no password disclosure and first-login gate');
const replacement={currentPassword:create.temporaryPassword,password:'NewCustomerPassword123!',confirmation:'NewCustomerPassword123!'};
assert.equal((await post('change-password',{...replacement,confirmation:'wrong'},cookie)).status,400);
assert.equal((await post('change-password',{...replacement,currentPassword:'wrong'},cookie)).status,400);
assert.equal((await post('change-password',replacement,cookie)).status,200);assert.equal(await mods.customer.verifyCustomer(cookie),null);
assert.equal((await post('login',{email:create.email,password:create.temporaryPassword})).status,401);
r=await post('login',{email:create.email,password:replacement.password});cookie=cookieOf(r);assert.equal((await r.json()).requiresPasswordChange,false);assert.equal((await mods.customer.verifyCustomer(cookie)).id,alice);
const saved=sql.prepare('SELECT * FROM customer_sessions WHERE user_id=?').get(alice);
await action('disable',alice);assert.equal(await mods.customer.verifyCustomer(cookie),null);
assert.equal((await post('login',{email:create.email,password:replacement.password})).status,403);
await action('enable',alice);
sql.prepare('INSERT INTO customer_sessions(token_hash,user_id,access_token,expires_at,managed_revision) VALUES (?,?,?,?,?)').run(saved.token_hash,saved.user_id,saved.access_token,saved.expires_at,saved.managed_revision);
assert.equal(await mods.customer.verifyCustomer(cookie),null,'old session remains invalid even after re-enable');
console.log('PASS password replacement, old password/session rejection, disable/re-enable and revision-based invalidation');
sql.exec('DELETE FROM admin_login_limits');
r=await post('login',{email:create.email,password:replacement.password});cookie=cookieOf(r);
await manage({...create,email:'bob@example.invalid',fullName:'Bob'});const bob=[...users.keys()].find(id=>id!==alice);
for(const [ref,id] of [['A',alice],['B',bob],['LEGACY',null]])sql.prepare("INSERT INTO bookings(reference,customer_name,phone,rental_date,location,order_json,rental_total,deposit,created_at,updated_at,customer_user_id) VALUES (?,'Customer','0712345678','2099-01-01T12:00','Test','{}',650,0,1,1,?)").run(ref,id);
assert.deepEqual((await (await bookings.GET(req('/api/customer/bookings',null,cookie))).json()).bookings.map(b=>b.reference),['A']);
await action('remove',alice);assert.equal(await mods.customer.verifyCustomer(cookie),null);assert.equal(sql.prepare("SELECT COUNT(*) n FROM bookings WHERE customer_user_id=?").get(alice).n,1);
assert.equal((await manage({...create})).status,400);assert.equal((await action('enable',alice)).status,400);
let br=await post('login',{email:'bob@example.invalid',password:create.temporaryPassword});const bc=cookieOf(br);
providerDown=true;assert.equal((await post('change-password',replacement,bc)).status,400);providerDown=false;assert.equal(row(bob).status,'active');
onUpdate=async id=>{await action('disable',id);};assert.equal((await post('change-password',replacement,bc)).status,400);onUpdate=null;assert.equal(row(bob).status,'disabled');assert.equal(await mods.customer.verifyCustomer(bc),null);
console.log('PASS customer ownership, no legacy auto-claim, removal preserves history, provider failure and concurrent disable during password replacement');
sql.exec('DELETE FROM admin_login_limits');for(let i=0;i<20;i++)await manage({});assert.equal((await manage({})).status,429);
console.log('PASS management rate limits');
