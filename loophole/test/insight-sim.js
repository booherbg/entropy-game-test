'use strict';
/* insight-ceiling sim: how much insight can a player bank if they never spend it?
   anchors legendary-shop pricing. heat is the unbounded source — order above the
   soft cap radiates (half the excess/turn) and spilled/16 condenses into insight. */
const path = require('path');
const LP = require(path.join(__dirname, '..', 'js', 'core.js'));
require(path.join(__dirname, '..', 'js', 'content.js'));
const { greedyTurn } = require('./harness.js');
const { Game, HEX } = LP;

const hdist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
const empties = g => [...g.cells.values()].filter(c => !c.pat);

/* the user's hypothesis: carpet the board in moss, a knot of fronds in the middle,
   then just hit space. measures whether that self-sustains AND farms insight. */
function mossSheetTurn(g) {
  if (g.widenReady) g.widen();
  if (g.pendingOffer) g.takeOffer(0);
  const reserve = 5;
  /* a knot of fronds in the centre (depth engine), sheltered by carpet */
  let fronds = 0;
  for (const c of g.cells.values()) {
    if (fronds >= 5) break;
    if (hdist(c.q, c.r) <= 1 && c.pat && c.pat.t === 'frond') fronds++;
  }
  for (const c of [...g.cells.values()].sort((a, b) => hdist(a.q, a.r) - hdist(b.q, b.r))) {
    if (fronds >= 5) break;
    const k = HEX.key(c.q, c.r);
    if (!c.pat && hdist(c.q, c.r) <= 1 && g.order > 22 + reserve && g.canPlant('frond', k).ok) { g.plant('frond', k); fronds++; }
  }
  /* fill everything else with moss while order lasts */
  for (const c of empties(g)) {
    if (g.order <= reserve) break;
    const k = HEX.key(c.q, c.r);
    if (g.canPlant('moss', k).ok) g.plant('moss', k);
  }
  g.endTurn(); /* then: hit space */
}

/* simulate a player who never buys cultivars — all insight is banked for legendaries */
Game.prototype.evolve = function () { return { ok: false, why: 'sim: hoarding insight' }; };

const SAMPLE = [25, 50, 75, 100];

function run(seed, turns, mode) {
  const g = new Game(seed);
  const samples = {};
  for (let i = 0; i < turns; i++) {
    if (mode === 'idle') {
      g.endTurn();                                  // plant nothing, just hit next
    } else if (mode === 'builder') {
      greedyTurn(g);                                // build hard, save insight (greedyTurn ends w/ endTurn)
    } else if (mode === 'hoard') {
      if (g.turn < 28) greedyTurn(g);               // build an engine first...
      else { if (g.widenReady) g.widen(); g.endTurn(); } // ...then stop spending; hoard order -> heat -> insight
    } else if (mode === 'mosssheet') {
      mossSheetTurn(g);                             // carpet moss + central fronds, then spam space
    }
    if (SAMPLE.includes(g.turn)) samples[g.turn] = g.insight;
    if (g.over) break;
  }
  return { seed, mode, end: g.turn, over: g.over, stage: g.stage,
    insight: g.insight, order: Math.round(g.order), cap: g.orderCap || 0,
    spilled: g.stats.spilled || 0, samples };
}

const seeds = ['sim-a', 'sim-b', 'sim-c', 'sim-d', 'sim-e'];
for (const mode of ['idle', 'builder', 'hoard', 'mosssheet']) {
  console.log(`\n=== mode: ${mode} ===`);
  const rows = seeds.map(s => run(s, 100, mode));
  for (const r of rows) {
    const samp = SAMPLE.map(t => `t${t}:${r.samples[t] != null ? r.samples[t] : '-'}`).join('  ');
    console.log(`  ${r.seed}  end=t${r.end}${r.over ? '(dissolved)' : ''} stage${r.stage}  insight=${r.insight}  order=${r.order}/${r.cap}  spilled=${r.spilled}  | ${samp}`);
  }
  const fin = rows.filter(r => !r.over);
  if (fin.length) {
    const avg = k => Math.round(fin.reduce((a, r) => a + r[k], 0) / fin.length);
    const avgSamp = t => { const v = fin.filter(r => r.samples[t] != null); return v.length ? Math.round(v.reduce((a, r) => a + r.samples[t], 0) / v.length) : '-'; };
    console.log(`  --- survivors avg: insight=${avg('insight')}  spilled=${avg('spilled')}  | ${SAMPLE.map(t => `t${t}:${avgSamp(t)}`).join('  ')}`);
  }
}
