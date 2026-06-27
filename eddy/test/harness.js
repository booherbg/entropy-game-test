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
  // ALL the layered state must survive the round-trip — terrain, rot, lignin, and the crack trait,
  // not just the base field. (these were each wired into serialize separately; this catches a dropped one.)
  const s = E.makeSim(7);
  s.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  s.addGenerator({ x: 75, y: 50, el: E.HUM, rate: 10, proj: 'radial', radius: 14 });
  for (let d = -8; d <= 8; d++) s.paintRock(40, 50 + d, true); // terrain
  for (let k = 0; k < 40; k++) { s.field.diffuse(); E.depositGenerators(s.field, s.gens); }
  s.dropPrimer(55, 50); s.setCompounds(true);
  for (let t = 0; t < 700; t++) s.tick();   // grow lignin + crackers
  s.dropRot(55, 50); for (let t = 0; t < 10; t++) s.tick(); // and an active rot
  const r = E.deserializeSim(JSON.parse(JSON.stringify(s.serialize())));
  const sumA = (a) => { let x = 0; for (let i = 0; i < a.length; i++) x += a[i]; return x; };
  approx(sumA(r.field.barrier), sumA(s.field.barrier), 1e-6, 'terrain (rock) survives the round-trip');
  approx(sumA(r.field.rot), sumA(s.field.rot), 1e-3, 'the rot survives the round-trip');
  approx(sumA(r.field.locked), sumA(s.field.locked), 1e-3, 'lignin (locked humus) survives the round-trip');
  const crackSum = (life) => life.list.filter(e => e.alive).reduce((x, e) => x + (e.crack || 0), 0);
  approx(crackSum(r.life), crackSum(s.life), 1e-3, 'the crack trait survives the round-trip (a saved white-rot world stays white-rot)');
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

(function testChronicleNamesCascades() {
  // the SOC avalanches the criticality analysis measured should be NARRATED — a big extinction wave
  // above the world's churn becomes a 'cascade' event (the first, a pinned milestone). seed 23 to 2000.
  const sim = E.makeSim(23);
  sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
  for (let k = 0; k < 40; k++) { sim.field.diffuse(); E.depositGenerators(sim.field, sim.gens); }
  sim.dropPrimer(55, 50); sim.dropPrimer(95, 50);
  const chr = E.makeChronicle();
  for (let t = 1; t <= 2000; t++) { sim.tick(); if (t % 20 === 0) chr.observe(sim, t); }
  const cascades = chr.events.filter(e => e.kind === 'cascade' || (e.kind === 'milestone' && /cascade/.test(e.text)));
  console.log(`   [chronicle] cascades narrated: ${cascades.length}${cascades.length ? ' — e.g. "' + cascades[0].text + '"' : ''}`);
  ok(cascades.length >= 1, 'a cascade (an extinction avalanche above baseline) is named — the SOC drama, made felt');
})();

(function testChroniclePackRises() {
  // with the predator redesign on, hunters cross from a lone predator into a real GUILD — the chronicle names
  // it (a once-only "pack has risen" milestone), and main maps that to Leopold's wolves-on-the-mountain murmur.
  const sim = E.makeSim(7);
  sim.setRichKill(true); sim.setEatTradeoff(0.45);
  sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 9, proj: 'radial', radius: 20, reservoir: 1e9, r0: 1e9 });
  sim.addGenerator({ x: 100, y: 52, el: E.MIN, rate: 9, proj: 'radial', radius: 20, reservoir: 1e9, r0: 1e9 });
  sim.dropPrimer(60, 50); sim.dropPrimer(100, 52);
  const chr = E.makeChronicle();
  for (let t = 1; t <= 1200; t++) { sim.tick(); if (t % 20 === 0) chr.observe(sim, t); }
  const pack = chr.milestones.find(e => /pack has risen/.test(e.text));
  console.log(`   [chronicle] pack milestone: ${pack ? '"' + pack.text + '"' : 'NONE'}`);
  ok(!!pack && /pack/.test(pack.text), 'the chronicle names the pack — hunters crossing into a guild (predation is a force; the keyword main maps to a murmur)');
  ok(/leopold/.test((E.Content.murmur(12).by || '').toLowerCase()), 'the predator voice (Leopold, thinking like a mountain) sits at the mapped murmur index — the pack summons it');
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

