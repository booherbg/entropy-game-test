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

// ---- Task 2: the field ----
section('field');
require('../js/field.js');

(function testFieldChannels() {
  const f = B.makeField(B.makeRng(7));
  ok(f.light.length === B.W * B.H, 'light channel sized W*H');
  ok(f.trail.length === B.W * B.H && f.nectar.length === B.W * B.H && f.pollen.length === B.W * B.H,
    'trail/nectar/pollen channels sized W*H');
})();

(function testLightGradient() {
  const f = B.makeField(B.makeRng(7));
  // brighter toward the top (canopy sun) — average top row > average bottom row
  let topSum = 0, botSum = 0;
  for (let x = 0; x < B.W; x++) { topSum += f.lightAt(x, 0); botSum += f.lightAt(x, B.H - 1); }
  ok(topSum / B.W > botSum / B.W, 'light gradient: top brighter than bottom');
  ok(f.lightAt(10, 10) > 0, 'light is positive somewhere');
})();

(function testTrailDiffuseConserves() {
  const f = B.makeField(B.makeRng(7));
  f.add('trail', B.W >> 1, B.H >> 1, 100);
  const before = f.total('trail');
  const peakBefore = f.get('trail', B.W >> 1, B.H >> 1);
  for (let s = 0; s < 25; s++) f.diffuse('trail', 0.2);
  approx(f.total('trail'), before, 1e-2, 'trail diffusion conserves total');
  ok(f.get('trail', B.W >> 1, B.H >> 1) < peakBefore, 'trail diffusion lowers the peak (spreads)');
})();

(function testDecayMonotone() {
  const f = B.makeField(B.makeRng(7));
  f.add('nectar', 5, 5, 50);
  const t0 = f.total('nectar');
  f.decay('nectar', 0.1);
  const t1 = f.total('nectar');
  f.decay('nectar', 0.1);
  const t2 = f.total('nectar');
  ok(t1 < t0 && t2 < t1, 'decay lowers total monotonically');
})();

(function testFieldDeterminism() {
  const f1 = B.makeField(B.makeRng(7)), f2 = B.makeField(B.makeRng(7));
  f1.add('trail', 8, 8, 30); f2.add('trail', 8, 8, 30);
  for (let s = 0; s < 10; s++) { f1.diffuse('trail', 0.2); f2.diffuse('trail', 0.2); }
  let same = true;
  for (let i = 0; i < f1.trail.length; i++) if (f1.trail[i] !== f2.trail[i]) { same = false; break; }
  ok(same, 'same seed → identical field after diffusion');
})();

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'} — ${total - fails}/${total}`);
process.exit(fails ? 1 : 0);
