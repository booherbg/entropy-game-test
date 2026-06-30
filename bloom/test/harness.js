'use strict';
// bloom — node assertion harness. No deps. Prints PASS/FAIL; exits non-zero on any failure.
// Run: node bloom/test/harness.js
let fails = 0, total = 0;
function ok(cond, msg) { total++; console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (!cond) fails++; }
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= (eps || 1e-9), msg + ` (${a} ~ ${b})`); }
function section(name) { console.log('\n· ' + name); }

// ---- Task 1: rng + const ----
section('rng + const');
const B = require('../js/rng.js');
require('../js/const.js');

(function testRng() {
  const r1 = B.makeRng(12345), r2 = B.makeRng(12345);
  const a = [r1(), r1(), r1()], b = [r2(), r2(), r2()];
  ok(a.every((v, i) => v === b[i]), 'same seed → identical stream');
  ok(a.every(v => v >= 0 && v < 1), 'rng outputs in [0,1)');
  ok(B.makeRng(99)() !== a[0], 'different seed → different stream');
})();

(function testConst() {
  ok(B.PAL.length === 8, 'palette has 8 colours');
  ok(B.PAL.every(c => /^#[0-9a-f]{6}$/i.test(c)), 'palette entries are hex');
  ok(B.W > 0 && B.H > 0, 'world dims positive');
  ok(Math.abs(B.TAU - Math.PI * 2) < 1e-12, 'TAU = 2π');
})();

// ---- Task 2: the field ----
section('field');
require('../js/field.js');

(function testFieldChannels() {
  const f = B.makeField(B.makeRng(7));
  ok(f.light.length === B.W * B.H, 'light channel sized W*H');
  ok(f.trail.length === B.W * B.H && f.nectar.length === B.W * B.H && f.pollen.length === B.W * B.H,
    'trail/nectar/pollen channels sized W*H');
})();

(function testLightGradient() {
  const f = B.makeField(B.makeRng(7));
  // brighter toward the top (canopy sun) — average top row > average bottom row
  let topSum = 0, botSum = 0;
  for (let x = 0; x < B.W; x++) { topSum += f.lightAt(x, 0); botSum += f.lightAt(x, B.H - 1); }
  ok(topSum / B.W > botSum / B.W, 'light gradient: top brighter than bottom');
  ok(f.lightAt(10, 10) > 0, 'light is positive somewhere');
})();

(function testTrailDiffuseConserves() {
  const f = B.makeField(B.makeRng(7));
  f.add('trail', B.W >> 1, B.H >> 1, 100);
  const before = f.total('trail');
  const peakBefore = f.get('trail', B.W >> 1, B.H >> 1);
  for (let s = 0; s < 25; s++) f.diffuse('trail', 0.2);
  approx(f.total('trail'), before, 1e-2, 'trail diffusion conserves total');
  ok(f.get('trail', B.W >> 1, B.H >> 1) < peakBefore, 'trail diffusion lowers the peak (spreads)');
})();

(function testDecayMonotone() {
  const f = B.makeField(B.makeRng(7));
  f.add('nectar', 5, 5, 50);
  const t0 = f.total('nectar');
  f.decay('nectar', 0.1);
  const t1 = f.total('nectar');
  f.decay('nectar', 0.1);
  const t2 = f.total('nectar');
  ok(t1 < t0 && t2 < t1, 'decay lowers total monotonically');
})();

(function testFieldDeterminism() {
  const f1 = B.makeField(B.makeRng(7)), f2 = B.makeField(B.makeRng(7));
  f1.add('trail', 8, 8, 30); f2.add('trail', 8, 8, 30);
  for (let s = 0; s < 10; s++) { f1.diffuse('trail', 0.2); f2.diffuse('trail', 0.2); }
  let same = true;
  for (let i = 0; i < f1.trail.length; i++) if (f1.trail[i] !== f2.trail[i]) { same = false; break; }
  ok(same, 'same seed → identical field after diffusion');
})();

// ---- Task 3: the genome (the keystone) ----
section('genome — expression, decode-grid, match');
require('../js/genome.js');

(function testRandomPlantGenome() {
  const g = B.Genome.randomPlant(B.makeRng(3));
  ok(g.symmetry >= 3 && g.symmetry <= 8 && g.symmetry === (g.symmetry | 0), 'symmetry is int 3..8');
  ok(g.petalLength >= 0.45 && g.petalLength <= 0.98, 'petalLength in range');
  ok(g.petalColor >= 0 && g.petalColor <= 7, 'petalColor a palette index');
  ok(g.beaconHue >= 0 && g.beaconHue < 1, 'beaconHue in [0,1)');
})();

(function testRegionIndexRangeAndCore() {
  const g = B.Genome.randomPlant(B.makeRng(5));
  let okRange = true;
  for (let i = 0; i < 200; i++) {
    const r = (i % 20) / 20, th = (i / 200) * B.TAU - Math.PI;
    const idx = B.Genome.regionIndex(g, r, th);
    if (!(idx === -1 || (idx >= 0 && idx <= 7))) okRange = false;
  }
  ok(okRange, 'regionIndex returns -1 or a palette index 0..7');
  ok(B.Genome.regionIndex(g, 0, 0) === (g.coreColor | 0), 'centre (r=0) is the core colour');
})();

(function testDecodeGridDeterministic() {
  const g = B.Genome.randomPlant(B.makeRng(9));
  const a = B.Genome.decodeGrid(g), b = B.Genome.decodeGrid(g);
  ok(a.length === B.N * B.N, 'decode-grid is N*N');
  let same = true; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) same = false;
  ok(same, 'decode-grid deterministic for a fixed genome');
  ok(a.every(v => (v >= 0 && v <= 7) || v === B.EMPTY), 'grid cells are palette indices or EMPTY');
})();

(function testMatch() {
  const g = B.Genome.randomPlant(B.makeRng(11));
  const grid = B.Genome.decodeGrid(g);
  ok(Math.abs(B.match(grid, grid) - 1) < 1e-9, 'a grid matches itself exactly = 1');
  // two random keys vs random grids average near 1/9 (8 colours + empty) — genuinely "fumbling"
  let sum = 0, trials = 400;
  for (let t = 0; t < trials; t++) {
    const r = B.makeRng(1000 + t);
    const k = B.Genome.randomKey(r).decoder;
    const gg = B.Genome.decodeGrid(B.Genome.randomPlant(r));
    sum += B.match(k, gg);
  }
  const avg = sum / trials;
  ok(avg > 0.03 && avg < 0.30, `random match is low/fumbling (avg ${avg.toFixed(3)})`);
})();

(function testMutationLocality() {
  // a single-gene-ish mutation shifts the decode-grid by only a few cells (smooth visible drift)
  const rng = B.makeRng(21);
  let totalChanged = 0, trials = 40;
  for (let t = 0; t < trials; t++) {
    const g = B.Genome.randomPlant(rng);
    const g2 = B.Genome.mutate(g, rng, 1);
    const a = B.Genome.decodeGrid(g), b = B.Genome.decodeGrid(g2);
    let changed = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
    totalChanged += changed / a.length;
  }
  const meanFrac = totalChanged / trials;
  ok(meanFrac < 0.45, `mutation drift is local (mean ${(meanFrac * 100).toFixed(0)}% of grid cells change)`);
  ok(meanFrac > 0, 'mutation actually changes something');
})();

(function testMutationInRange() {
  const rng = B.makeRng(31);
  let allOk = true;
  for (let t = 0; t < 60; t++) {
    const g = B.Genome.mutate(B.Genome.randomPlant(rng), rng, 1);
    if (g.symmetry < 3 || g.symmetry > 8 || g.petalLength < 0.45 || g.petalLength > 0.98 ||
        g.petalColor < 0 || g.petalColor > 7 || g.beaconHue < 0 || g.beaconHue >= 1) allOk = false;
  }
  ok(allOk, 'mutated genomes stay in range');
})();

// ---- Task 5(plan): the flower / signal ----
section('flower — beacon, grid, visit reward = beaconMatch × gridMatch');
require('../js/flower.js');

(function testFlowerBuild() {
  const g = B.Genome.randomPlant(B.makeRng(41));
  const fl = B.makeFlower(g, 10, 10, 1);
  ok(fl.grid.length === B.N * B.N, 'flower carries an N×N decode-grid');
  ok(fl.beaconHue === g.beaconHue, 'flower beacon hue from genome');
  ok(fl.nectar === 0 && fl.pollen === 0, 'flower starts unstocked');
})();

(function testRestock() {
  const g = B.Genome.randomPlant(B.makeRng(42));
  const fl = B.makeFlower(g, 10, 10, 1);
  fl.restock(10);
  ok(fl.nectar > 0 && fl.pollen > 0, 'restock fills nectar + pollen pools');
})();

(function testMatchedKeyOutEatsRandom() {
  const g = B.Genome.randomPlant(B.makeRng(43));
  const matchedKey = { preference: g.beaconHue, decoder: B.Genome.decodeGrid(g),
    forageRange: 30, speed: 1, dietBias: 0.5 };
  const randomKey = B.Genome.randomKey(B.makeRng(99));
  const fa = B.makeFlower(g, 10, 10, 1); fa.restock(20);
  const fb = B.makeFlower(g, 10, 10, 1); fb.restock(20);
  const ra = fa.visit(matchedKey), rb = fb.visit(randomKey);
  ok(ra.nectar > rb.nectar, 'a matched key out-eats a random one on the same flower');
  ok(ra.pollination > rb.pollination, 'a matched key pollinates better');
  ok(Math.abs(ra.pollination - 1) < 1e-9, 'a perfect key pollinates ~1');
})();

(function testVisitCappedAndDepletes() {
  const g = B.Genome.randomPlant(B.makeRng(44));
  const key = { preference: g.beaconHue, decoder: B.Genome.decodeGrid(g), forageRange: 30, speed: 1, dietBias: 0.5 };
  const fl = B.makeFlower(g, 10, 10, 1); fl.restock(20);
  const pool0 = fl.nectar;
  const r = fl.visit(key);
  ok(r.nectar <= pool0 + 1e-9, 'visit never returns more nectar than the pool held');
  ok(fl.nectar < pool0, 'visit depletes the pool (collection works)');
  ok(r.pollination >= 0 && r.pollination <= 1, 'pollination (eff) in [0,1]');
})();

// ---- Task 4(plan): the plant ----
section('plant — photosynthesis, flowers, niche growth');
require('../js/plant.js');

(function testPhotosynthesisGainsSugar() {
  const f = B.makeField(B.makeRng(7));
  const p = B.makePlant(B.Genome.randomPlant(B.makeRng(50)), 20, 10, B.makeRng(50));
  const s0 = p.sugar;
  for (let t = 0; t < 50; t++) p.tick(f);
  ok(p.sugar > s0 || p.flowers.length > 0, 'a lit plant gains sugar or spends it on flowers');
})();

(function testSugarBoundedNoLight() {
  const f = B.makeField(B.makeRng(7));
  for (let i = 0; i < f.light.length; i++) f.light[i] = 0; // no light at all
  const p = B.makePlant(B.Genome.randomPlant(B.makeRng(51)), 20, 10, B.makeRng(51));
  p.sugar = 5;
  for (let t = 0; t < 200; t++) p.tick(f);
  ok(p.sugar <= 5 + 1e-6, 'with no light, sugar never grows (respiration only drains)');
  ok(p.sugar >= 0, 'sugar never goes negative');
})();

(function testBuildsFlower() {
  const f = B.makeField(B.makeRng(7));
  const p = B.makePlant(B.Genome.randomPlant(B.makeRng(52)), 20, 8, B.makeRng(52));
  for (let t = 0; t < 300; t++) p.tick(f);
  ok(p.flowers.length >= 1, 'plant builds at least one flower given light');
  ok(p.flowers[0].nectar > 0, 'its flower gets stocked with nectar');
})();

(function testGrowNiche() {
  const f = B.makeField(B.makeRng(7));
  const p = B.makePlant(B.Genome.randomPlant(B.makeRng(53)), 20, 8, B.makeRng(53));
  for (let t = 0; t < 300; t++) p.tick(f);
  const before = p.flowers.length, sugarBefore = p.sugar;
  p.sugar = 1000;
  const grew = p.growNiche(B.makeRng(7));
  ok(grew && p.flowers.length === before + 1, 'growNiche adds a second flower');
  ok(p.sugar < 1000, 'growNiche costs sugar');
  ok(p.flowers[p.flowers.length - 1].beaconHue !== p.flowers[0].beaconHue ||
     p.niches === 2, 'the new niche is a distinct lock (or niche count advanced)');
})();

(function testPlantDeterminism() {
  const f1 = B.makeField(B.makeRng(7)), f2 = B.makeField(B.makeRng(7));
  const g = B.Genome.randomPlant(B.makeRng(54));
  const p1 = B.makePlant(g, 20, 8, B.makeRng(54)), p2 = B.makePlant(g, 20, 8, B.makeRng(54));
  for (let t = 0; t < 100; t++) { p1.tick(f1); p2.tick(f2); }
  ok(Math.abs(p1.sugar - p2.sugar) < 1e-9 && p1.flowers.length === p2.flowers.length,
    'same seed/genome → identical plant after 100 ticks');
})();

// ---- Task 7(plan): the colony ----
section('colony — store, upkeep, pollen→larvae spawn');
require('../js/pollinator.js');
require('../js/colony.js');

(function testDepositRaisesStores() {
  const c = B.makeColony(48, 60, B.makeRng(60));
  c.deposit(2, 1.5);
  ok(c.nectar > 0 && c.pollen > 0, 'deposit raises nectar + pollen stores');
})();

(function testSpawn() {
  const f = B.makeField(B.makeRng(7));
  const c = B.makeColony(48, 60, B.makeRng(61));
  c.bees.push(B.makePollinator(B.Genome.randomKey(B.makeRng(1)), 48, 60));
  c.bees[0].lastYield = 5; // a well-fed forager
  c.nectar = 20; c.pollen = 20;
  const pop0 = c.bees.length, pollen0 = c.pollen;
  c.tick(f, [], B.makeRng(7));
  ok(c.bees.length === pop0 + 1, 'with ample stores, tick spawns a new bee');
  ok(c.pollen < pollen0, 'spawning spends pollen (the machinery currency)');
})();

(function testSpawnInheritsBestKey() {
  const f = B.makeField(B.makeRng(7));
  const c = B.makeColony(48, 60, B.makeRng(62));
  const goodKey = B.Genome.randomKey(B.makeRng(2));
  const b = B.makePollinator(goodKey, 48, 60); b.lastYield = 9;
  b.lastGrid = goodKey.decoder.slice(); b.lastBeaconHue = goodKey.preference; // a forager that fed well
  c.bees.push(b);
  c.bees.push(B.makePollinator(B.Genome.randomKey(B.makeRng(3)), 48, 60)); // a worse forager
  c.bees[1].lastYield = 0;
  c.nectar = 20; c.pollen = 20;
  c.tick(f, [], B.makeRng(7));
  const child = c.bees[c.bees.length - 1];
  ok(B.match(child.key.decoder, goodKey.decoder) > 0.85, 'a spawned bee inherits the best-fed forager\'s key (mutated)');
})();

(function testGentleStarvation() {
  const f = B.makeField(B.makeRng(7));
  const c = B.makeColony(48, 60, B.makeRng(63));
  for (let i = 0; i < 5; i++) c.bees.push(B.makePollinator(B.Genome.randomKey(B.makeRng(i)), 48, 60));
  c.nectar = 0; c.pollen = 0;
  const pop0 = c.bees.length;
  c.tick(f, [], B.makeRng(7));
  ok(c.bees.length === pop0 - 1, 'empty nectar starves exactly one bee (gentle, not a wipe)');
  ok(c.bees.length > 0, 'never instantly to zero');
})();

(function testColonyDeterminism() {
  const f1 = B.makeField(B.makeRng(7)), f2 = B.makeField(B.makeRng(7));
  const c1 = B.makeColony(48, 60, B.makeRng(64)), c2 = B.makeColony(48, 60, B.makeRng(64));
  for (let i = 0; i < 4; i++) { c1.bees.push(B.makePollinator(B.Genome.randomKey(B.makeRng(i)), 48, 60));
    c2.bees.push(B.makePollinator(B.Genome.randomKey(B.makeRng(i)), 48, 60)); }
  c1.nectar = c2.nectar = 10; c1.pollen = c2.pollen = 10;
  for (let t = 0; t < 30; t++) { c1.tick(f1, [], B.makeRng(7)); c2.tick(f2, [], B.makeRng(7)); }
  ok(c1.bees.length === c2.bees.length && Math.abs(c1.nectar - c2.nectar) < 1e-9,
    'same seed → identical colony after 30 ticks');
})();

// ---- Task 6(plan): the pollinator forage loop ----
section('pollinator — beacon forage, decode, pollinate, trail home');

function riggedScene(seed) {
  const f = B.makeField(B.makeRng(seed));
  const g = B.Genome.randomPlant(B.makeRng(seed));
  const fl = B.makeFlower(g, 60, 30, 1); fl.cap = 8; fl.restock(40);
  const colony = B.makeColony(50, 32, B.makeRng(seed));
  // a bee tuned to THIS flower (matched key), placed near
  const key = { preference: g.beaconHue, decoder: B.Genome.decodeGrid(g),
    forageRange: 40, speed: 1.2, dietBias: 0.5 };
  const bee = B.makePollinator(key, 50, 32);
  colony.bees.push(bee);
  return { f: f, fl: fl, colony: colony, bee: bee };
}

(function testForageRoundTrip() {
  const s = riggedScene(70);
  let carried = false;
  for (let t = 0; t < 400; t++) {
    s.bee.tick(s.f, [s.fl], s.colony, B.makeRng(7));
    if (s.bee.nectar > 0) carried = true;
  }
  ok(carried, 'a matched bee reaches the flower and carries nectar at some point');
  ok(s.bee.trips >= 1, 'the bee completes at least one full forage round-trip');
})();

(function testReturnRaisesColony() {
  const s = riggedScene(71);
  for (let t = 0; t < 400; t++) s.bee.tick(s.f, [s.fl], s.colony, B.makeRng(7));
  ok(s.colony.nectar > 0, 'returning foragers raise the colony nectar store');
})();

(function testLaysTrail() {
  const s = riggedScene(72);
  for (let t = 0; t < 200; t++) s.bee.tick(s.f, [s.fl], s.colony, B.makeRng(7));
  ok(s.f.total('trail') > 0, 'foraging lays a recruitment trail (stigmergy)');
})();

(function testPollinatorDeterminism() {
  const a = riggedScene(73), b = riggedScene(73);
  for (let t = 0; t < 150; t++) { a.bee.tick(a.f, [a.fl], a.colony, B.makeRng(7));
    b.bee.tick(b.f, [b.fl], b.colony, B.makeRng(7)); }
  ok(Math.abs(a.bee.x - b.bee.x) < 1e-9 && Math.abs(a.colony.nectar - b.colony.nectar) < 1e-9,
    'same seed → identical pollinator path + colony state');
})();

// ---- Task 8(plan): the sim ----
section('sim — one world, deterministic tick, serialize');
require('../js/sim.js');

(function testWarmStartPersists() {
  const sim = B.makeSim(7); sim.warmStart();
  ok(sim.plants.length > 0 && sim.colonies.length > 0, 'warm-start has plants + a colony');
  const beforeBees = sim.stats().pollinators;
  ok(beforeBees > 0, 'warm-start has foragers already alive (no cold open)');
  for (let t = 0; t < 300; t++) sim.tick();
  const s = sim.stats();
  ok(s.plants > 0, 'plants persist past 300 ticks (nothing dies instantly)');
  ok(s.pollinators > 0, 'pollinators persist past 300 ticks');
})();

(function testSimDeterminism() {
  const a = B.makeSim(7); a.warmStart();
  const b = B.makeSim(7); b.warmStart();
  for (let t = 0; t < 300; t++) { a.tick(); b.tick(); }
  const sa = a.stats(), sb = b.stats();
  ok(sa.plants === sb.plants && sa.pollinators === sb.pollinators &&
     Math.abs(sa.meanFit - sb.meanFit) < 1e-9, 'same seed → identical world after 300 ticks');
})();

(function testEnergyBounded() {
  const sim = B.makeSim(5); sim.warmStart();
  for (let t = 0; t < 1000; t++) sim.tick();
  const s = sim.stats();
  ok(isFinite(s.nectarTotal) && isFinite(s.pollenTotal), 'energy stays finite over 1000 ticks');
  ok(s.nectarTotal < 5000 && s.pollenTotal < 5000, 'energy bounded (no runaway)');
})();

(function testSerializeRoundTrip() {
  const a = B.makeSim(9); a.warmStart();
  for (let t = 0; t < 120; t++) a.tick();
  const json = a.serialize();
  const b = B.loadSim(json);
  for (let t = 0; t < 60; t++) { a.tick(); b.tick(); }
  const sa = a.stats(), sb = b.stats();
  ok(sa.plants === sb.plants && sa.pollinators === sb.pollinators &&
     Math.abs(sa.meanFit - sb.meanFit) < 1e-9 && Math.abs(sa.nectarTotal - sb.nectarTotal) < 1e-6,
    'serialize → load → tick matches the original (round-trip identity)');
})();

// ---- Task 13(plan): the levers ----
section('levers — lock, plant, place colony, grow niche');

(function testLevers() {
  const sim = B.makeSim(7); sim.warmStart();
  const fl = sim.allFlowers()[0];
  sim.lockFlower(fl, true); ok(fl.locked === true, 'lockFlower freezes a flower');
  sim.lockFlower(fl, false); ok(fl.locked === false, 'lockFlower releases it');
  const p0 = sim.plants.length; sim.plantAt(40, 30); ok(sim.plants.length >= p0 || sim.plants.length === 12, 'plantAt adds/keeps within cap');
  const c0 = sim.colonies.length; sim.placeColony(20, 50); ok(sim.colonies.length === c0 + 1, 'placeColony adds a colony');
  const plant = sim.plants[0]; plant.sugar = 50; const nb = plant.flowers.length;
  ok(sim.growNicheOn(plant) && plant.flowers.length === nb + 1, 'growNicheOn grows a niche');
})();

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'} — ${total - fails}/${total}`);
process.exit(fails ? 1 : 0);