(function testFoodWebReadsTheGuilds() {
  // E.foodWeb resolves the living world into its trophic guilds (producers / decomposers / hunters) — the
  // data behind a "who eats whom" reading. A matured 3-spring world should show producers AND decomposers.
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
  for (let k = 0; k < 40; k++) { sim.field.diffuse(); E.depositGenerators(sim.field, sim.gens); }
  sim.dropPrimer(55, 50); sim.dropPrimer(95, 50);
  for (let t = 0; t < 900; t++) sim.tick();
  const fw = E.foodWeb(sim);
  console.log(`   [foodweb] lumen ${fw.lumen} · mineral ${fw.mineral} · decomposers ${fw.decomposers} · hunters ${fw.hunters} (total ${fw.total})`);
  ok(fw.lumen + fw.mineral + fw.decomposers === fw.total, 'every living thing is resolved into exactly one guild');
  ok(fw.lumen > 0 && fw.mineral > 0, 'both producer guilds are read from the two springs');
  ok(fw.decomposers > 0, 'the decomposer guild (arisen from waste) is read');
  ok(fw.links.length >= 3, 'the food-web links (the flows carrying matter) are listed');
  // with compounds, the white-rot/cracker guild shows up in the food web too
  const cs = E.makeSim(7);
  cs.addGenerator({ x: 75, y: 50, el: E.HUM, rate: 10, proj: 'radial', radius: 14 });
  cs.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  for (let k = 0; k < 40; k++) { cs.field.diffuse(); E.depositGenerators(cs.field, cs.gens); }
  cs.dropPrimer(55, 50); cs.setCompounds(true);
  for (let t = 0; t < 2000; t++) cs.tick();
  const fwc = E.foodWeb(cs);
  ok(fwc.crackers > 0 && /white-rot/.test(fwc.links.join(' ')), 'the white-rot guild is read into the food web once it evolves');
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

(function testKeystonePredationRaisesDiversity() {
  // Paine 1966: a predator that crops the dominant competitor raises diversity. Sustained hunting should
  // lift the niche count vs the same world left unhunted. Averaged over two seeds (back-half mean) so the
  // assertion locks in the mechanism, not a lucky world.
  function backHalfDiversity(seed, hunt) {
    const sim = E.makeSim(seed);
    sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
    for (let k = 0; k < 40; k++) { sim.field.diffuse(); E.depositGenerators(sim.field, sim.gens); }
    sim.dropPrimer(55, 50); sim.dropPrimer(95, 50);
    let sum = 0, n = 0;
    for (let t = 1; t <= 2000; t++) {
      sim.tick();
      if (hunt && t >= 400 && t % 300 === 0) for (let i = 0; i < 4; i++) sim.dropPredator(54 + i % 3, 49 + (i / 3 | 0));
      if (t >= 1000 && t % 20 === 0) { const live = sim.life.list.filter(e => e.alive); sum += new Set(live.map(E.speciesKey)).size; n++; }
    }
    return sum / n;
  }
  const noHunt = backHalfDiversity(7, false) + backHalfDiversity(23, false);
  const hunt = backHalfDiversity(7, true) + backHalfDiversity(23, true);
  console.log(`   [keystone] sustained-hunters diversity ${(hunt / 2).toFixed(1)} vs unhunted ${(noHunt / 2).toFixed(1)}`);
  ok(hunt > noHunt, 'keystone predation raises diversity — cropping the dominant frees rarer niches (Paine 1966)');
})();

require('../js/advisor.js');
(function testAdvisorReadsTheWorld() {
  const valid = a => a && ['warn', 'tip', 'good'].includes(a.level) && typeof a.text === 'string' && a.text.length > 0;
  // empty world → place-a-spring tip
  const a0 = E.advise(E.makeSim(7));
  ok(valid(a0) && /bare|spring/.test(a0.text), 'advisor on an empty world says to place a spring');
  // one-element world to maturity → that guild crowds → a tip naming it (the keystone/palette lesson)
  const mono = E.makeSim(7);
  mono.addGenerator({ x: 80, y: 50, el: E.LUM, rate: 10, proj: 'radial', radius: 18 });
  for (let k = 0; k < 40; k++) { mono.field.diffuse(); E.depositGenerators(mono.field, mono.gens); }
  mono.dropPrimer(80, 50);
  for (let t = 0; t < 900; t++) mono.tick();
  const am = E.advise(mono);
  console.log(`   [advisor] mono → ${am.level}: ${am.text}`);
  ok(valid(am) && am.level === 'tip' && /lumen/.test(am.text), 'advisor flags a one-element world as crowded (a tip)');
  // full garden to maturity → balanced web → a 'good' reading of the emergence
  const gar = E.makeSim(7);
  gar.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  gar.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  gar.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
  for (let k = 0; k < 40; k++) { gar.field.diffuse(); E.depositGenerators(gar.field, gar.gens); }
  gar.dropPrimer(55, 50); gar.dropPrimer(95, 50);
  for (let t = 0; t < 1200; t++) gar.tick();
  const ag = E.advise(gar);
  console.log(`   [advisor] garden → ${ag.level}: ${ag.text}`);
  ok(valid(ag) && ag.level === 'good', 'advisor reads a mature garden as flourishing (good)');
  // an established world whose finite spring is nearly dry → a warning (highest priority over tips)
  gar.gens[0].r0 = 4000; gar.gens[0].reservoir = 4000 * 0.1;
  const aw = E.advise(gar);
  ok(valid(aw) && aw.level === 'warn' && /dry|fade|quiet/.test(aw.text), 'advisor warns when a spring runs dry (its niche will fade)');
  // a compounds world piling up lignin → the advisor explains the maturation (a white-rot cracker is coming)
  const cw = E.makeSim(7);
  cw.addGenerator({ x: 75, y: 50, el: E.HUM, rate: 10, proj: 'radial', radius: 14 });
  cw.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  for (let k = 0; k < 40; k++) { cw.field.diffuse(); E.depositGenerators(cw.field, cw.gens); }
  cw.dropPrimer(55, 50); cw.setCompounds(true);
  for (let t = 0; t < 700; t++) cw.tick();
  const ac = E.advise(cw);
  console.log(`   [advisor] compounds → ${ac.level}: ${ac.text}`);
  ok(valid(ac) && /lignin|white-rot/.test(ac.text), 'advisor explains lignin/white-rot once compounds accumulate (legibility of the new system)');
})();

(function testRotConservesAndFirebreaks() {
  // the rot is the antagonist: it destroys biomass into humus (conserved) and SWEEPS a uniform world, but
  // is FIREBROKEN by diversity — a fire of one guild's type can't cross into another (Elton: variety shields).
  // (a) conservation in a closed system (no springs)
  const f = E.makeField(E.makeRng(3)), life = E.makeLife(E.makeRng(3));
  for (let i = 0; i < 160; i++) { const x = 70 + (i % 14), y = 44 + ((i / 14) | 0); f.add(E.idx(x, y), E.LUM, 1.4); }
  for (let i = 0; i < 40; i++) { const e = life.spawnFromPrimer(f, 70 + (i % 14), 44 + ((i / 14) | 0), 0); e.biomass = 1.0; }
  const tot = () => { let s = 0; for (let i = 0; i < E.W * E.H; i++) s += f.el[i * 3] + f.el[i * 3 + 1] + f.el[i * 3 + 2]; for (const e of life.list) if (e.alive) s += e.biomass; return s + life.dissipated() + f.soilTotal(); };
  const before = tot(); life.seedRot(f, 76, 46, 6); for (let t = 0; t < 120; t++) life.step(f);
  approx(tot(), before, 1e-2, 'the rot conserves matter — the biomass it destroys reappears as humus');
  // (b) firebreak: a monoculture is swept far harder than a diverse, patchy world
  function culled(setup, sx, sy) {
    const s = E.makeSim(7); setup(s);
    for (let k = 0; k < 40; k++) { s.field.diffuse(); E.depositGenerators(s.field, s.gens); }
    for (const g of s.gens) s.dropPrimer(g.x, g.y);
    for (let t = 0; t < 800; t++) s.tick();
    const a0 = s.life.list.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
    s.dropRot(sx, sy); s.dropRot(sx + 1, sy); s.dropRot(sx, sy + 1);
    let lo = a0; for (let t = 0; t < 240; t++) { s.tick(); lo = Math.min(lo, s.life.list.reduce((n, e) => n + (e.alive ? 1 : 0), 0)); }
    return (a0 - lo) / a0 * 100;
  }
  const mono = culled(s => s.addGenerator({ x: 80, y: 50, el: E.LUM, rate: 14, proj: 'radial', radius: 14 }), 80, 50);
  const div = culled(s => { s.addGenerator({ x: 68, y: 50, el: E.LUM, rate: 9, proj: 'radial', radius: 13 }); s.addGenerator({ x: 92, y: 50, el: E.MIN, rate: 9, proj: 'radial', radius: 13 }); s.addGenerator({ x: 80, y: 33, el: E.HUM, rate: 6, proj: 'vein', angle: 0.4, length: 26 }); }, 68, 50);
  console.log(`   [rot] monoculture ${mono.toFixed(0)}% culled vs diverse ${div.toFixed(0)}% — diversity is a firebreak`);
  ok(mono > div + 15, 'the rot sweeps a monoculture but diversity firebreaks it (Elton: variety is a shield)');
})();

(function testSpontaneousRotSparesDiversity() {
  // with auto-rot ON, a MONOCULTURE rots from within (the antagonist strikes unbidden) but a DIVERSE world
  // is never touched — the gate (one guild > 85% of life) that protects a healthy world, and (off by
  // default) keeps every measured baseline byte-identical.
  function peakRot(setup, on) {
    const s = E.makeSim(7); setup(s);
    for (let k = 0; k < 40; k++) { s.field.diffuse(); E.depositGenerators(s.field, s.gens); }
    for (const g of s.gens) s.dropPrimer(g.x, g.y);
    s.setAutoRot(on);
    let peak = 0;
    for (let t = 0; t < 1500; t++) { s.tick(); const r = s.field.rotTotal(); if (r > peak) peak = r; }
    return peak;
  }
  const mono = peakRot(s => s.addGenerator({ x: 80, y: 50, el: E.LUM, rate: 12, proj: 'radial', radius: 16 }), true);
  const div = peakRot(s => { s.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 }); s.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 }); s.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 }); }, true);
  console.log(`   [auto-rot] monoculture peak rot ${mono.toFixed(0)} vs diverse ${div.toFixed(0)} (diverse must be 0)`);
  ok(mono > 0, 'a monoculture rots from within when auto-rot is on (the antagonist strikes unbidden)');
  ok(div === 0, 'a diverse world is never spontaneously rotted — the gate spares it (and the baseline)');
})();

