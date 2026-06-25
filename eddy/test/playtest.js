'use strict';
// Actually play it: run a scenario, report the living world over time (census, species, the food web,
// emergence events), and save snapshots to look at. Usage: node eddy/test/playtest.js <scenario>
const fs = require('fs');
['rng', 'grid', 'field', 'generators', 'life', 'fertility', 'sim', 'content', 'chronicle', 'render'].forEach(f => require('../js/' + f + '.js'));
const E = globalThis.E;
const { encodePNG, renderWorld } = require('./pngutil.js');

const G = ['lumen', 'mineral', 'humus'];
function snapshot(sim) {
  const live = sim.life.list.filter(e => e.alive);
  const guild = [0, 0, 0], byName = {};
  for (const e of live) {
    let d = 0; for (let k = 1; k < 3; k++) if (e.diet[k] > e.diet[d]) d = k; guild[d]++;
    const n = E.Content.nameFor(e.diet);
    (byName[n] || (byName[n] = { n, c: 0, gs: 0 }));
    byName[n].c++; byName[n].gs += e.gen;
  }
  const species = Object.values(byName).sort((a, b) => b.c - a.c);
  const preds = live.filter(e => (e.pred || 0) > 0.3).length;
  const maxPred = live.reduce((m, e) => Math.max(m, e.pred || 0), 0);
  return { alive: live.length, guild, species, preds, maxPred, maxGen: live.reduce((m, e) => Math.max(m, e.gen), 0), soil: sim.field.soilTotal() };
}

const scenarios = {
  // a rich garden: three springs (incl. an overlap), seeded at the sources
  garden(sim) {
    sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 75, y: 30, el: E.HUM, rate: 5, proj: 'vein', angle: 0.4, length: 30 });
    sim.dropPrimer(55, 50); sim.dropPrimer(95, 50);
  },
  // minimal: one lumen spring, one seed — does the web extend itself?
  minimal(sim) {
    sim.addGenerator({ x: 80, y: 50, el: E.LUM, rate: 10, proj: 'radial', radius: 18 });
    sim.dropPrimer(80, 50);
  },
  // neglect: place two springs + seeds, then never touch it again
  neglect(sim) {
    sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.dropPrimer(60, 50); sim.dropPrimer(100, 50);
  },
  // predator: a garden, then hunters are introduced at tick 400 (see the loop)
  predator(sim) {
    sim.addGenerator({ x: 55, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 95, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.dropPrimer(55, 50); sim.dropPrimer(95, 50);
  },
};

const which = process.argv[2] || 'garden';
const sim = E.makeSim(7);
scenarios[which](sim);
const chr = E.makeChronicle();

const marks = [50, 150, 350, 700, 1200, 2000];
const snapAt = [350, 2000];
let prevSpecies = new Set();
console.log(`\n=== PLAYTEST: ${which} ===`);
console.log('tick |alive| L / M / H |species|gen| soil |preds maxP| new species');
let t = 0, seededPred = false;
for (const m of marks) {
  while (t < m) {
    sim.tick(); t++;
    if (t % 20 === 0) chr.observe(sim, t);
    if (which === 'predator' && !seededPred && t >= 400) { // introduce hunters into the lumen colony
      for (let i = 0; i < 5; i++) sim.dropPredator(54 + (i % 3), 49 + ((i / 3) | 0));
      seededPred = true;
      console.log('  >> 5 predators seeded into the lumen colony at tick ' + t);
    }
  }
  const s = snapshot(sim);
  const names = new Set(s.species.map(x => x.n));
  const fresh = [...names].filter(n => !prevSpecies.has(n));
  prevSpecies = names;
  console.log(
    String(t).padStart(4) + ' |' + String(s.alive).padStart(4) + ' |' +
    s.guild.map(x => String(x).padStart(3)).join('/') + '|' +
    String(s.species.length).padStart(6) + ' |' + String(s.maxGen).padStart(3) + '|' +
    String(Math.round(s.soil)).padStart(5) + ' |' + String(s.preds).padStart(4) + ' ' + s.maxPred.toFixed(2) + '| ' + (fresh.length ? fresh.slice(0, 4).join(', ') : '—')
  );
  if (snapAt.includes(m)) {
    const { rgb, w, h } = renderWorld(E, sim, 6);
    fs.mkdirSync(__dirname + '/../shots', { recursive: true });
    fs.writeFileSync(`${__dirname}/../shots/play-${which}-${m}.png`, encodePNG(w, h, rgb));
  }
}
const fin = snapshot(sim);
console.log('\nfinal species (name · dominant diet · count · mean gen):');
for (const sp of fin.species.slice(0, 12)) {
  const d = sp; const diet = (() => { const e = sim.life.list.find(x => x.alive && E.Content.nameFor(x.diet) === sp.n); return e ? [...e.diet].map(v => v.toFixed(2)).join('/') : '?'; })();
  console.log('  ' + sp.n.padEnd(14) + ' ' + diet + '  x' + String(sp.c).padStart(3) + '  gen~' + Math.round(sp.gs / sp.c));
}
console.log('\nthe chronicle — what the world narrated (' + chr.codex.size + ' species witnessed):');
for (const e of chr.milestones) console.log('  ★ t' + e.tick + '  ' + e.text);
for (const e of chr.recent(8).reverse()) console.log('  · t' + e.tick + ' [' + e.kind + '] ' + e.text);
console.log(`saved snapshots: shots/play-${which}-*.png\n`);
