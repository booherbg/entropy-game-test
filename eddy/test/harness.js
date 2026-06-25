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

const LIFE = require('../js/life.js');

(function testPrimerLatchesToLocalBlend() {
  const f = E.makeField(E.makeRng(3));
  const c = E.idx(40, 40);
  f.add(c, E.MIN, 50); // make this spot strongly mineral
  const life = E.makeLife(E.makeRng(3));
  const ent = life.spawnFromPrimer(f, 40, 40);
  ok(ent && ent.alive, 'primer spawns a living entity');
  ok(ent.diet[E.MIN] > ent.diet[E.LUM] && ent.diet[E.MIN] > ent.diet[E.HUM],
     'latched: diet favours the locally abundant element (mineral)');
})();

(function testMetabolismConserves() {
  const f = E.makeField(E.makeRng(5));
  const c = E.idx(40, 40);
  f.add(c, E.LUM, 20);
  const life = E.makeLife(E.makeRng(5));
  const ent = life.spawnFromPrimer(f, 40, 40); // lumen-eater
  const fieldBefore = f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM);
  const bioBefore = ent.biomass;
  life.step(f);
  const fieldAfter = f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM);
  const bioAfter = ent.biomass;
  approx((fieldAfter - fieldBefore) + (bioAfter - bioBefore) + life.dissipated(), 0, 1e-4,
         'books balance with the sink: field loss == biomass gain + dissipated upkeep (Mode-1)');
  ok(bioAfter > bioBefore, 'a fed entity gains biomass');
  ok(f.get(c, E.HUM) > 0, 'it excreted humus into its cell (waste = future food)');
})();

(function testDeathMineralizesAndConserves() {
  const f = E.makeField(E.makeRng(8));
  const c = E.idx(40, 40);
  const life = E.makeLife(E.makeRng(8));
  const ent = life.spawnFromPrimer(f, 40, 40);
  ent.biomass = 0.03; // about to starve
  // empty its cell so it cannot eat, forcing starvation
  for (let k = 0; k < E.NEL; k++) f.add(c, k, -f.get(c, k));
  // measure the baseline AFTER the artificial emptying, so only the death step's
  // matter movement (biomass → humus) is under test
  const totalBefore = f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM) + ent.biomass;
  life.step(f); life.step(f);
  ok(!ent.alive, 'a starved entity dies');
  const totalAfter = f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM)
                   + life.list.filter(e => e.alive).reduce((s, e) => s + e.biomass, 0);
  // the books balance WITH the sink: upkeep dissipates (energy leaves as heat), death returns
  // any remainder to humus — nothing vanishes unaccounted.
  approx(totalAfter + life.dissipated(), totalBefore, 1e-3,
         'books balance with the dissipation sink (field + biomass + dissipated == before)');
})();

(function testReplication() {
  const f = E.makeField(E.makeRng(9));
  // very rich so the parent stays fed across the window (this isolated test has no diffusion refill)
  for (let n = 0; n < E.W * E.H; n++) f.add(n, E.LUM, 50);
  const life = E.makeLife(E.makeRng(9));
  life.spawnFromPrimer(f, 80, 50);
  for (let s = 0; s < 50; s++) life.step(f);
  ok(life.list.filter(e => e.alive).length > 1, 'a well-fed colony self-replicates');
})();

const FERT = require('../js/fertility.js');
(function testFertilitySparksLifeInSurplus() {
  const f = E.makeField(E.makeRng(2));
  for (let n = 0; n < E.W * E.H; n++) { f.add(n, E.LUM, 8); } // very fertile everywhere
  const life = E.makeLife(E.makeRng(2));
  let spawned = false;
  for (let s = 0; s < 20 && !spawned; s++) { E.fertilityStep(f, life, life._rng); spawned = life.list.length > 0; }
  ok(spawned, 'rich surplus eventually sparks life unbidden (ambient fertility)');
})();

const SIM = require('../js/sim.js');

(function testDeterministicWorld() {
  function run() {
    const sim = E.makeSim(424242);
    sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.dropPrimer(60, 50);
    for (let t = 0; t < 200; t++) sim.tick();
    return sim.hash();
  }
  ok(run() === run(), 'same seed + same moves → identical world (determinism invariant)');
})();