(function testTerrainShapesFlowAndFirebreaks() {
  // terrain (rock): basins concentrate material, a rock wall firebreaks the rot, and — load-bearing — an
  // empty terrain layer leaves diffusion byte-identical (so every measured baseline is untouched).
  const a = E.makeField(E.makeRng(9)), b = E.makeField(E.makeRng(9));
  for (let t = 0; t < 40; t++) { a.diffuse(); b.diffuse(); }
  let same = true; for (let i = 0; i < E.W * E.H * E.NEL; i++) if (a.el[i] !== b.el[i]) { same = false; break; }
  ok(same, 'an empty terrain layer leaves diffusion byte-identical (baseline safe)');
  function footprint(withBasin) {
    const f = E.makeField(E.makeRng(5)), gens = [{ x: 80, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 10 }];
    if (withBasin) for (let d = -9; d <= 9; d++) for (const [x, y] of [[80 + d, 41], [80 + d, 59], [71, 50 + d], [89, 50 + d]]) if (x >= 0 && y >= 0 && x < E.W && y < E.H) f.barrier[E.idx(x, y)] = 1;
    for (let t = 0; t < 200; t++) { f.diffuse(); E.depositGenerators(f, gens); }
    let s = 0; for (let y = 42; y <= 58; y++) for (let x = 72; x <= 88; x++) s += f.get(E.idx(x, y), E.LUM); return s;
  }
  const basinM = footprint(true), openM = footprint(false);
  console.log(`   [terrain] basin pools ${(basinM / openM).toFixed(1)}x the material of open ground`);
  ok(basinM > openM * 1.3, 'a rock basin pools material richer than open ground (where matters more)');
  const f = E.makeField(E.makeRng(2)), life = E.makeLife(E.makeRng(2));
  for (let x = 60; x <= 100; x++) for (let y = 46; y <= 54; y++) { if (x === 80) continue; f.add(E.idx(x, y), E.LUM, 1.0); const e = life.spawnFromPrimer(f, x, y, 0); e.biomass = 1.0; }
  for (let y = 40; y <= 60; y++) f.barrier[E.idx(80, y)] = 1; // a wall down the middle
  life.seedRot(f, 64, 50, 6);                                 // light the rot on the LEFT
  for (let t = 0; t < 120; t++) life.step(f);
  let right = 0; for (let y = 40; y <= 60; y++) for (let x = 81; x <= 100; x++) right += f.rot[E.idx(x, y)];
  ok(right < 0.5, 'a rock wall is a firebreak — the rot cannot cross it (terrain firebreak)');
})();

