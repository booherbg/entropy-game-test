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

// ---- Task 3: the genome (the keystone) ----
section('genome — expression, decode-grid, match');
require('../js/genome.js');

(function testRandomPlantGenome() {
  const g = B.Genome.randomPlant(B.makeRng(3));
  ok(g.symmetry >= 3 && g.symmetry <= 8 && g.symmetry === (g.symmetry | 0), 'symmetry is int 3..8');
  ok(g.petalLength >= 0.45 && g.petalLength <= 0.98, 'petalLength in range');
  ok(g.petalColor >= 0 && g.petalColor <= 7, 'petalColor a palette index');
  ok(g.beaconHue >= 0 && g.beaconHue < 1, 'beaconHue in [0,1)');
})();

(function testRegionIndexRangeAndCore() {
  const g = B.Genome.randomPlant(B.makeRng(5));
  let okRange = true;
  for (let i = 0; i < 200; i++) {
    const r = (i % 20) / 20, th = (i / 200) * B.TAU - Math.PI;
    const idx = B.Genome.regionIndex(g, r, th);
    if (!(idx === -1 || (idx >= 0 && idx <= 7))) okRange = false;
  }
  ok(okRange, 'regionIndex returns -1 or a palette index 0..7');
  ok(B.Genome.regionIndex(g, 0, 0) === (g.coreColor | 0), 'centre (r=0) is the core colour');
})();

(function testDecodeGridDeterministic() {
  const g = B.Genome.randomPlant(B.makeRng(9));
  const a = B.Genome.decodeGrid(g), b = B.Genome.decodeGrid(g);
  ok(a.length === B.N * B.N, 'decode-grid is N*N');
  let same = true; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) same = false;
  ok(same, 'decode-grid deterministic for a fixed genome');
  ok(a.every(v => (v >= 0 && v <= 7) || v === B.EMPTY), 'grid cells are palette indices or EMPTY');
})();

(function testMatch() {
  const g = B.Genome.randomPlant(B.makeRng(11));
  const grid = B.Genome.decodeGrid(g);
  ok(Math.abs(B.match(grid, grid) - 1) < 1e-9, 'a grid matches itself exactly = 1');
  // two random keys vs random grids average near 1/9 (8 colours + empty) — genuinely "fumbling"
  let sum = 0, trials = 400;
  for (let t = 0; t < trials; t++) {
    const r = B.makeRng(1000 + t);
    const k = B.Genome.randomKey(r).decoder;
    const gg = B.Genome.decodeGrid(B.Genome.randomPlant(r));
    sum += B.match(k, gg);
  }
  const avg = sum / trials;
  ok(avg > 0.03 && avg < 0.30, `random match is low/fumbling (avg ${avg.toFixed(3)})`);
})();

(function testMutationLocality() {
  // a single-gene-ish mutation shifts the decode-grid by only a few cells (smooth visible drift)
  const rng = B.makeRng(21);
  let totalChanged = 0, trials = 40;
  for (let t = 0; t < trials; t++) {
    const g = B.Genome.randomPlant(rng);
    const g2 = B.Genome.mutate(g, rng, 1);
    const a = B.Genome.decodeGrid(g), b = B.Genome.decodeGrid(g2);
    let changed = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
    totalChanged += changed / a.length;
  }
  const meanFrac = totalChanged / trials;
  ok(meanFrac < 0.45, `mutation drift is local (mean ${(meanFrac * 100).toFixed(0)}% of grid cells change)`);
  ok(meanFrac > 0, 'mutation actually changes something');
})();

(function testMutationInRange() {
  const rng = B.makeRng(31);
  let allOk = true;
  for (let t = 0; t < 60; t++) {
    const g = B.Genome.mutate(B.Genome.randomPlant(rng), rng, 1);
    if (g.symmetry < 3 || g.symmetry > 8 || g.petalLength < 0.45 || g.petalLength > 0.98 ||
        g.petalColor < 0 || g.petalColor > 7 || g.beaconHue < 0 || g.beaconHue >= 1) allOk = false;
  }
  ok(allOk, 'mutated genomes stay in range');
})();

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'} — ${total - fails}/${total}`);
process.exit(fails ? 1 : 0);
