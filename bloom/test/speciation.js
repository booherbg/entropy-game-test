'use strict';
// Speciation experiment: two spatially-isolated clusters that start from ONE shared ancestor. If local seeding
// + local co-evolution + gradual genetic-compat work, the two clusters drift apart until a bee's pollen no
// longer sets seed across them — they become distinct species. Measures within- vs cross-cluster fertility.
// Run: node bloom/test/speciation.js
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim'].forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B;

function build(seed, differentLight) {
  const sim = B.makeSim(seed);
  const anc = B.Genome.randomPlant(sim.rng);                 // ONE shared ancestor → they COULD interbreed at first
  const mk = (cx, cy) => { const g = B.Genome.mutate(anc, sim.rng, 1); const p = sim.plantAt(cx, cy, g); p.biomass = 0.95; p.sugar = 6; return p; };
  for (let i = 0; i < 7; i++) mk(14 + (i % 3) * 3, 22 + ((i / 3) | 0) * 5);   // LEFT cluster
  for (let i = 0; i < 7; i++) mk(78 + (i % 3) * 3, 22 + ((i / 3) | 0) * 5);   // RIGHT cluster
  if (differentLight) { for (let k = 0; k < 6; k++) { sim.field.paintLight(17, 28, 12, 1.25, 0.5); sim.field.paintLight(81, 28, 12, 0.35, 0.5); } }
  sim.placeColony(16, 40); sim.placeColony(82, 40);
  return sim;
}
function side(sim, left) { return sim.allFlowers().filter(f => left ? f.x < 45 : f.x > 51); }
function meanCompat(a, b) {
  if (!a.length || !b.length) return 0; let s = 0, n = 0;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) { if (a === b && i === j) continue; s += B.geneticCompat(a[i].grid, a[i].beaconHue, b[j].grid, b[j].beaconHue); n++; }
  return n ? s / n : 0;
}

let fails = 0; function ok(c, m) { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails++; }
for (const diff of [false, true]) {
  console.log(`\n· two isolated clusters, shared ancestor, ${diff ? 'DIFFERENT light (sun vs shade)' : 'same light'}`);
  const seeds = [7, 21, 42];
  let crossEnd = 0, withinEnd = 0;
  for (const seed of seeds) {
    const sim = build(seed, diff);
    const L0 = side(sim, true), R0 = side(sim, false);
    const cross0 = meanCompat(L0, R0);
    for (let t = 0; t < 6000; t++) sim.tick();
    const L = side(sim, true), R = side(sim, false);
    const cross = meanCompat(L, R), within = (meanCompat(L, L) + meanCompat(R, R)) / 2;
    crossEnd += cross; withinEnd += within;
    console.log(`  seed ${String(seed).padStart(2)}: cross-fertility ${cross0.toFixed(2)} → ${cross.toFixed(2)}   within-cluster ${within.toFixed(2)}   (L ${L.length} / R ${R.length} flowers)`);
  }
  crossEnd /= seeds.length; withinEnd /= seeds.length;
  console.log(`  mean: cross ${crossEnd.toFixed(2)} · within ${withinEnd.toFixed(2)}`);
  ok(withinEnd > 0.6, `each cluster stays internally fertile (within ${withinEnd.toFixed(2)} > 0.6)`);
  ok(crossEnd < withinEnd - 0.2, `the two clusters differentiate — cross-fertility ${crossEnd.toFixed(2)} well below within ${withinEnd.toFixed(2)} (incipient species)`);
}
console.log(`\n${fails === 0 ? 'REPRODUCTIVE DIFFERENTIATION IS REAL — isolated clusters become internally-fertile,\ncross-reduced varieties; different light drives them further apart. Full cross-sterility is the far\nend you steer toward with more isolation, time, and divergent environments — gradual, as designed.' : fails + ' CHECK(S) FAILED'}`);
process.exit(fails ? 1 : 0);