(function testProceduralTerrainOpens() {
  // a fresh world arrives as a landscape: terrain is bounded (not a maze), and the opening still establishes
  // life in its basin — across seeds. mirrors main.js freshSim.
  function fresh(seed) {
    const s = E.makeSim(seed >>> 0), gx = (E.W * 0.4) | 0, gy = (E.H * 0.5) | 0;
    s.addGenerator({ x: gx, y: gy, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    E.makeTerrain(s.field, E.makeRng((seed ^ 0x2545f491) >>> 0), gx, gy);
    for (let k = 0; k < 40; k++) { s.field.diffuse(); E.depositGenerators(s.field, s.gens); }
    s.dropPrimer(gx, gy);
    let minAlive = 1e9;
    for (let t = 1; t <= 600; t++) { s.tick(); if (t > 150) minAlive = Math.min(minAlive, s.life.list.reduce((n, e) => n + (e.alive ? 1 : 0), 0)); }
    return { rock: s.field.barrier.reduce((a, b) => a + b, 0), minAlive };
  }
  let opened = 0, totalRock = 0;
  for (const seed of [12345, 22222, 98765, 7]) { const r = fresh(seed); if (r.minAlive > 0) opened++; totalRock += r.rock; }
  const avgRock = totalRock / 4;
  console.log(`   [terrain] fresh worlds: ${opened}/4 opening colonies survived; ~${avgRock.toFixed(0)} rock cells (of ${E.W * E.H})`);
  ok(opened === 4, 'every fresh world establishes its opening colony in the basin (terrain never walls it off)');
  ok(avgRock > 50 && avgRock < 1200, 'procedural terrain is bounded — a landscape, not a maze and not bare');
})();

(function testCompoundsWhiteRotChain() {
  // compounds (lignin/white-rot): recalcitrant humus locks away, and a "cracker" species EVOLVES to eat it.
  // OFF by default (baselines byte-identical); ON, the chain emerges and conserves.
  // (a) a sim with compounds OFF (default) never forms lignin, even drowning in humus
  const s0 = E.makeSim(7); s0.addGenerator({ x: 75, y: 50, el: E.HUM, rate: 10, proj: 'radial', radius: 14 });
  for (let k = 0; k < 40; k++) { s0.field.diffuse(); E.depositGenerators(s0.field, s0.gens); }
  s0.dropPrimer(75, 50);
  for (let t = 0; t < 800; t++) s0.tick();
  ok(s0.field.lockedTotal() === 0, 'compounds OFF (default) ⇒ no lignin ever forms — baselines untouched');
  // (b) lockStep conserves: humus ↔ locked, nothing created
  const f = E.makeField(E.makeRng(4));
  for (let i = 0; i < 80; i++) f.add(E.idx(60 + i % 20, 48 + (i / 20 | 0)), E.HUM, 3.0);
  const before = f.total(E.HUM) + f.lockedTotal();
  for (let t = 0; t < 50; t++) f.lockStep();
  ok(f.lockedTotal() > 0, 'lignin forms where humus piles high');
  approx(f.total(E.HUM) + f.lockedTotal(), before, 1e-2, 'lignin is conserved (field humus ↔ locked, nothing created)');
  // (c) the chain: compounds ON → the crack trait EVOLVES upward, a white-rot guild arises on the lignin
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 75, y: 50, el: E.HUM, rate: 10, proj: 'radial', radius: 14 });
  for (let k = 0; k < 40; k++) { sim.field.diffuse(); E.depositGenerators(sim.field, sim.gens); }
  sim.dropPrimer(55, 50); sim.dropPrimer(95, 50);
  sim.setCompounds(true);
  let maxCrack = 0;
  for (let t = 1; t <= 2500; t++) { sim.tick(); if (t % 100 === 0) for (const e of sim.life.list) if (e.alive && (e.crack || 0) > maxCrack) maxCrack = e.crack; }
  const crackers = sim.life.list.filter(e => e.alive && (e.crack || 0) > 0.2).length;
  console.log(`   [compounds] crack evolved to ${maxCrack.toFixed(2)}, ${crackers} crackers on the lignin`);
  ok(maxCrack > 0.4, 'the crack trait evolves upward under selection — a white-rot specialist arises on the lignin');
  ok(crackers > 3, 'a cracker guild establishes — the food web extends onto the locked resource');
})();

