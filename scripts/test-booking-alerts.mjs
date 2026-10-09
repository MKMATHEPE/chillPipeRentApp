import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('module','exports',ts.transpileModule(readFileSync('lib/booking-alerts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);
const {pendingAlerts}=module.exports;
assert.deepEqual(pendingAlerts([],null,['old']),[]);
const seen=new Set(['old']);
assert.deepEqual(pendingAlerts([],seen,['old','a','b','a']),['a','b']);
seen.add('a');seen.add('b');
assert.deepEqual(pendingAlerts(['a','b'],seen,['old','a','b','c']),['a','b','c']);
assert.deepEqual(pendingAlerts([],seen,['old','a','b']),[]); // dismissed
assert.deepEqual(pendingAlerts(['a','b'],seen,['old','b']),['b']); // processed/expired
assert.deepEqual(pendingAlerts([],seen,['a']),[]); // reappearing record is not new
const same=['b'];assert.equal(pendingAlerts(same,seen,['b']),same);
const source=readFileSync('app/admin-preview/page.tsx','utf8');
assert.ok(source.includes("setAlertIds([]); changeTab('Requests')"));
assert.ok(source.includes('Dismiss new booking alert'));
assert.ok(source.includes('setInterval(tick, 30000)'));
console.log('PASS initial baseline, grouped arrivals, deduplication, dismissal, expired/processed removal, repeat polls, view/dismiss controls and existing refresh interval');
