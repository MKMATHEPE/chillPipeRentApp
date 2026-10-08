// Isolated fixtures only. No production bookings or payments are changed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const requireNode = createRequire(import.meta.url);
function load(file, dependencies={}) {
  const module={exports:{}};
  const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','module','exports',source)(name => dependencies[name] || requireNode(name),module,module.exports);
  return module.exports;
}
const lib=load('lib/performance.ts');
const time=s => Date.parse(s);
const record=(id,values={}) => ({id,version:1,customerId:id,status:'Completed',paid:true,paidAt:time('2026-10-05T12:00:00Z'),handedOverAt:time('2026-10-06T12:00:00Z'),completedAt:time('2026-10-07T12:00:00Z'),items:[['A renamed display label',550]],fee:250,quantities:{pipe:1,premium:0},...values});
const data=[
  record('older',{customerId:'repeat',paidAt:time('2026-09-01T10:00Z'),handedOverAt:time('2026-09-01T12:00Z'),completedAt:time('2026-09-02T12:00Z')}),
  record('a',{customerId:'repeat'}),
  record('b',{items:[['Premium plus add-ons',860]],fee:350,quantities:{pipe:0,premium:2}}),
  record('unpaid',{status:'Pending',paid:false,paidAt:undefined,handedOverAt:undefined,completedAt:undefined}),
  record('paid-only',{status:'Approved',items:[['Rental',550]],fee:0,handedOverAt:undefined,completedAt:undefined}),
  record('undated',{paidAt:undefined,handedOverAt:undefined,completedAt:undefined}),
];
let report=lib.performanceReport(data,'2026-10-05','2026-10-08','2026-10-08');
assert.equal(report.received,2560);assert.equal(report.completed.length,2);assert.equal(report.handedOver.length,2);
assert.deepEqual(report.quantities,{Classic:1,Premium:2});assert.equal(report.average,1005);assert.equal(report.returning,1);assert.equal(report.undated,1);
assert.equal(report.bars.reduce((s,b)=>s+b.money,0),report.received);assert.equal(report.bars.reduce((s,b)=>s+b.rentals,0),2);
console.log('PASS paid receipts include delivery/add-ons; unpaid excluded; completion/handover dates independent; real quantities survive label changes; repeat customers and undated history');
report=lib.performanceReport([...data,record('a',{version:0,items:[['Stale value',999999]]})],'2026-10-05','2026-10-08','2026-10-08');
assert.equal(report.received,2560);
console.log('PASS duplicate and stale records cannot inflate totals');
const midnight=[record('before',{paidAt:time('2026-10-04T21:59:59Z')}),record('at',{paidAt:time('2026-10-04T22:00:00Z')})];
assert.equal(lib.performanceReport(midnight,'2026-10-05','2026-10-05','2026-10-08').received,800);
assert.equal(lib.reportDay(time('2026-10-04T22:00:00Z')),'2026-10-05');
for(const [from,to] of [['2026-10-09','2026-10-08'],['2026-02-30','2026-10-08'],['','2026-10-08'],['2026-10-01','2026-10-09']])
  assert.equal(lib.performanceReport(data,from,to,'2026-10-08').valid,false);
assert.equal(lib.performanceReport(data,'2026-01-01','2026-10-08','2026-10-08').bars.length,7);
const empty=lib.performanceReport([],'2026-10-01','2026-10-08','2026-10-08');
assert.equal(empty.received,0);assert.equal(empty.average,null);assert.equal(empty.completed.length,0);
console.log('PASS South Africa midnight boundary, reversed/invalid/future dates, bounded long-range chart and true empty results');
const pennies=[record('cents1',{items:[['Small',0.1]],fee:0.2}),record('cents2',{items:[['Small',0.1]],fee:0})];
assert.equal(lib.performanceReport(pennies,'2026-10-01','2026-10-08','2026-10-08').received,0.4);
const React=requireNode('react');
const {renderToStaticMarkup}=requireNode('react-dom/server');
const Component=load('app/admin-preview/performance.tsx',{'@/lib/performance':lib}).default;
const html=renderToStaticMarkup(React.createElement(Component,{bookings:data}));
for(const label of ['Money received','Completed rentals','Rentals handed over','Most rented','missing event dates','Reporting period','Chart metric']) assert.ok(html.includes(label));
assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
console.log('PASS money rounding and real Performance component rendering, labels, controls and historical-data notice');
