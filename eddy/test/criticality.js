'use strict';
// Measure the edge of chaos (the foundations doc's "measurable soul"): is this world Class-4 (alive) —
// diversity persisting without freezing or churning, extinctions arriving in self-organized-criticality
// cascades? Pure analysis, deterministic, swept across seeds so the verdict isn't a lucky world.
//
// Species are counted by E.speciesKey — diet quantized to quarters + a hunter flag — the SAME meaningful
// niche the player's diversity score uses (max ~30 ways of making a living). An earlier version counted
// the chronicle's procedural *names*, which bucket into ~150 hash slots and so inflate both the diversity
// (it read ~87) and the cascade sizes; this measures real niches instead. node eddy/test/criticality.js
['rng', 'grid', 'field', 'generators', 'life', 'fertility', 'sim', 'score'].forEach(f => require('../js/' + f + '.js'));
const E = globalThis.E;

const TICKS = 4000, WARM = 620; // drop the establishment ramp; measure the living world, not its birth

function run(seed) {
  const sim = E.makeSim(seed);
  sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
  // pre-build the gradient before seeding (as the real game's freshSim does) so the primers land in
  // surplus and the colony takes at once — otherwise the world sits empty for ~300 ticks waiting on a
  // fertility spark, a cold-start transient that has nothing to do with the established world's criticality.
  for (let k = 0; k < 40; k++) { sim.field.diffuse(); E.depositGenerators(sim.field, sim.gens); }
  sim.dropPrimer(55, 50); sim.dropPrimer(95, 50);

  const firstSeen = new Map(); // speciesKey -> tick first observed (for births/extinctions)
  const div = [];              // warm-window diversity samples (niche count)
  const win = {}; let totalExt = 0; // extinctions per 100-tick window
  for (let t = 1; t <= TICKS; t++) {
    sim.tick();
    if (t === 500) for (let i = 0; i < 4; i++) sim.dropPredator(54 + i % 3, 49 + (i / 3 | 0));
    if (t % 20 !== 0) continue;
    const cur = new Set();
    for (const e of sim.life.list) if (e.alive) cur.add(E.speciesKey(e));
    const warm = t >= WARM;
    if (warm) div.push(cur.size);
    for (const k of cur) if (!firstSeen.has(k)) firstSeen.set(k, t);             // births
    for (const k of Array.from(firstSeen.keys())) if (!cur.has(k)) {             // extinctions
      firstSeen.delete(k);
      if (warm) { const w = Math.floor(t / 100); win[w] = (win[w] || 0) + 1; totalExt++; }
    }
  }
  const mean = div.reduce((a, b) => a + b, 0) / div.length;
  const std = Math.sqrt(div.reduce((a, b) => a + (b - mean) ** 2, 0) / div.length);
  const cv = std / mean, dmin = Math.min.apply(null, div), dmax = Math.max.apply(null, div);
  const sizes = Object.values(win).sort((a, b) => b - a);
  const maxCascade = sizes[0] || 0;
  const topK = Math.max(1, Math.ceil(sizes.length * 0.1));
  const big = sizes.slice(0, topK).reduce((a, b) => a + b, 0);
  const tailFrac = totalExt ? big / totalExt : 0;
  const uniform = sizes.length ? topK / sizes.length : 0; // mass the top 10% of windows hold if extinctions were uniform
  return { seed, mean, cv, dmin, dmax, totalExt, windows: sizes.length, maxCascade, tailFrac, uniform };
}

const SEEDS = [7, 11, 23, 42, 101];
console.log('=== eddy · criticality (4000 ticks each, warm window t>=' + WARM + ', niche-level species) ===');
console.log('seed |  mean div |   cv  | range  | extinct | maxCasc | heavy-tail');
const rows = SEEDS.map(run);
for (const r of rows) {
  console.log(
    String(r.seed).padStart(4) + ' | ' +
    r.mean.toFixed(1).padStart(9) + ' | ' +
    r.cv.toFixed(2).padStart(5) + ' | ' +
    (r.dmin + '..' + r.dmax).padStart(6) + ' | ' +
    String(r.totalExt).padStart(7) + ' | ' +
    String(r.maxCascade).padStart(7) + ' | ' +
    (r.tailFrac * 100).toFixed(0).padStart(8) + '%');
}
// aggregate verdict across seeds
const agg = k => rows.reduce((a, r) => a + r[k], 0) / rows.length;
const meanMean = agg('mean'), meanCv = agg('cv'), meanTail = agg('tailFrac'), meanUnif = agg('uniform');
const meanExt = agg('totalExt');
const minFloor = Math.min.apply(null, rows.map(r => r.dmin));
console.log('—');
console.log('across ' + rows.length + ' seeds: mean diversity ' + meanMean.toFixed(0) +
  ', mean cv ' + meanCv.toFixed(2) + ', warm floor ' + minFloor +
  ', turnover ' + meanExt.toFixed(0) + ' extinctions/run');
console.log('heavy-tail: top 10% of windows hold ' + (meanTail * 100).toFixed(0) +
  '% of extinctions vs ' + (meanUnif * 100).toFixed(0) + '% if uniform — ' +
  (meanTail / meanUnif).toFixed(1) + '× concentrated');
// the Wolfram/Langton frame: Class 4 sits between frozen order (1/2) and chaos (3). The trap: a stable
// diversity *count* alone can't tell frozen from alive — a dead world also has a flat count. The tell is
// TURNOVER: a live critical world holds its count while species churn beneath it (births ≈ extinctions),
// the avalanches heavy-tailed (Bak SOC) rather than a uniform drip. So we require all three.
let cls;
if (minFloor === 0 || meanMean < 3) cls = 'Class 1/2 — collapsing (diversity hits the floor)';
else if (meanExt < 10) cls = 'Class 1/2 — frozen (stable count, but no turnover — dead-still)';
else if (meanCv > 0.7) cls = 'Class 3 — chaotic churn (count swings wildly)';
else cls = 'Class 4 — persistent count + live turnover + structured (ALIVE)';
const soc = meanTail > 1.5 * meanUnif; // heavy-tailed = top windows hold well above their uniform share
console.log('verdict: ' + cls + (soc ? ' · cascades heavy-tailed (SOC, edge of chaos)' : ' · cascades ~uniform (sub-critical)'));