(function testSymbiogenesis() {
  // Margulis: two complementary creatures sharing a cell can MERGE into a composite that eats both — a new
  // kind, more than its sum. The symb trait evolves where the merger pays (the overlap). Off by default.
  // (a) conservation (closed world): the merge sums biomass, creates nothing
  const f = E.makeField(E.makeRng(3)), life = E.makeLife(E.makeRng(3));
  life.setSymbiosis(true);
  for (let i = 0; i < 30; i++) { // a lumen-eater AND a mineral-eater in the SAME cell (so they can merge)
    const x = 70 + (i % 10), y = 48 + ((i / 10) | 0);
    f.add(E.idx(x, y), E.LUM, 2.0); f.add(E.idx(x, y), E.MIN, 2.0);
    const a = life.spawnFromPrimer(f, x, y, 0); a.biomass = 1.0; a.symb = 0.9; a.diet = new Float32Array([0.8, 0.1, 0.1]);
    const b = life.spawnFromPrimer(f, x, y, 0); b.biomass = 1.0; b.symb = 0.9; b.diet = new Float32Array([0.1, 0.8, 0.1]);
  }
  const tot = () => { let s = 0; for (let i = 0; i < E.W * E.H; i++) s += f.el[i * 3] + f.el[i * 3 + 1] + f.el[i * 3 + 2]; for (const e of life.list) if (e.alive) s += e.biomass; return s + life.dissipated() + f.soilTotal(); };
  const before = tot();
  let merged = false;
  for (let t = 0; t < 40; t++) { life.step(f); if (!merged && life.list.some(e => e.alive && e.composite)) merged = true; }
  ok(merged, 'complementary creatures merge into a composite (symbiogenesis happens)');
  approx(tot(), before, 1e-2, 'the merge conserves matter — a composite is the sum of its partners, nothing created');
  // (b) off by default → no composites ever; (c) on → composites emerge and symb evolves (overlapping springs)
  function run(on) {
    const s = E.makeSim(7);
    s.addGenerator({ x: 74, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 17 });
    s.addGenerator({ x: 86, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 17 });
    for (let k = 0; k < 40; k++) { s.field.diffuse(); E.depositGenerators(s.field, s.gens); }
    s.dropPrimer(74, 50); s.dropPrimer(86, 50);
    if (on) s.setSymbiosis(true);
    let maxComp = 0, maxSymb = 0;
    for (let t = 1; t <= 600; t++) { s.tick(); if (t % 100 === 0) { let c = 0, ms = 0; for (const e of s.life.list) if (e.alive) { if (e.composite) c++; if ((e.symb || 0) > ms) ms = e.symb; } if (c > maxComp) maxComp = c; if (ms > maxSymb) maxSymb = ms; } }
    return { maxComp, maxSymb };
  }
  const off = run(false), on = run(true);
  console.log(`   [symbiosis] off: ${off.maxComp} composites | on: ${on.maxComp} composites, symb→${on.maxSymb.toFixed(2)}`);
  ok(off.maxComp === 0, 'symbiosis OFF (default) ⇒ no composites — baselines untouched');
  ok(on.maxComp > 5 && on.maxSymb > 0.6, 'composite life emerges at the overlap and the symb trait evolves to favour partnership');
})();

