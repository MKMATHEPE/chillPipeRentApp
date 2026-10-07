import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3010';
let passed = 0;
async function check(name, path, status, options = {}) {
  const response = await fetch(base + path, { redirect: 'manual', ...options });
  const body = await response.text();
  assert.equal(response.status, status, name + ': ' + body.slice(0, 150));
  // The framework may reject cross-origin requests before the route runs.
  if (path.startsWith('/api/admin/') && status !== 403) assert.match(response.headers.get('cache-control'), /no-store/);
  if (status === 307) assert.equal(response.headers.get('location'), '/admin-login');
  assert.ok(!body.includes('access_token'), name + ': must not expose identity tokens');
  console.log('PASS', name); passed++;
}
await check('Admin preview requires sign-in', '/admin-preview', 307);
await check('Legacy admin requires sign-in', '/admin', 307);
await check('Bookings API requires sign-in', '/api/admin/bookings', 401);
await check('Platform header cannot bypass app login', '/api/admin/bookings', 401, { headers: { 'oai-authenticated-user-id': '645b1ab1-cd8c-4149-8b7c-f5928a8e721c' } });
await check('Malformed session rejected', '/api/admin/auth/session', 401, { headers: { cookie: 'cp_admin_session=invalid' } });
await check('Unknown session rejected', '/api/admin/auth/session', 401, { headers: { cookie: 'cp_admin_session=' + 'a'.repeat(64) } });
await check('Unauthenticated update rejected', '/api/admin/bookings', 401, { method: 'PATCH', headers: { origin: base, 'content-type': 'application/json' }, body: '{}' });
await check('Cross-origin update rejected', '/api/admin/bookings', 403, { method: 'PATCH', headers: { origin: 'https://untrusted.example' } });
await check('Cross-origin login rejected', '/api/admin/auth/login', 403, { method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' }, body: '{}' });
await check('Cross-origin logout rejected', '/api/admin/auth/logout', 403, { method: 'POST', headers: { origin: 'https://untrusted.example' } });
await check('Missing login fields rejected', '/api/admin/auth/login', 400, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{}' });
await check('Malformed JSON rejected', '/api/admin/auth/login', 400, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{' });
await check('Customer homepage remains available', '/', 200);
await check('Customer delivery remains available', '/?step=delivery', 200);
await check('Customer checkout remains available', '/checkout', 200);
console.log(passed + ' access and customer-route smoke tests passed. Owner sign-in still requires private user testing.');
