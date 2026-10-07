// Isolated tests: production handlers, in-memory SQLite and a fake identity provider.
// Does not create real users or grant access to the running application.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync('drizzle/0001_blushing_falcon.sql', 'utf8'));
const db = {
  prepare(query) {
    const statement = sql.prepare(query); let values = [];
    const prepared = {
      bind(...args) { values = args; return prepared; },
      async first() { return statement.get(...values) || null; },
      async run() { return statement.run(...values); },
    }; return prepared;
  },
  batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
};
let identity = { id: 'owner-test', email_confirmed_at: '2026-10-07' };
let providerError = null;
const fakeClient = { auth: {
  async signInWithPassword() { return { data: { user: identity, session: { access_token: 'fake-provider-token', expires_at: Math.floor(Date.now()/1000)+3600 } }, error: providerError }; },
  async getUser() { return { data: { user: identity }, error: providerError }; },
} };
const env = { SUPABASE_URL: 'https://auth.invalid', SUPABASE_PUBLISHABLE_KEY: 'fake', ADMIN_USER_ID: 'owner-test' };
let core;
function load(path) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const require = name => {
    if (name === 'cloudflare:workers') return { env };
    if (name === '@supabase/supabase-js') return { createClient: () => fakeClient };
    if (name.endsWith('/db')) return { getDb: () => db };
    if (name.endsWith('/lib/admin-auth')) return core;
    throw new Error('Unexpected dependency ' + name);
  };
  new Function('require', 'module', 'exports', source)(require, module, module.exports);
  return module.exports;
}
core = load('lib/admin-auth.ts');
const login = load('app/api/admin/auth/login/route.ts').POST;
const logout = load('app/api/admin/auth/logout/route.ts').POST;
const req = (cookie = '') => new Request('https://app.example/api/admin/auth/login', { method: 'POST', headers: { origin: 'https://app.example', 'content-type': 'application/json', cookie }, body: JSON.stringify({ email: 'owner@example.invalid', password: 'test-only' }) });
let response = await login(req());
assert.equal(response.status, 200);
const setCookie = response.headers.get('set-cookie');
assert.match(setCookie, /HttpOnly; SameSite=Strict; Max-Age=\d+; Secure/);
assert.ok(!setCookie.includes('fake-provider-token'));
const cookie = setCookie.split(';')[0];
const token = core.readSessionCookie(cookie);
const row = sql.prepare('SELECT * FROM admin_sessions').get();
assert.notEqual(row.token_hash, token);
assert.equal(row.token_hash, await core.digest(token));
assert.equal((await core.verifyAdmin(cookie)).id, 'owner-test');
console.log('PASS owner login, secure opaque cookie, hashed session storage, verified session');
providerError = { status: 503 };
await assert.rejects(core.verifyAdmin(cookie), /unavailable/);
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM admin_sessions').get().n, 1);
providerError = null;
response = await logout(req(cookie));
assert.equal(response.status, 200);
assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
assert.equal(await core.verifyAdmin(cookie), null);
console.log('PASS provider outage fails closed without deleting session; logout revokes session');
identity = { id: 'another-user', email_confirmed_at: '2026-10-07' };
assert.equal((await login(req())).status, 401);
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM admin_sessions').get().n, 0);
identity = { id: 'owner-test', email_confirmed_at: null };
assert.equal((await login(req())).status, 401);
console.log('PASS other user and unconfirmed owner denied');
identity = { id: 'owner-test', email_confirmed_at: '2026-10-07' };
response = await login(req());
const expiringCookie = response.headers.get('set-cookie').split(';')[0];
sql.exec('UPDATE admin_sessions SET expires_at=0');
assert.equal(await core.verifyAdmin(expiringCookie), null);
console.log('PASS expired session denied');
sql.exec('DELETE FROM admin_login_limits');
for(let i=0;i<10;i++) assert.equal(await core.allowLogin(req()), true);
assert.equal(await core.allowLogin(req()), false);
console.log('PASS eleventh attempt rate limited');
sql.close();
