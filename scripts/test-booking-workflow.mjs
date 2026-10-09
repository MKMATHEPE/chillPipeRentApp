// Isolated production-route integration: in-memory SQLite; no real orders or payments.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
const sql = new DatabaseSync(':memory:');
for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) sql.exec(readFileSync('drizzle/' + file, 'utf8'));
let unavailable = false;
const db = { prepare(query) {
  if (unavailable) throw new Error('Test database outage');
  const stmt = sql.prepare(query); let args = [];
  const prepared = { bind(...values) { args = values; return prepared; }, async first() { return stmt.get(...args) || null; }, async all() { return { results: stmt.all(...args) }; }, async run() { return { meta: { changes: Number(stmt.run(...args).changes) } }; } };
  return prepared;
} };
let authenticated = true;
const auth = { AUTH_HEADERS: { 'Cache-Control': 'no-store' }, sameOrigin: req => req.headers.get('origin') === new URL(req.url).origin, verifyAdmin: async () => authenticated ? { id: 'test-owner' } : null };
const modules = {};
function load(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const require = name => {
    if (name.endsWith('/db')) return { getDb: () => db };
    if (name.endsWith('/admin-auth')) return auth;
    if (name.endsWith('/admin-bookings')) return modules.bookings;
    if (name.endsWith('/payment-methods')) return modules.payment;
    if (name.endsWith('/booking-pricing')) return modules.pricing;
    if (name.endsWith('/delivery-quotes')) return modules.deliveryQuotes;
    if (name.endsWith('/inventory-server')) return modules.inventoryServer;
    if (name.endsWith('/inventory')) return modules.inventory;
    throw new Error('Unexpected import ' + name);
  };
  new Function('require', 'module', 'exports', source)(require, module, module.exports);
  return module.exports;
}
modules.payment = load('lib/payment-methods.ts');
modules.pricing = load('lib/booking-pricing.ts');
modules.deliveryQuotes = load('lib/delivery-quotes.ts');
modules.bookings = load('lib/admin-bookings.ts');
modules.performance = load('lib/performance.ts');
modules.inventory = load('lib/inventory.ts');
modules.inventoryServer = load('lib/inventory-server.ts');
const inventory = load('app/api/admin/inventory/route.ts');
const client = load('app/api/bookings/route.ts');
const delivery = load('app/api/delivery-quote/route.ts');
const admin = load('app/api/admin/bookings/route.ts');
const payment = load('app/api/bookings/payment/route.ts');
const req = (path, body, method = 'POST', origin = 'https://app.example') => new Request('https://app.example' + path, { method, headers: { origin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
// External mapping is stubbed; no production network, addresses or records touched.
let routeMetres = 15000, mapFails = false, noAddress = false;
globalThis.fetch = async url => {
  if(mapFails) throw new Error('Test map outage');
  if(String(url).includes('/route/v1/')) return Response.json({code:'Ok',routes:[{distance:routeMetres}]});
  if(String(url).includes('/reverse?')) return Response.json({display_name:'Pinned address',address:{suburb:'Test suburb'}});
  return Response.json(noAddress ? [] : [{lat:'-26.01',lon:'28.1',display_name:'Mapped address'}]);
};
const getQuote = async payload => {
  const response = await delivery.POST(req('/api/delivery-quote',payload));
  assert.equal(response.status,200); return response.json();
};
const nearQuote = await getQuote({address:'Test address',suburb:'Test suburb'});
assert.equal(nearQuote.fee,250);
routeMetres=15000.1;
const farQuote = await getQuote({address:'Test address',suburb:'Test suburb'});
assert.equal(farQuote.fee,350); // Threshold uses raw driving metres, not rounded kilometres.
const pinQuote = await getQuote({latitude:-26,longitude:28});
assert.equal(sql.prepare('SELECT address FROM delivery_quotes WHERE id=?').get(pinQuote.quoteId).address,'Pinned address');
assert.equal((await delivery.POST(req('/api/delivery-quote',{latitude:null,longitude:null}))).status,400);
noAddress=true;
assert.equal((await delivery.POST(req('/api/delivery-quote',{address:'Unknown',suburb:'Test suburb'}))).status,404);
noAddress=false; mapFails=true;
assert.equal((await delivery.POST(req('/api/delivery-quote',{address:'Test',suburb:'Test suburb'}))).status,503);
mapFails=false;
const order = { customer: { name: 'Workflow test', phone: '0000000000', date: '2026-10-20T14:00', location: 'Test address, Test suburb', notes: 'Unit 14' }, quantities: { pipe: 1, premium: 1, coalPack: 2, stove: 1 }, selectedFlavours: [{ name: 'Gum & Mint', quantity: 3 }], suggestedFlavours: [{ name: 'Mango', quantity: 2, details: 'Test brand' }], total: 1810, delivery: true, deliveryFee: 250, deliveryQuoteId:nearQuote.quoteId, paymentMethod: 'cash_on_delivery' };
for(const change of [{deliveryQuoteId:undefined},{deliveryQuoteId:'fake'},{deliveryFee:350},{deliveryQuoteId:farQuote.quoteId},{customer:{...order.customer,location:'Different address'}},{customer:{...order.customer,location:123}}]) {
  assert.equal((await client.POST(req('/api/bookings',{...order,...change}))).status,409);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM bookings').get().n,0);
}
sql.prepare('UPDATE delivery_quotes SET expires_at=0 WHERE id=?').run(farQuote.quoteId);
assert.equal((await client.POST(req('/api/bookings',{...order,deliveryQuoteId:farQuote.quoteId,deliveryFee:350}))).status,409);
const verified = await modules.deliveryQuotes.verifyDeliveryQuote({...order,deliveryDistanceKm:1});
assert.equal(verified.distanceKm,15);
assert.equal((await modules.deliveryQuotes.verifyDeliveryQuote({...order,deliveryUnit:'Unit 14',customer:{...order.customer,location:'Test address, Unit 14, Test suburb'}})).fee,250);
assert.equal((await modules.deliveryQuotes.verifyDeliveryQuote({...order,delivery:false})).location,modules.deliveryQuotes.COLLECTION_LOCATION);
console.log('PASS trusted delivery fee/address/distance, missing/forged/expired quotes, pinned/manual addresses, exact 15km boundary, map outage and fixed free collection');
// Pricing failures must not create even a partial booking.
for (const invalid of [
  {total:0}, {total:1660}, {total:1811}, {total:'1810'}, {total:null}, {total:1810.5},
  {quantities:{pipe:-1}}, {quantities:{pipe:1.5}}, {quantities:{pipe:'1'}}, {quantities:{pipe:null}},
  {quantities:{pipe:11}}, {quantities:{pipe:1,stove:-1}}, {quantities:{pipe:1,coalPack:11}},
  {quantities:{pipe:0,premium:0}}, {quantities:{pipe:1,discount:100}}, {quantities:[]},
  {selectedFlavours:[{name:'Gum & Mint',quantity:-1}]}, {selectedFlavours:[{name:'Gum & Mint',quantity:0}]},
  {selectedFlavours:[{name:'Gum & Mint',quantity:1.5}]}, {selectedFlavours:[{name:'Gum & Mint',quantity:'3'}]},
  {selectedFlavours:[{name:'Gum & Mint',quantity:Number.MAX_SAFE_INTEGER}]},
  {selectedFlavours:[{name:'Unknown flavour',quantity:3}]}, {selectedFlavours:{}},
  {suggestedFlavours:[{name:'Mango',quantity:-2}]}, {delivery:'false'}, {deliveryFee:0}, {deliveryFee:'250'},
]) {
  const result = await client.POST(req('/api/bookings',{...order,...invalid}));
  assert.ok([400,409].includes(result.status),JSON.stringify(invalid));
  assert.equal(sql.prepare('SELECT count(*) AS n FROM bookings').get().n,0);
}
for (const malformed of ['{', 'null', '[]']) {
  assert.equal((await client.POST(new Request('https://app.example/api/bookings',{method:'POST',body:malformed}))).status,400);
}
assert.equal(modules.pricing.priceBooking({...order,selectedFlavours:['Gum & Mint','Gum & Mint','Gum & Mint']}).total,1810);
assert.equal(modules.pricing.priceBooking({...order,selectedFlavours:[{name:'Gum & Mint',quantity:1},{name:'Gum & Mint',quantity:2}]}).selectedFlavours[0].quantity,3);
assert.equal(modules.pricing.priceBooking({...order,selectedFlavours:[{name:'Gum & Mint',quantity:100}],total:6660}).total,6660);
console.log('PASS tampered/stale totals, invalid/unknown quantities, malformed requests, legacy/duplicate flavours and unlimited valid flavour quantities');
for (const [quantities,selectedFlavours,total] of [
  [{pipe:1},[],650], [{premium:1},['Lady Killer'],850],
  [{pipe:1},[{name:'Lady Killer',quantity:3}],750],
  [{pipe:1,premium:1},['Lady Killer','Gum & Mint'],1500],
  [{pipe:1,coalPack:2,stove:1},['Lady Killer'],910],
]) {
  const priced = modules.pricing.priceBooking({...order,quantities,selectedFlavours,total,delivery:false,deliveryFee:350,unitPrices:{pipe:1},deposit:999,extraFlavourPrice:0});
  assert.equal(priced.total,total); assert.equal(priced.deliveryFee,0); assert.equal(priced.unitPrices.pipe,650);
}
const historical = modules.bookings.toAdminBooking({reference:'OLD',phone:'000',rental_date:'2026-01-01T12:00',order_json:JSON.stringify({quantities:{pipe:1}}),rental_total:550,deposit:0,delivery_fee:0,status:'complete'});
assert.equal(historical.items.reduce((sum,[,n])=>sum+n,0),550);
const homeSource=readFileSync('app/page.tsx','utf8'),checkoutSource=readFileSync('app/checkout/page.tsx','utf8');
for (const [key,value] of Object.entries(modules.pricing.RENTAL_PRICES)) assert.match(checkoutSource,new RegExp(key+': '+value));
assert.ok(homeSource.includes('pipeQty * 650')); assert.ok(homeSource.includes('premiumQty * 850'));
console.log('PASS single/mixed hookahs, included flavours, extra coal packs/stoves, unpriced suggestions, ignored injected prices, zero collection fee, historical totals and client/server price parity');
let response = await client.POST(req('/api/bookings', order));
assert.equal(response.status, 201);
const created = await response.json();
const reference = created.reference;
const fetchAdmin = async () => (await (await admin.GET(req('/api/admin/bookings', undefined, 'GET'))).json()).bookings;
let booking = (await fetchAdmin())[0];
assert.equal(booking.id, reference); assert.equal(booking.status, 'Pending'); assert.equal(booking.name, order.customer.name);
assert.equal(booking.items.reduce((sum, [, n]) => sum + n, booking.fee), 2060);
assert.equal(booking.rentalStart, '2026-10-20T14:00'); assert.equal(booking.flavours, 'Gum & Mint × 3'); assert.match(booking.suggestions, /Mango × 2/); assert.equal(booking.notes, 'Unit 14');
const savedOrder = JSON.parse(sql.prepare('SELECT order_json FROM bookings WHERE reference=?').get(reference).order_json);
assert.deepEqual(savedOrder.unitPrices,{pipe:650,premium:850,coalPack:30,stove:200});
assert.equal(savedOrder.extraFlavourPrice,50);
assert.equal(booking.items.some(([name])=>name==='Recorded pricing adjustment'),false);
console.log('PASS customer request → saved database → admin details, quantities, flavours, fee, total and South Africa time');
const patch = (status, version = booking.version, reason, origin) => admin.PATCH(req('/api/admin/bookings', { reference, status, version, reason }, 'PATCH', origin));
const stock = async () => (await inventory.GET(req('/api/admin/inventory', undefined, 'GET'))).json();
const editStock = item => inventory.PATCH(req('/api/admin/inventory', item, 'PATCH'));
let snapshot = await stock();
assert.deepEqual(snapshot.equipment.map(e => e.total), [20,20,10,20]);
assert.ok(snapshot.equipment.every(e => e.unavailable === 0));
console.log('PASS confirmed usable stock initializes once: 20 Classic, 20 Premium, 10 stoves, 20 tongs');
authenticated = false;
assert.equal((await inventory.GET(req('/api/admin/inventory',undefined,'GET'))).status,401);
assert.equal((await editStock(snapshot.equipment[0])).status,401);
assert.equal((await admin.GET(req('/api/admin/bookings', undefined, 'GET'))).status, 401);
assert.equal((await patch('approved')).status, 401); authenticated = true;
assert.equal((await patch('approved', 0, '', 'https://evil.example')).status, 403);
assert.equal((await patch('handed_over')).status, 409);
assert.equal((await patch('declined')).status, 400);
assert.equal((await patch('complete')).status, 409);
assert.equal((await admin.PATCH(req('/api/admin/bookings', { reference, status: 'paid' }, 'PATCH'))).status, 400);
console.log('PASS unauthorized access, cross-origin writes, skipped stages and missing decline reason rejected');
for (const status of ['approved', 'paid', 'handed_over', 'returned', 'complete']) {
  response = await patch(status); assert.equal(response.status, 200);
  const updated = (await response.json()).booking;
  assert.equal(updated.version, booking.version + 1);
  assert.equal((await patch(status)).status, 409); // stale/double-click request
  booking = updated;
  snapshot = await stock();
  const expected = ['approved','paid'].includes(status) ? {reserved:1,out:0} : ['handed_over','returned'].includes(status) ? {reserved:0,out:1} : {reserved:0,out:0};
  assert.deepEqual(snapshot.allocations.classic,expected);
  assert.deepEqual(snapshot.allocations.tongs,{reserved:expected.reserved*2,out:expected.out*2});
  if (status === 'approved') assert.equal((await editStock({...snapshot.equipment[0],total:0})).status,409);
  const tracked = await client.GET(req(`/api/bookings?reference=${reference}&phone=0000000000`, undefined, 'GET'));
  assert.equal(tracked.headers.get('cache-control'), 'no-store');
  assert.equal((await tracked.json()).status, status);
  const persisted = (await fetchAdmin()).find(b => b.id === reference);
  assert.equal(persisted.rawStatus, status);
  if (status === 'approved') assert.equal((await patch('handed_over')).status, 409);
}
assert.ok(booking.paidAt); assert.ok(booking.handedOverAt); assert.ok(booking.completedAt); assert.equal(booking.history.length, 6);
assert.equal((await patch('approved')).status, 409);
console.log('PASS approve → paid → handover → returned → completed; customer tracking and reload persistence; duplicate actions rejected');
response = await client.POST(req('/api/bookings', { ...order, delivery: false, deliveryFee: 0, paymentMethod: 'online' }));
const second = (await response.json()).reference;
response = await admin.PATCH(req('/api/admin/bookings', { reference: second, version: 0, status: 'declined', reason: 'No equipment available' }, 'PATCH'));
assert.equal(response.status, 200);
const declined = await client.GET(req(`/api/bookings?reference=${second}&phone=0000000000`, undefined, 'GET'));
assert.equal((await declined.json()).declineReason, 'No equipment available');
assert.equal((await client.GET(req(`/api/bookings?reference=${second}&phone=wrong`, undefined, 'GET'))).status, 404);
console.log('PASS decline reason saved and visible only with correct booking lookup; closed booking cannot reopen');
response = await client.POST(req('/api/bookings', { ...order, paymentMethod: 'online' }));
const third = (await response.json()).reference;
await admin.PATCH(req('/api/admin/bookings', { reference: third, version: 0, status: 'approved' }, 'PATCH'));
assert.equal((await payment.POST(req('/api/bookings/payment', { reference: third, phone: '0000000000', method: 'eft' }))).status, 200);
assert.equal((await admin.PATCH(req('/api/admin/bookings', { reference: third, version: 1, status: 'paid' }, 'PATCH'))).status, 409);
assert.equal((await admin.PATCH(req('/api/admin/bookings', { reference: third, version: 2, status: 'paid' }, 'PATCH'))).status, 200);
console.log('PASS customer payment notification requires manual admin verification and protects against stale updates');
const reportDate = modules.performance.reportDay(Date.now());
const liveResults = modules.performance.performanceReport(await fetchAdmin(),reportDate,reportDate,reportDate);
assert.equal(liveResults.received,4120);assert.equal(liveResults.completed.length,1);assert.equal(liveResults.handedOver.length,1);
assert.deepEqual(liveResults.quantities,{Classic:1,Premium:1});
assert.equal(liveResults.bars.reduce((s,b)=>s+b.money,0),4120);
console.log('PASS actual saved booking/payment/handover/completion events feed accurate Performance totals and chart');
// Enough isolated records to exercise pagination; nothing reaches production.
for (let n = 0; n < 100; n++) await client.POST(req('/api/bookings', order));
const page = await (await admin.GET(req('/api/admin/bookings', undefined, 'GET'))).json();
assert.equal(page.bookings.length, 100); assert.ok(page.nextCursor);
const next = await (await admin.GET(req('/api/admin/bookings?before=' + page.nextCursor, undefined, 'GET'))).json();
assert.equal(next.bookings.length, 3); assert.equal(next.nextCursor, null);
assert.equal(new Set([...page.bookings, ...next.bookings].map(b => b.id)).size, 103);
console.log('PASS pagination includes older bookings without duplicates');
snapshot = await stock();
let classic = snapshot.equipment.find(e => e.id === 'classic');
assert.equal((await inventory.PATCH(req('/api/admin/inventory',classic,'PATCH','https://evil.example'))).status,403);
for (const invalid of [{total:-1},{total:1.5},{unavailable:9999},{price:0},{price:1.001},{version:-1}])
  assert.equal((await editStock({...classic,...invalid})).status,400);
assert.equal((await editStock({...classic,total:25,unavailable:2})).status,200);
assert.equal((await editStock({...classic,total:26})).status,409);
snapshot = await stock();
classic = snapshot.equipment.find(e => e.id === 'classic');
assert.equal(classic.total,25); assert.equal(classic.unavailable,2); assert.equal(classic.version,1);
assert.equal((await stock()).equipment.find(e => e.id === 'classic').total,25);
console.log('PASS inventory edits persist, initialization never overwrites edits; invalid/stale/unauthorized writes and reductions below holds rejected');
// One earlier paid rental holds two tongs. Leave exactly two more available.
const tongs = snapshot.equipment.find(e => e.id === 'tongs');
assert.equal((await editStock({...tongs,total:4})).status,200);
const contenders = (await fetchAdmin()).filter(b => b.status === 'Pending').slice(0,2);
const outcomes = await Promise.all(contenders.map(b => admin.PATCH(req('/api/admin/bookings',{reference:b.id,version:b.version,status:'approved'},'PATCH'))));
assert.deepEqual(outcomes.map(r => r.status).sort(),[200,409]);
assert.equal((await stock()).allocations.tongs.reserved,4);
console.log('PASS competing approvals cannot overbook tongs; quantities use real customer orders, not demo references');
// Date-window scenarios use only this disposable in-memory test database.
sql.exec('DELETE FROM bookings');
sql.exec('UPDATE equipment SET total=2,unavailable=0');
const dated = async (date, count = 1) => {
  const res = await client.POST(req('/api/bookings',{...order,customer:{...order.customer,date},quantities:{pipe:count,premium:0,stove:0,coalPack:0},total:count*650+Math.max(0,3-count)*50}));
  assert.equal(res.status,201);
  return (await res.json()).reference;
};
const act = async (ref,status) => {
  const row = sql.prepare('SELECT version FROM bookings WHERE reference=?').get(ref);
  return admin.PATCH(req('/api/admin/bookings',{reference:ref,status,version:row.version},'PATCH'));
};
const a = await dated('2099-01-01T10:00');
const b = await dated('2099-01-02T10:00');
assert.equal((await act(a,'approved')).status,200);
assert.equal((await act(b,'approved')).status,200);
assert.equal((await stock()).allocations.classic.reserved,1);
const c = await dated('2099-01-02T09:00');
assert.equal((await act(c,'approved')).status,200); // overlaps A and B, but A/B don't overlap each other
assert.equal((await stock()).allocations.classic.reserved,2);
const d = await dated('2099-01-02T09:30');
assert.equal((await act(d,'approved')).status,409);
let futureStock = await stock();
assert.equal((await editStock({...futureStock.equipment[0],total:1})).status,409);
assert.deepEqual(modules.inventory.windowAllocation(await fetchAdmin(),'classic',modules.inventory.rentalEpoch('2099-01-02T09:30')),{reserved:2,out:0});
console.log('PASS 24-hour boundary reuse, partial overlap, peak concurrency (not sum of overlaps), UI parity and stock-edit protection');
assert.equal(modules.inventory.rentalEpoch('2099-01-01T10:00'),modules.inventory.rentalEpoch('2099-01-01T08:00Z'));
assert.ok(Number.isNaN(modules.inventory.rentalEpoch('2099-02-30T10:00')));
assert.ok(Number.isNaN(modules.inventory.rentalEpoch('bad-date')));
const invalid = await dated('2099-01-10T10:00');
sql.prepare('UPDATE bookings SET rental_date=? WHERE reference=?').run('bad-date',invalid);
assert.equal((await act(invalid,'approved')).status,400);
const expired = await dated('2000-01-01T10:00');
assert.equal((await act(expired,'approved')).status,409);
console.log('PASS South Africa/UTC equivalence, malformed dates and ended rental requests');
sql.exec('DELETE FROM bookings');
sql.exec('UPDATE equipment SET total=1,unavailable=0');
const early = await dated('2099-02-01T10:00');
const later = await dated('2099-02-02T10:00');
assert.equal((await act(early,'approved')).status,200);
assert.equal((await act(later,'approved')).status,200);
assert.equal((await act(early,'paid')).status,200);
assert.equal((await act(later,'paid')).status,200);
assert.equal((await act(early,'handed_over')).status,200);
assert.equal((await act(later,'handed_over')).status,409); // physical equipment still out
const future = await dated('2099-02-10T10:00');
assert.equal((await act(future,'approved')).status,409);
assert.equal((await act(early,'returned')).status,200);
assert.equal((await act(future,'approved')).status,409); // inspection pending
assert.equal((await act(early,'complete')).status,200);
assert.equal((await act(later,'handed_over')).status,200);
await act(later,'returned'); await act(later,'complete');
assert.equal((await act(future,'approved')).status,200);
console.log('PASS out/late return and inspection block reuse; physical handover guard; completion restores availability');
sql.exec('DELETE FROM bookings');
const race1 = await dated('2099-03-01T10:00'), race2 = await dated('2099-03-01T11:00');
const dateRace = await Promise.all([act(race1,'approved'),act(race2,'approved')]);
assert.deepEqual(dateRace.map(r => r.status).sort(),[200,409]);
console.log('PASS simultaneous overlapping approvals have one winner');
sql.exec('DELETE FROM bookings');
const boundary1 = await dated('2099-03-31T23:30+02:00'), boundary2 = await dated('2099-04-01T21:30Z');
const separateRace = await Promise.all([act(boundary1,'approved'),act(boundary2,'approved')]);
assert.deepEqual(separateRace.map(r => r.status),[200,200]);
assert.equal((await stock()).allocations.classic.reserved,1);
console.log('PASS simultaneous separate-date approvals, month boundary and server UTC/South Africa equivalence');
unavailable = true;
assert.equal((await inventory.GET(req('/api/admin/inventory',undefined,'GET'))).status,503);
assert.equal((await editStock(classic)).status,503);
assert.equal((await admin.GET(req('/api/admin/bookings', undefined, 'GET'))).status, 503);
assert.equal((await patch('paid')).status, 503);
console.log('PASS unavailable database returns recoverable errors, not success');
sql.close();
