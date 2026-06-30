'use strict';
// bloom — node assertion harness. No deps. Prints PASS/FAIL; exits non-zero on any failure.
// Run: node bloom/test/harness.js
let fails = 0, total = 0;
function ok(cond, msg) { total++; console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (!cond) fails++; }
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= (eps || 1e-9), msg + ` (${a} ~ ${b})`); }
function section(name) { console.log('\n· ' + name); }

// ---- Task 1: rng + const ----
section('rng + const');
const B = require('../js/rng.js');
require('../js/const.js');

(function testRng() {
  const r1 = B.makeRng(12345), r2 = B.makeRng(12345);
  const a = [r1(), r1(), r1()], b = [r2(), r2(), r2()];
  ok(a.every((v, i) => v === b[i]), 'same seed → identical stream');
  ok(a.every(v => v >= 0 && v < 1), 'rng outputs in [0,1)');
  ok(B.makeRng(99)() !== a[0], 'different seed → different stream');
})();

(function testConst() {
  ok(B.PAL.length === 8, 'palette has 8 colours');
  ok(B.PAL.every(c => /^#[0-9a-f]{6}$/i.test(c)), 'palette entries are hex');
  ok(B.W > 0 && B.H > 0, 'world dims positive');
  ok(Math.abs(B.TAU - Math.PI * 2) < 1e-12, 'TAU = 2π');
})();

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'} — ${total - fails}/${total}`);
process.exit(fails ? 1 : 0);
