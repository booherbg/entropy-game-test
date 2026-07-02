'use strict';
// Artifact IMPACT — does each relic meaningfully BEND a run, not just pass a unit contract? For each
// archetype: matched seeds, control vs treatment, a full run, report the delta on the metric the relic is
// supposed to move. This is the balance pass — a negligible effect is a dead relic; an overpowering one
// flattens the game. Run: node bloom/test/artifact-impact.js
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim', 'artifact']
  .forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B, A = B.Artifacts;

const SEEDS = [7, 21, 42, 88, 131];
const TICKS = 6000, EARLY = 400;   // a "head start" relic lives in the first few hundred ticks, before the control catches up

function measure(sim) {
  return {
    fit: sim.meanFit(),
    flowers: sim.allFlowers().length,
    pop: sim.colonies.reduce((n, c) => n + c.bees.length, 0),
    nectar: +sim.colonies.reduce((n, c) => n + c.nectar, 0).toFixed(1),
    niches: sim.plants.reduce((n, p) => n + (p.niches || 1), 0),
  };
}
// run a sim to TICKS, sampling fit at EARLY; artifactId null → control
function run(seed, artifactId) {
  const sim = B.makeSim(seed); sim.warmStart();
  if (artifactId) sim.applyArtifacts([A.make(artifactId, seed)]);
  let earlyFit = 0;
  for (let t = 0; t < TICKS; t++) { sim.tick(); if (t === EARLY) earlyFit = sim.meanFit(); }
  const m = measure(sim); m.earlyFit = earlyFit; return m;
}

// average a metric delta (treatment − control) across seeds
function deltas(artifactId) {
  const acc = { fit: 0, earlyFit: 0, flowers: 0, pop: 0, nectar: 0, niches: 0 };
  for (const s of SEEDS) { const c = run(s, null), t = run(s, artifactId);
    for (const k in acc) acc[k] += (t[k] - c[k]); }
  for (const k in acc) acc[k] = acc[k] / SEEDS.length;
  return acc;
}

console.log(`\nimpact of each relic vs matched control — mean Δ over ${SEEDS.length} seeds, ${TICKS} ticks\n`);
console.log('archetype'.padEnd(22) + 'Δfit   Δearly  Δflow  Δpop   Δnect   Δnich');
const rows = {};
for (const c of A.CATALOG) {
  const d = deltas(c.id); rows[c.id] = d;
  const f = (x, p) => (x >= 0 ? '+' : '') + x.toFixed(p);
  console.log(c.id.padEnd(22) + f(d.fit, 3).padEnd(7) + f(d.earlyFit, 3).padEnd(8) +
    f(d.flowers, 1).padEnd(7) + f(d.pop, 1).padEnd(7) + f(d.nectar, 1).padEnd(8) + f(d.niches, 1));
}

// ── hard asserts on the robust, intended signals (a dead relic should FAIL here) ──
console.log('');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails++; };
ok(rows['rich-loam'].flowers > 0.5, 'rich-loam enriches the garden (more flowers)');
ok(rows['the-eddy'].fit > 0.005, 'the-eddy holds the merge higher against the drift');
ok(rows['founders-cache'].earlyFit > 0.005, 'founders-cache gives an early-merge head start');
ok(rows['maxwell-demon'].fit > 0.005 || rows['maxwell-demon'].earlyFit > 0.005, 'maxwell-demon accelerates the merge');
ok(rows['deep-structure'].niches > 0.2, 'deep-structure adds real structure (niches)');
console.log(`\n${fails ? 'FAIL' : 'ALL PASS'} — impact confirmed on ${5 - fails}/5 signature relics`);
process.exit(fails ? 1 : 0);