(function testLiveBand() {
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.dropPrimer(60, 50); sim.dropPrimer(100, 50);
  let minAlive = Infinity, maxAlive = 0;
  for (let t = 0; t < 400; t++) { sim.tick(); const a = sim.stats().alive; minAlive = Math.min(minAlive, a); maxAlive = Math.max(maxAlive, a); }
  const end = sim.stats();
  console.log(`   [live-band] end.alive=${end.alive} species=${end.speciesApprox} peakAlive=${maxAlive} minAlive=${minAlive} fieldTotal=${end.fieldTotal.toFixed(0)}`);
  ok(end.alive > 0, 'world does NOT collapse to nothing');
  ok(end.alive < 4000, 'world does NOT explode to the cap (goo)');
  ok(end.speciesApprox >= 2, 'diversity persists — at least two diets coexist (edge of chaos)');
})();

require('../js/persist.js');
(function testSerializeRoundTrip() {
  const sim = E.makeSim(11);
  sim.addGenerator({ x: 70, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 14 });
  sim.dropPrimer(70, 50);
  for (let t = 0; t < 50; t++) sim.tick();
  const snap = sim.serialize();
  const restored = E.deserializeSim(JSON.parse(JSON.stringify(snap)));
  let same = true;
  for (let i = 0; i < restored.field.el.length; i++) if (restored.field.el[i] !== sim.field.el[i]) { same = false; break; }
  ok(same, 'field survives serialize → deserialize exactly');
  ok(restored.life.list.filter(e => e.alive).length === sim.life.list.filter(e => e.alive).length,
     'life count round-trips');
  // a rehydrated sim is playable
  const sim2 = E.makeSim(0, JSON.parse(JSON.stringify(snap)));
  sim2.tick();
  ok(sim2.stats().alive >= 0 && sim2.gens.length === 1, 'a restored sim rehydrates and ticks');
})();

(function testEdgeOfChaosSweep() {
  console.log('   [sweep] seed → endAlive / peakSpecies / fieldDrift:');
  let allInBand = true;
  for (const seed of [1, 7, 42, 424242]) {
    const sim = E.makeSim(seed);
    sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.dropPrimer(60, 50); sim.dropPrimer(100, 50);
    const t0 = sim.stats().fieldTotal;
    let peakSpecies = 0;
    for (let t = 0; t < 400; t++) { sim.tick(); const sp = sim.stats().speciesApprox; if (sp > peakSpecies) peakSpecies = sp; }
    const s = sim.stats();
    const inBand = s.alive > 0 && s.alive < 4000 && s.speciesApprox >= 2;
    allInBand = allInBand && inBand;
    console.log(`   [sweep] ${seed} → ${s.alive} / ${peakSpecies} / ${(s.fieldTotal - t0).toFixed(0)} ${inBand ? 'OK' : 'OUT-OF-BAND'}`);
  }
  ok(allInBand, 'every seed ends in the live band (edge of chaos holds across seeds)');
})();

(function testLongRunDiversityHolds() {
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.dropPrimer(60, 50); sim.dropPrimer(100, 50);
  for (let t = 0; t < 1500; t++) sim.tick();
  const live = sim.life.list.filter(e => e.alive);
  const guild = [0, 0, 0];
  for (const e of live) { let d = 0; for (let k = 1; k < 3; k++) if (e.diet[k] > e.diet[d]) d = k; guild[d]++; }
  const guilds = guild.filter(g => g > 0).length;
  console.log(`   [long-run 1500] alive=${live.length} guilds(L/M/H)=${guild.join('/')}`);
  ok(live.length > 0 && live.length < 600, 'long run stays bounded by flow — no monoculture explosion (the dissipation sink holds)');
  ok(guilds >= 2, 'long run keeps ≥2 trophic guilds — the dissipative cycle stays diverse');
})();

(function testCombinatorialOverlapNiche() {
  // two overlapping springs, seeded ONLY at the pure sources — does a blend species fill the overlap?
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 72, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 18 });
  sim.addGenerator({ x: 88, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 18 });
  sim.dropPrimer(72, 50); sim.dropPrimer(88, 50);
  for (let t = 0; t < 900; t++) sim.tick();
  let blend = 0, sumX = 0;
  for (const e of sim.life.list) {
    if (e.alive && e.diet[E.LUM] > 0.28 && e.diet[E.MIN] > 0.28) { blend++; sumX += e.x; }
  }
  const meanX = blend ? sumX / blend : -1;
  console.log(`   [overlap] blend-eaters=${blend} meanX=${meanX.toFixed(1)} (springs at x=72 & x=88)`);
  ok(blend >= 3, 'a blend-diet species fills the overlap (the combinatorial niche — richness from few parts)');
  ok(meanX > 74 && meanX < 86, 'the blend species lives BETWEEN the springs — born of the overlap, not either source');
})();

