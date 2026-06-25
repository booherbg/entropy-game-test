'use strict';
// Is it boring? A game is boring if your choices don't matter. This pits distinct stewardship strategies
// against each other on the game's OWN score (diversity/order/throughput/flourish), seed-averaged, so the
// question "does where I put the springs change the outcome?" gets a number. Also tracks the soil arc
// (the boom-then-drawdown every playtest showed) and the peak→final population. node eddy/test/strategy.js
['rng', 'grid', 'field', 'generators', 'life', 'fertility', 'sim', 'score'].forEach(f => require('../js/' + f + '.js'));
const E = globalThis.E;

// each strategy: how it lays out springs + seeds. infinite springs here (isolate layout from depletion —
// the finite-spring economy is a separate lever already tested). a tick hook allows timed intervention.
const STRATS = {
  // lazy baseline: one lumen spring, one seed
  single(sim) {
    sim.addGenerator({ x: 80, y: 50, el: E.LUM, rate: 10, proj: 'radial', radius: 18 });
    return [[80, 50]];
  },
  // two springs far apart — two pure niches, fields barely touch
  pair(sim) {
    sim.addGenerator({ x: 45, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 14 });
    sim.addGenerator({ x: 115, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 14 });
    return [[45, 50], [115, 50]];
  },
  // two springs close — fields OVERLAP, breeding a blend niche between them
  overlap(sim) {
    sim.addGenerator({ x: 72, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 88, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    return [[72, 50], [88, 50]];
  },
  // three elements incl. a humus vein — the full garden
  triad(sim) {
    sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
    return [[55, 50], [95, 50]];
  },
  // a mosaic: six small mixed springs spread out — maximize overlap boundaries
  mosaic(sim) {
    const pts = [[50, 38, E.LUM], [110, 38, E.MIN], [80, 30, E.HUM], [50, 66, E.MIN], [110, 66, E.LUM], [80, 72, E.HUM]];
    for (const [x, y, el] of pts) sim.addGenerator({ x, y, el, rate: 5, proj: 'radial', radius: 12 });
    return pts.filter(p => p[2] !== E.HUM).map(p => [p[0], p[1]]);
  },
  // the garden, then hunters introduced into the lumen colony at tick 400
  hunters(sim) {
    sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
    return [[55, 50], [95, 50]];
  },
};
const HOOK = {
  // a player actively wielding the ⚔ tool — keeping a predator guild alive with periodic re-seeds, since a
  // single fire-and-forget hunter pack fades (and its keystone diversity benefit fades with it).
  hunters(sim, t) { if (t >= 400 && t % 300 === 0) for (let i = 0; i < 4; i++) sim.dropPredator(54 + i % 3, 49 + (i / 3 | 0)); },
};

const SEEDS = [7, 11, 23], TICKS = 2000;
function trial(name, seed) {
  const sim = E.makeSim(seed);
  const seeds = STRATS[name](sim);
  for (let k = 0; k < 40; k++) { sim.field.diffuse(); E.depositGenerators(sim.field, sim.gens); } // prebuild gradient
  for (const [x, y] of seeds) sim.dropPrimer(x, y);
  let peakSoil = 0, peakAlive = 0;
  const hook = HOOK[name];
  for (let t = 1; t <= TICKS; t++) {
    sim.tick();
    if (hook) hook(sim, t);
    if (t % 50 === 0) {
      const soil = sim.field.soilTotal(); if (soil > peakSoil) peakSoil = soil;
      const a = sim.life.list.reduce((n, e) => n + (e.alive ? 1 : 0), 0); if (a > peakAlive) peakAlive = a;
    }
  }
  const sc = E.score(sim);
  const alive = sim.life.list.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
  return { diversity: sc.diversity, order: sc.order, throughput: sc.throughput, flourish: sc.flourish, alive, peakAlive, peakSoil, finalSoil: sim.field.soilTotal() };
}
function avg(name) {
  const rs = SEEDS.map(s => trial(name, s));
  const m = k => rs.reduce((a, r) => a + r[k], 0) / rs.length;
  return { name, diversity: m('diversity'), order: m('order'), throughput: m('throughput'), flourish: m('flourish'), alive: m('alive'), peakAlive: m('peakAlive'), peakSoil: m('peakSoil'), finalSoil: m('finalSoil') };
}

console.log('=== eddy · strategy bake-off (2000 ticks, mean of seeds 7/11/23) ===');
console.log('strategy | diversity | order | burn | FLOURISH | alive(peak) | soil peak→final');
const rows = Object.keys(STRATS).map(avg).sort((a, b) => b.flourish - a.flourish);
for (const r of rows) {
  console.log(
    r.name.padEnd(8) + ' | ' +
    r.diversity.toFixed(1).padStart(9) + ' | ' +
    r.order.toFixed(0).padStart(5) + ' | ' +
    r.throughput.toFixed(2).padStart(4) + ' | ' +
    r.flourish.toFixed(0).padStart(8) + ' | ' +
    (r.alive.toFixed(0) + '(' + r.peakAlive.toFixed(0) + ')').padStart(11) + ' | ' +
    (r.peakSoil.toFixed(0) + '→' + r.finalSoil.toFixed(0)).padStart(13));
}
const fl = rows.map(r => r.flourish), hi = Math.max.apply(null, fl), lo = Math.min.apply(null, fl);
const dv = rows.map(r => r.diversity), dhi = Math.max.apply(null, dv), dlo = Math.min.apply(null, dv);
console.log('—');
console.log('flourish spread: ' + lo.toFixed(0) + '..' + hi.toFixed(0) + ' (' + (hi / lo).toFixed(2) + '× best/worst) · diversity ' +
  dlo.toFixed(1) + '..' + dhi.toFixed(1) + ' (' + (dhi / dlo).toFixed(2) + '×)');
console.log('verdict: ' + (hi / lo > 1.5
  ? 'choices MATTER — a thoughtful layout outscores a lazy one by ' + (hi / lo).toFixed(1) + '×'
  : 'choices barely move the score (' + (hi / lo).toFixed(2) + '×) — the world flourishes regardless; the incentive layer is weak'));
