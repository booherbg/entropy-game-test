'use strict';
// Tiny assertion harness (no deps). Each check prints PASS/FAIL; process exits non-zero on any failure.
let fails = 0;
function ok(cond, msg) { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (!cond) fails++; }
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= (eps || 1e-9), msg + ` (${a} ~ ${b})`); }

const E = require('../js/rng.js');

(function testRngDeterminism() {
  const r1 = E.makeRng(12345), r2 = E.makeRng(12345);
  const a = [r1(), r1(), r1()], b = [r2(), r2(), r2()];
  ok(a.every((v, i) => v === b[i]), 'same seed → identical stream');
  ok(a.every(v => v >= 0 && v < 1), 'rng outputs in [0,1)');
  const r3 = E.makeRng(99);
  ok(r3() !== a[0], 'different seed → different stream');
})();

require('../js/grid.js'); require('../js/field.js');

const FE = require('../js/field.js');

(function testFieldConservationAndSpread() {
  const f = E.makeField(E.makeRng(7));
  // seed a single hot cell of lumen so there is something to spread
  for (let i = 0; i < E.W * E.H; i++) { f.el[i * E.NEL + E.LUM] = 0; }
  const c = (E.H >> 1) * E.W + (E.W >> 1);
  f.el[c * E.NEL + E.LUM] = 100;
  const before = f.total(E.LUM);
  const centerBefore = f.el[c * E.NEL + E.LUM];
  for (let s = 0; s < 25; s++) f.diffuse();
  approx(f.total(E.LUM), before, 1e-3, 'diffusion conserves total lumen');
  ok(f.el[c * E.NEL + E.LUM] < centerBefore, 'diffusion lowers the peak (spreads)');
  // a neighbour gained some
  ok(f.el[(c + 1) * E.NEL + E.LUM] > 0, 'diffusion spread lumen to a neighbour');
})();

(function testFieldDeterminism() {
  const f1 = E.makeField(E.makeRng(7)), f2 = E.makeField(E.makeRng(7));
  for (let s = 0; s < 10; s++) { f1.diffuse(); f2.diffuse(); }
  let same = true;
  for (let i = 0; i < f1.el.length; i++) if (f1.el[i] !== f2.el[i]) { same = false; break; }
  ok(same, 'same seed → identical field after diffusion');
})();

const GEN = require('../js/generators.js');

(function testGeneratorConservationAndShape() {
  const f = E.makeField(E.makeRng(1));
  const base = f.total(E.LUM);
  const g = { x: 80, y: 50, el: E.LUM, rate: 10, proj: 'radial', radius: 12 };
  E.depositGenerators(f, [g]);
  approx(f.total(E.LUM) - base, 10, 1e-4, 'radial generator adds exactly its rate (finite)');
  ok(f.get(E.idx(80, 50), E.LUM) > f.get(E.idx(80, 62), E.LUM), 'radial: more at the centre than the edge');
})();

(function testGeneratorOverlapAdds() {
  const f = E.makeField(E.makeRng(1));
  const c = E.idx(80, 50);
  const lumBefore = f.get(c, E.LUM), minBefore = f.get(c, E.MIN);
  E.depositGenerators(f, [
    { x: 80, y: 50, el: E.LUM, rate: 10, proj: 'radial', radius: 14 },
    { x: 80, y: 50, el: E.MIN, rate: 10, proj: 'radial', radius: 14 },
  ]);
  ok(f.get(c, E.LUM) > lumBefore && f.get(c, E.MIN) > minBefore,
     'overlap: the cell gains BOTH elements → a blend (combinatorial niche)');
})();

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails ? 1 : 0);
