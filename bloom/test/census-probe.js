'use strict';
// PROBE (diagnostic, not an assertion suite): does a hedgerow actually split a garden into 2 species the
// census can SEE, and at what fertility threshold? Measures cluster counts across thresholds for walled vs
// unwalled two-cluster gardens, and for a plain warmStart (which should read as 1). Run: node bloom/test/census-probe.js
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim', 'census']
  .forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B, C = B.Census;

// two clusters from ONE shared ancestor (mirrors test/speciation.js), optional wall + divergent light
function build(seed, wall, diffLight) {
  const sim = B.makeSim(seed);
  const anc = B.Genome.randomPlant(sim.rng);
  const mk = (cx, cy) => { const g = B.Genome.mutate(anc, sim.rng, 1); const p = sim.plantAt(cx, cy, g); p.biomass = 0.95; p.sugar = 6; return p; };
  for (let i = 0; i < 7; i++) mk(14 + (i % 3) * 3, 22 + ((i / 3) | 0) * 5);
  for (let i = 0; i < 7; i++) mk(78 + (i % 3) * 3, 22 + ((i / 3) | 0) * 5);
  if (diffLight) for (let k = 0; k < 6; k++) { sim.field.paintLight(17, 28, 12, 1.25, 0.5); sim.field.paintLight(81, 28, 12, 0.35, 0.5); }
  if (wall) for (let y = 0; y < B.H; y++) sim.field.paintBarrier(48, y, 1.4, true);
  sim.placeColony(16, 40); sim.placeColony(82, 40);
  return sim;
}

const THS = [0.4, 0.45, 0.5, 0.55, 0.6];
function countsAcross(sim) { return THS.map(th => C.species(sim, th).count); }

console.log('\nspecies count by fertility threshold — mean over seeds 7,21,42, after 6000 ticks');
console.log('scenario'.padEnd(26) + THS.map(t => 't' + t).join('   ') + '     iso@.5  flowers');
for (const sc of [['warmStart (1 founder)', 'warm'], ['2 clusters, no wall', 'open'], ['2 clusters + WALL', 'wall'], ['2 clusters + WALL + light', 'walllight']]) {
  const seeds = [7, 21, 42];
  const acc = THS.map(() => 0); let iso = 0, fl = 0;
  for (const seed of seeds) {
    let sim;
    if (sc[1] === 'warm') { sim = B.makeSim(seed); sim.warmStart(); }
    else sim = build(seed, sc[1] === 'wall' || sc[1] === 'walllight', sc[1] === 'walllight');
    for (let t = 0; t < 6000; t++) sim.tick();
    const cs = countsAcross(sim); for (let i = 0; i < cs.length; i++) acc[i] += cs[i];
    const s = C.species(sim); iso += s.isolation; fl += s.flowers;
  }
  const mean = acc.map(a => (a / seeds.length).toFixed(1));
  console.log(sc[0].padEnd(26) + mean.map(m => String(m).padEnd(6)).join(' ') + '  ' + (iso / seeds.length).toFixed(2).padEnd(7) + (fl / seeds.length).toFixed(0));
}
console.log('\nread: warmStart should sit at ~1 species; the WALL scenarios should climb toward ~2 at a good threshold.');