(function testPredatorRedesign() {
  // the predator redesign (opt-in; OFF ⇒ legacy nibble, baselines byte-identical). a TRUE kill + a grazing
  // tradeoff let a creature LIVE BY THE KILL: the old donor-controlled nibble could crop prey but never feed
  // a hunter, so an obligate predator was impossible. ON ⇒ a downed prey is killed (removed, a windfall) and
  // a hunter can breed from kills, so a predator guild sustains and — Paine 1966 — raises diversity.

  // (1) the kill mechanic, isolated and exact: OFF nibbles (prey survives at the floor), ON kills (removes it)
  function killTest(richKill) {
    const f = E.makeField(E.makeRng(20)), life = E.makeLife(E.makeRng(20));
    if (richKill) { life.setRichKill(true); life.setEatTradeoff(0.45); }
    const h = life.spawnFromPrimer(f, 50, 50); h.pred = 1.0; h.biomass = 1.5;
    const pr = life.spawnFromPrimer(f, 50, 50); pr.pred = 0.0; pr.biomass = 0.5; // small prey → one decisive strike
    const tot = () => f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM) + life.list.filter(e => e.alive).reduce((s, e) => s + e.biomass, 0);
    const before = tot();
    life.step(f);
    return { preyAlive: pr.alive, drift: Math.abs(tot() + life.dissipated() - before) };
  }
  const kOff = killTest(false), kOn = killTest(true);
  ok(kOff.preyAlive, 'redesign OFF ⇒ a strike only nibbles, the prey survives at the floor (legacy grazing — baseline intact)');
  ok(!kOn.preyAlive, 'redesign ON ⇒ a decisive strike KILLS the prey (a real kill: removed, not grazed)');
  ok(kOn.drift < 1e-2, 'the kill conserves matter (carcass → predator biomass + humus + the upkeep sink)');

  // (2) the guild: with the same seed of hunters, does a self-sustaining predator guild establish over a long
  // run? OFF the legacy nibble can't feed them and they fade; ON they live by the kill and hold a guild.
  // (measured over a long horizon, not a single snapshot — injected hunters boom-and-bust before they settle.)
  const H = s => s.life.list.reduce((n, e) => n + (e.alive && (e.pred || 0) > 0.4 ? 1 : 0), 0);
  const D = s => { const set = new Set(); for (const e of s.life.list) if (e.alive) set.add(E.speciesKey(e)); return set.size; };
  function guild(richKill) {
    const s = E.makeSim(7);
    if (richKill) { s.setRichKill(true); s.setEatTradeoff(0.45); }
    s.addGenerator({ x: 70, y: 50, el: E.LUM, rate: 9, proj: 'radial', radius: 20, reservoir: 1e9, r0: 1e9 });
    s.addGenerator({ x: 90, y: 50, el: E.MIN, rate: 9, proj: 'radial', radius: 20, reservoir: 1e9, r0: 1e9 });
    s.dropPrimer(70, 50); s.dropPrimer(90, 50);
    for (let t = 0; t < 400; t++) s.tick();
    for (let i = 0; i < 6; i++) s.dropPredator(80, 50); // a starting seed of hunters (the ⚔ tool / organic drift)
    for (let t = 400; t < 1600; t++) s.tick();          // long enough to pass the boom-bust transient and settle
    return { end: H(s), div: D(s) };
  }
  const gOff = guild(false), gOn = guild(true);
  console.log(`   [predators] guild after 1600t — OFF (nibble) ${gOff.end} hunters · ON (kill) ${gOn.end} hunters | diversity ${gOff.div}→${gOn.div}`);
  ok(gOn.end > 12 && gOn.end > gOff.end, 'redesign ON ⇒ an obligate-predator guild sustains itself by the kill (the long-deferred blocker, resolved)');
  ok(gOn.div > gOff.div, 'redesign ON ⇒ the real kill keeps predation a keystone — the hunted world is more diverse (Paine 1966)');
})();

