'use strict';
// Census clustering — tests what is TRUE today: a real garden reads as ONE species (the probe proved a wall
// doesn't yet drive divergence — that needs divergent selection, a gated DNA change), AND the clustering is
// correct when GIVEN genuinely divergent input. So the module is honest + ready to wire once speciation is
// real. Read-only: it must consume no rng and never mutate the sim. Run: node bloom/test/census.js
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim', 'census']
  .forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B, C = B.Census;

let fails = 0, total = 0;
function ok(c, m) { total++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails++; }

// plant a cluster of mutated copies of one ancestor, and settle so they build flowers
function plantCluster(sim, anc, cx, cy, n) {
  for (let i = 0; i < n; i++) { const g = B.Genome.mutate(anc, sim.rng, 1); const p = sim.plantAt(cx + (i % 3) * 3, cy + ((i / 3) | 0) * 4, g); p.biomass = 0.95; p.sugar = 15; }
}

// (1) a real garden is ONE species (the honest current state)
for (const seed of [7, 21, 42]) {
  const sim = B.makeSim(seed); sim.warmStart();
  for (let t = 0; t < 2000; t++) sim.tick();
  ok(C.species(sim).count === 1, `warmStart garden reads as one species (seed ${seed})`);
}

// (2) the clustering is CORRECT when given genuinely divergent input (two maximally-different ancestors)
(function () {
  const sim = B.makeSim(5);
  const A = B.Genome.randomPlant(sim.rng);
  const Bg = B.Genome.randomPlant(sim.rng);
  Bg.beaconHue = (A.beaconHue + 0.5) % 1;                 // opposite beacon
  ['petalColor', 'guideColor', 'coreColor', 'ringColor', 'veinColor'].forEach(k => { Bg[k] = (A[k] + 4) & 7; }); // flipped palette
  Bg.symmetry = A.symmetry === 6 ? 4 : 6; Bg.veinFreq = 3;
  plantCluster(sim, A, 12, 20, 5);
  plantCluster(sim, Bg, 76, 20, 5);
  for (let t = 0; t < 30; t++) sim.tick();
  const s = C.species(sim);
  ok(s.flowers >= 6, `synthetic garden has flowers to read (${s.flowers})`);
  ok(s.count === 2, `two maximally-divergent clusters read as TWO species (got ${s.count})`);
  ok(s.isolation > 0.3, `the two species register as reproductively isolated (isolation ${s.isolation.toFixed(2)})`);
  const rep = C.representative(s.clusters[0]);
  ok(s.clusters[0].indexOf(rep) >= 0, 'representative() returns a member of its own species');
})();

// (3) READ-ONLY: the census consumes no rng and mutates no sim state
(function () {
  const sim = B.makeSim(9); sim.warmStart();
  for (let t = 0; t < 500; t++) sim.tick();
  const before = sim.rng.state(), fitBefore = sim.meanFit();
  C.species(sim); C.species(sim, 0.6); C.representative(C.species(sim).clusters[0]);
  ok(sim.rng.state() === before, 'census touches no rng (state identical)');
  ok(sim.meanFit() === fitBefore, 'census mutates no sim state (fit identical)');
})();

console.log(`\n${fails ? 'FAIL' : 'ALL PASS'} — ${total - fails}/${total}`);
process.exit(fails ? 1 : 0);
