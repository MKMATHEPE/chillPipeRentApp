// Opt-in real Supabase integration; isolated in-memory app database, no live bookings.
// Creates one unique disposable identity and deletes only that identity in finally.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {createClient} from '@supabase/supabase-js';
import ts from 'typescript';
if(process.env.CP_LIVE_AUTH_TEST!=='1')throw new Error('Set CP_LIVE_AUTH_TEST=1 to explicitly run the provider integration.');
const env={...parseEnv(readFileSync('.env','utf8')),CUSTOMER_ACCOUNT_MODE:'managed'};
assert.equal(new URL(env.SUPABASE_URL).hostname,'ewnvndainmnludajyyvm.supabase.co');
const sql=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));
const db={prepare(q){const s=sql.prepare(q);let v=[];const p={bind(...a){v=a;return p;},async first(){return s.get(...v)||null;},async all(){return {results:s.all(...v)};},async run(){return s.run(...v);}};return p;},batch:items=>Promise.all(items.map(s=>s.run()))};
const ids=[];
const realCreate=(...args)=>{const client=createClient(...args);const original=client.auth.admin.createUser.bind(client.auth.admin);client.auth.admin.createUser=async body=>{const result=await original(body);if(result.data.user)ids.push(result.data.user.id);return result;};return client;};
const m={};function load(file){const mod={exports:{}};const src=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const require=n=>{if(n==='cloudflare:workers')return {env};if(n==='@supabase/supabase-js')return {createClient:realCreate};if(n.endsWith('/db'))return {getDb:()=>db};if(n.endsWith('/admin-auth'))return m.admin;if(n.endsWith('/admin-recovery'))return m.recovery;if(n.endsWith('/customer-management'))return m.management;if(n.endsWith('/customer-auth'))return m.customer;if(n.endsWith('/test-customers'))return {testCustomersEnabled:false};throw new Error('Unexpected module');};new Function('require','module','exports',src)(require,mod,mod.exports);return mod.exports;}
m.admin=load('lib/admin-auth.ts');m.recovery=load('lib/admin-recovery.ts');m.management=load('lib/customer-management.ts');m.customer=load('lib/customer-auth.ts');const auth=load('app/api/customer/auth/[action]/route.ts');
const email='cp-auth-check-'+crypto.randomUUID()+'@example.invalid';
const initial=crypto.randomUUID()+'aA1!',changed=crypto.randomUUID()+'bB2!';
const post=(action,body,cookie='')=>auth.POST(new Request('https://app.example/api/customer/auth/'+action,{method:'POST',headers:{origin:'https://app.example','content-type':'application/json',cookie},body:JSON.stringify(body)}));
try{
 await m.management.manageCustomer({action:'create',email,fullName:'Disposable authentication check',phone:'0000000000',temporaryPassword:initial,identityConfirmed:true});
 assert.equal(ids.length,1);assert.notEqual(ids[0],env.ADMIN_USER_ID);
 let r=await post('login',{email,password:initial});assert.equal(r.status,200);let cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await r.json()).requiresPasswordChange,true);assert.equal(await m.customer.verifyCustomer(cookie),null);
 r=await post('change-password',{currentPassword:initial,password:changed,confirmation:changed},cookie);assert.equal(r.status,200);assert.equal(await m.customer.verifyCustomer(cookie),null);
 assert.equal((await post('login',{email,password:initial})).status,401);
 r=await post('login',{email,password:changed});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await m.customer.verifyCustomer(cookie)).id,ids[0]);
 const row=await m.management.managedCustomer(ids[0]);await m.management.manageCustomer({action:'disable',id:ids[0],revision:row.revision});assert.equal(await m.customer.verifyCustomer(cookie),null);
 console.log('PASS real Supabase create → first-login gate → password replacement → old-password rejection → customer session → disabled access; isolated application database.');
}catch(e){console.error('FAIL real provider integration:',e instanceof assert.AssertionError?`expected ${e.expected}, received ${e.actual}`:'Provider operation failed; no secrets or account data logged.');process.exitCode=1;}
finally{
 const admin=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).auth.admin;
 for(const id of ids){assert.notEqual(id,env.ADMIN_USER_ID);const {data,error}=await admin.getUserById(id);if(error||data.user?.email!==email){console.error('Cleanup verification failed; disposable identity requires review.');process.exitCode=1;continue;}const removed=await admin.deleteUser(id);if(removed.error){console.error('Disposable identity cleanup failed.');process.exitCode=1;}else console.log('Removed the disposable integration identity; no customer records or bookings were touched.');}
 sql.close();
}