(function testGaiaHomeostasis() {
  // Gaia / Daisyworld (opt-in): under a steady warming FORCING, life should evolve its albedo to hold the
  // CLIME near the habitable optimum — homeostasis emerging from selfish local growth, no global coordination.
  // OFF ⇒ albedo never drifts (stays exactly 0.5) and the clime is inert → baselines byte-identical.
  function world(gaia, forcing) {
    const s = E.makeSim(7);
    if (gaia) { s.setGaia(true); s.setClimeForcing(forcing); }
    s.addGenerator({ x: 70, y: 50, el: E.LUM, rate: 9, proj: 'radial', radius: 20, reservoir: 1e9, r0: 1e9 });
    s.addGenerator({ x: 90, y: 50, el: E.MIN, rate: 9, proj: 'radial', radius: 20, reservoir: 1e9, r0: 1e9 });
    s.dropPrimer(70, 50); s.dropPrimer(90, 50);
    for (let t = 0; t < 4000; t++) s.tick();
    let alive = 0, drift = 0; for (const e of s.life.list) if (e.alive) { alive++; if (Math.abs((e.albedo != null ? e.albedo : 0.5) - 0.5) > 1e-9) drift++; }
    return { clime: s.clime(), alive, drift };
  }
  // (a) OFF: the clime never moves and no albedo ever drifts — the baseline is untouched
  const off = world(false, 0);
  ok(off.clime === 0.5 && off.drift === 0, 'Gaia OFF (default) ⇒ clime inert at 0.5 and albedo never drifts — baselines untouched');
  // (b) ON, warming: the forcing would drive the clime to 0.5 + 0.0004*4000 = 2.1 unregulated; life holds it
  const warm = world(true, 0.0004);
  const unregulated = 0.5 + 0.0004 * 4000;
  console.log(`   [gaia] warming forcing would reach clime ${unregulated.toFixed(1)} unregulated — life held it at ${warm.clime.toFixed(2)} (${warm.alive} alive, ${warm.drift} with drifted albedo)`);
  ok(unregulated > 1.5, 'sanity: the chosen forcing really would run the clime away without life');
  ok(Math.abs(warm.clime - 0.5) < 0.2 && warm.alive > 40, 'Gaia ON ⇒ life regulates the clime near the optimum against the forcing, and survives — homeostasis emerges (Daisyworld, Lovelock & Watson)');
  ok(warm.drift > 0, 'Gaia ON ⇒ albedo evolves (life tunes its reflectivity — the mechanism of the regulation)');
  // (c) the canon: the Gaia milestone maps to Lovelock's voice
  ok(/lovelock/.test((E.Content.murmur(13).by || '').toLowerCase()), 'the Gaia voice (Lovelock, 1979) sits at the mapped murmur index — the regulation summons it');
})();

