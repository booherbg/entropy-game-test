'use strict';
// Speciation experiment: two spatially-isolated clusters that start from ONE shared ancestor. If local seeding
// + local co-evolution + gradual genetic-compat work, the two clusters drift apart until a bee's pollen no
// longer sets seed across them — they become distinct species. Measures within- vs cross-cluster fertility.
// Run: node bloom/test/speciation.js
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim'].forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B;

function build(seed, differentLight, wall) {
  const sim = B.makeSim(seed);
  const anc = B.Genome.randomPlant(sim.rng);                 // ONE shared ancestor → they COULD interbreed at first
  const mk = (cx, cy) => { const g = B.Genome.mutate(anc, sim.rng, 1); const p = sim.plantAt(cx, cy, g); p.biomass = 0.95; p.sugar = 6; return p; };
  for (let i = 0; i < 7; i++) mk(14 + (i % 3) * 3, 22 + ((i / 3) | 0) * 5);   // LEFT cluster
  for (let i = 0; i < 7; i++) mk(78 + (i % 3) * 3, 22 + ((i / 3) | 0) * 5);   // RIGHT cluster
  if (differentLight) { for (let k = 0; k < 6; k++) { sim.field.paintLight(17, 28, 12, 1.25, 0.5); sim.field.paintLight(81, 28, 12, 0.35, 0.5); } }
  if (wall) { for (let y = 0; y < B.H; y++) sim.field.paintBarrier(48, y, 1.4, true); } // a hedgerow down the middle
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

// (1) reproductive differentiation from spatial isolation (gradual, as designed)
for (const diff of [false, true]) {
  console.log(`\n· two isolated clusters, shared ancestor, ${diff ? 'DIFFERENT light' : 'same light'}`);
  const seeds = [7, 21, 42]; let crossEnd = 0, withinEnd = 0;
  for (const seed of seeds) {
    const sim = build(seed, diff, false);
    for (let t = 0; t < 6000; t++) sim.tick();
    const L = side(sim, true), R = side(sim, false);
    const cross = meanCompat(L, R), within = (meanCompat(L, L) + meanCompat(R, R)) / 2;
    crossEnd += cross; withinEnd += within;
    console.log(`  seed ${String(seed).padStart(2)}: cross ${cross.toFixed(2)}  within ${within.toFixed(2)}  (L ${L.length}/R ${R.length})`);
  }
  crossEnd /= seeds.length; withinEnd /= seeds.length;
  ok(withinEnd > 0.6, `each cluster stays internally fertile (within ${withinEnd.toFixed(2)} > 0.6)`);
  ok(crossEnd < withinEnd - 0.15, `the clusters differentiate — cross ${crossEnd.toFixed(2)} below within ${withinEnd.toFixed(2)}`);
}

// (2) the hedgerow is real isolation — it MECHANICALLY cuts gene flow (a bee can't forage or fly across it)
console.log('\n· the hedgerow lever — does a wall actually cut gene flow?');
{
  const sim = B.makeSim(1);
  for (let y = 0; y < B.H; y++) sim.field.paintBarrier(48, y, 1.4, true);
  const g = B.Genome.randomPlant(B.makeRng(2)), fRight = B.makeFlower(g, 70, 30, 1); fRight.restock(40);
  const key = { preference: g.beaconHue, decoder: B.Genome.decodeGrid(g), forageRange: 90, speed: 1.4, dietBias: 0.5 };
  const bee = B.makePollinator(key, 20, 30), col = B.makeColony(20, 40, B.makeRng(3)); col.bees.push(bee);
  ok(bee._pick([fRight], sim.field) === null, 'a bee cannot forage a flower across the hedge (rayBlocked)');
  let maxX = bee.x; for (let t = 0; t < 600; t++) { bee.tick(sim.field, [fRight], col, B.makeRng(t + 1)); if (bee.x > maxX) maxX = bee.x; }
  ok(maxX < 47, `a bee cannot fly through the hedge (max x ${maxX.toFixed(0)} < 47)`);
}

console.log(`\n${fails === 0 ? 'ISOLATION IS REAL + CAUSABLE — spatial separation already differentiates clusters (gradual), and the\nHEDGEROW lever mechanically cuts gene flow (bees cannot forage or fly across it). Strong divergence into\nfully-distinct species is deepened next by frequency-dependent selection (so the two sides settle on\nDIFFERENT morphs, not the same one) — the audit\'s next move. You draw the line; the split follows.' : fails + ' CHECK(S) FAILED'}`);
process.exit(fails ? 1 : 0);