(function testGeneratorDepletion() {
  const f = E.makeField(E.makeRng(1));
  const base = f.total(E.LUM);
  const g = { x: 80, y: 50, el: E.LUM, rate: 10, proj: 'radial', radius: 12, reservoir: 25 };
  for (let t = 0; t < 10; t++) E.depositGenerators(f, [g]); // would emit 100 if infinite; reservoir is 25
  approx(f.total(E.LUM) - base, 25, 1e-4, 'a finite spring emits exactly its reservoir total, then runs dry (conserved)');
  ok(g.reservoir <= 1e-9, 'the reservoir is spent');
  const afterDry = f.total(E.LUM);
  E.depositGenerators(f, [g]);
  approx(f.total(E.LUM), afterDry, 1e-9, 'a dry spring emits nothing — where & when you place a source is now a real decision');
})();

(function testSoilAccretesAndConserves() {
  const f = E.makeField(E.makeRng(4));
  const c = E.idx(50, 50);
  for (let n = 0; n < E.W * E.H; n++) f.add(n, E.HUM, 0.4); // humus piled up everywhere (life's legacy)
  const before = f.total(E.HUM) + f.soilTotal();
  for (let t = 0; t < 60; t++) f.soilStep();
  ok(f.soilTotal() > 0, 'soil accretes where humus piles up — life builds its own ground (niche construction)');
  approx(f.total(E.HUM) + f.soilTotal(), before, 1e-2, 'soil is conserved — humus locked into ground == humus drawn from the field (no matter created)');
})();

(function testPredationConserves() {
  const f = E.makeField(E.makeRng(20));
  const life = E.makeLife(E.makeRng(20));
  const pred = life.spawnFromPrimer(f, 50, 50); pred.pred = 0.8; pred.biomass = 1.0;
  const prey = life.spawnFromPrimer(f, 50, 50); prey.pred = 0.0; prey.biomass = 1.0;
  const tot = () => f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM) + life.list.filter(e => e.alive).reduce((s, e) => s + e.biomass, 0);
  const before = tot();
  life.step(f);
  ok(prey.biomass < 1.0, 'predator bit the prey (prey biomass fell)');
  ok(pred.biomass > 0.9, 'the predator is fed by the kill');
  approx(tot() + life.dissipated(), before, 1e-2, 'predation conserves matter with the sink (field + biomass + dissipated == before)');
})();

require('../js/content.js'); require('../js/chronicle.js');
(function testChronicleWitnessesEmergence() {
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.dropPrimer(60, 50); sim.dropPrimer(100, 50);
  const chr = E.makeChronicle();
  for (let t = 1; t <= 800; t++) {
    sim.tick();
    if (t === 400) for (let i = 0; i < 6; i++) sim.dropPredator(54 + i % 3, 49 + (i / 3 | 0));
    if (t % 20 === 0) chr.observe(sim, t);
  }
  const births = chr.events.filter(e => e.kind === 'born').length;
  console.log(`   [chronicle] ${chr.codex.size} species witnessed, ${births} births, ${chr.events.filter(e => e.kind === 'milestone').length} milestones, ${chr.aliveCount()} alive now`);
  ok(births >= 3, 'the chronicle witnesses species being born');
  ok(chr.codex.size >= 3, 'the codex records the species witnessed');
  ok(chr.milestones.length >= 1, 'a milestone is recorded (first hunters / first decomposer)');
})();

require('../js/score.js');
(function testScoreReflectsFlourishing() {
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.dropPrimer(60, 50); sim.dropPrimer(100, 50);
  for (let t = 0; t < 150; t++) sim.tick();
  const early = E.score(sim);
  for (let t = 0; t < 600; t++) sim.tick();
  const late = E.score(sim);
  console.log(`   [score] early flourish=${early.flourish} → late flourish=${late.flourish} (div ${late.diversity}, order ${late.order}, burn ${late.throughput})`);
  ok(late.diversity > 1 && late.order > 1, 'the score reads a living world (diversity + order > 0)');
  ok(late.flourish > early.flourish, 'flourish rises as the world develops (early < late)');
  ok(late.throughput >= 0, 'throughput (the 2nd-law flux) is tracked');
})();

require('../js/economy.js');
(function testEconomyFlow() {
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.dropPrimer(60, 50); sim.dropPrimer(100, 50);
  const eco = E.makeEconomy();
  const start = eco.flow();
  ok(eco.spend('spring') && eco.flow() < start, 'placing a spring costs flow');
  eco.set(10);
  ok(!eco.can('spring'), "can't afford a spring on an empty budget");
  eco.set(0);
  for (let t = 0; t < 700; t++) { sim.tick(); eco.income(sim); }
  ok(eco.flow() > 50, 'a flourishing world pays a flow dividend over time');
})();

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails ? 1 : 0);
