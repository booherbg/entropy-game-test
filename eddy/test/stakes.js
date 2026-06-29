'use strict';
// Does a finite opening spring create real STAKES? Measure careful stewardship vs. neglect, with the
// economy as the survival loop. The thesis (from the critique panel): make the opening lumen spring
// finite and the world runs down by default — a tended, diverse world earns enough flow to keep placing
// springs and lives; a neglected one starves. Usage: node test/stakes.js [openingReservoir]
['rng', 'grid', 'field', 'generators', 'life', 'fertility', 'sim', 'content', 'chronicle', 'score', 'economy']
  .forEach(f => require('../js/' + f + '.js'));
const E = globalThis.E;

const LIVE_FLAGS = (s) => {
  if (s.setAutoRot) s.setAutoRot(true);
  if (s.setCompounds) s.setCompounds(true);
  if (s.setSymbiosis) s.setSymbiosis(true);
  if (s.setRichKill) { s.setRichKill(true); s.setEatTradeoff(0.45); }
  if (s.setGaia) { s.setGaia(true); s.setClimeForcing(0.0002); }
};

// mirror main.js freshSim, but the opening lumen spring takes a reservoir (finite) when given.
function freshWorld(seed, openingReservoir) {
  const s = E.makeSim(seed);
  const gx = (E.W * 0.4) | 0, gy = (E.H * 0.5) | 0;
  const og = { x: gx, y: gy, el: E.LUM, rate: 8, proj: 'radial', radius: 16 };
  if (openingReservoir) { og.reservoir = openingReservoir; og.r0 = openingReservoir; }
  s.addGenerator(og);
  if (E.makeTerrain) E.makeTerrain(s.field, E.makeRng((seed ^ 0x2545f491) >>> 0), gx, gy);
  for (let k = 0; k < 40; k++) { s.field.diffuse(); E.depositGenerators(s.field, s.gens); }
  s.dropPrimer(gx, gy);
  LIVE_FLAGS(s);
  return s;
}

const alive = (s) => s.life.list.filter(e => e.alive).length;
const div = (s) => E.score(s).diversity;

// a CAREFUL gardener: keeps the world fed. every CADENCE ticks, if it can afford a spring, it places one
// (cycling the three elements across spread spots) and primes it — funded by the flow a flourishing world earns.
function playCareful(s, T) {
  const eco = E.makeEconomy();
  const spots = [
    { x: 0.55, y: 0.44, el: E.MIN }, { x: 0.30, y: 0.55, el: E.HUM }, { x: 0.50, y: 0.62, el: E.LUM },
    { x: 0.62, y: 0.40, el: E.MIN }, { x: 0.34, y: 0.40, el: E.HUM }, { x: 0.46, y: 0.50, el: E.LUM },
  ];
  let si = 0, seededHunter = false;
  const traj = {};
  for (let t = 1; t <= T; t++) {
    s.tick(); eco.income(s);
    // a tended world: keep replacing springs as they drain (cycle the spots forever), funded by flow
    if (t % 200 === 0 && eco.can('spring')) {
      eco.spend('spring');
      const p = spots[si++ % spots.length];
      const x = (E.W * p.x) | 0, y = (E.H * p.y) | 0;
      s.addGenerator({ x, y, el: p.el, rate: 8, proj: 'radial', radius: 16, reservoir: 4000, r0: 4000 });
      if (eco.can('primer')) { eco.spend('primer'); s.dropPrimer(x, y); }
    }
    if (!seededHunter && t === 1200 && eco.can('hunter')) { eco.spend('hunter'); s.dropPredator((E.W * 0.4) | 0, (E.H * 0.5) | 0); seededHunter = true; }
    if (t % 1000 === 0) traj[t] = { alive: alive(s), div: div(s), flow: Math.round(eco.flow()) };
  }
  return traj;
}

// NEGLECT: the opening spring + its primer, then never touched again.
function playNeglect(s, T) {
  const eco = E.makeEconomy();
  const traj = {};
  for (let t = 1; t <= T; t++) {
    s.tick(); eco.income(s);
    if (t % 1000 === 0) traj[t] = { alive: alive(s), div: div(s), flow: Math.round(eco.flow()) };
  }
  return traj;
}

const R = parseInt(process.argv[2] || '9000', 10);
const T = 5000;
const seeds = [7, 11, 23];
console.log(`=== eddy · stakes test — finite opening spring (reservoir ${R}, ${T} ticks, seeds ${seeds.join('/')}) ===`);
console.log('the opening spring drains in ~' + Math.round(R / 8) + ' ticks of emission.\n');

function meanTraj(trajs) {
  const ks = Object.keys(trajs[0]).map(Number);
  return ks.map(k => {
    const a = trajs.reduce((s, tr) => s + tr[k].alive, 0) / trajs.length;
    const d = trajs.reduce((s, tr) => s + tr[k].div, 0) / trajs.length;
    const f = trajs.reduce((s, tr) => s + tr[k].flow, 0) / trajs.length;
    return { k, a: a.toFixed(0), d: d.toFixed(1), f: f.toFixed(0) };
  });
}

const carefulT = seeds.map(sd => playCareful(freshWorld(sd, R), T));
const neglectT = seeds.map(sd => playNeglect(freshWorld(sd, R), T));
// baseline: neglect with the CURRENT infinite spring (what's live today)
const infiniteT = seeds.map(sd => playNeglect(freshWorld(sd, 0), T));

const fmt = (rows) => rows.map(r => `t${r.k}: alive ${r.a} · div ${r.d} · flow ${r.f}`).join('   ');
console.log('CAREFUL  (finite, tended): ', fmt(meanTraj(carefulT)));
console.log('NEGLECT  (finite, ignored):', fmt(meanTraj(neglectT)));
console.log('baseline (INFINITE spring):', fmt(meanTraj(infiniteT)));

const cEnd = meanTraj(carefulT).slice(-1)[0], nEnd = meanTraj(neglectT).slice(-1)[0];
console.log('\n— verdict —');
const gap = (+cEnd.a) / Math.max(1, +nEnd.a);
console.log(`careful ends ${cEnd.a} alive vs neglect ${nEnd.a} alive  → ${gap.toFixed(1)}× gap`);
console.log(`neglect ${(+nEnd.a) < 8 ? 'COLLAPSES (stakes are real)' : 'still alive (no teeth yet — drop the reservoir)'}`);
console.log(`careful ${(+cEnd.a) > 25 ? 'SUSTAINS a living world (skill is rewarded)' : 'struggles too (reservoir/economy too tight)'}`);