(function testFullIntegration() {
  // everything at once — terrain, auto-rot, hunters, the economy, the chronicle — must coexist for a long
  // run with no NaN, no crash, no collapse. the cross-feature safety net the per-mechanic tests can't give.
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
  for (let d = -10; d <= 10; d++) sim.paintRock(72, 50 + d, true); // a ridge through the world
  for (let k = 0; k < 40; k++) { sim.field.diffuse(); E.depositGenerators(sim.field, sim.gens); }
  sim.dropPrimer(55, 50); sim.dropPrimer(95, 50);
  sim.setAutoRot(true);
  if (sim.setRichKill) { sim.setRichKill(true); sim.setEatTradeoff(0.45); } // the full live flag-set, all at once
  if (sim.setSymbiosis) sim.setSymbiosis(true);
  if (sim.setCompounds) sim.setCompounds(true);
  if (sim.setGaia) { sim.setGaia(true); sim.setClimeForcing(0.0002); }
  const eco = E.makeEconomy ? E.makeEconomy() : null, chr = E.makeChronicle ? E.makeChronicle() : null;
  for (let t = 1; t <= 2000; t++) {
    sim.tick();
    if (t === 500) for (let i = 0; i < 4; i++) sim.dropPredator(54 + i % 3, 49 + (i / 3 | 0));
    if (t === 900) sim.dropRot(95, 50); // and a player-loosed rot mid-run
    if (eco) eco.income(sim);
    if (chr && t % 20 === 0) chr.observe(sim, t);
  }
  let nan = false;
  for (let i = 0; i < sim.field.el.length; i++) if (!isFinite(sim.field.el[i])) { nan = true; break; }
  for (const e of sim.life.list) if (e.alive && !isFinite(e.biomass)) nan = true;
  const alive = sim.life.list.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
  const sc = E.score ? E.score(sim) : { diversity: 0 };
  console.log(`   [integration] 2000 ticks, every system live: alive ${alive}, diversity ${sc.diversity}, finite ${!nan}`);
  ok(!nan, 'no NaN/Inf anywhere after 2000 ticks with every mechanic active at once');
  ok(alive > 5 && alive < 4000, 'the full integrated world stays alive and bounded');
  ok(sc.diversity >= 3, 'diversity persists through terrain + rot + predation + economy together');
})();

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails ? 1 : 0);
