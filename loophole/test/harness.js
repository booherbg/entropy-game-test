/* LOOPHOLE — node test harness.
   Run: node test/harness.js [--tune] [--seeds N] */
'use strict';
const path = require('path');
const LP = require(path.join(__dirname, '..', 'js', 'core.js'));
require(path.join(__dirname, '..', 'js', 'content.js'));

const { Game, HEX, RNG, U } = LP;
const C = LP.CONTENT;

let failures = 0;
const ok = (cond, label, detail) => {
  if (cond) console.log('  PASS  ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? ' — ' + detail : '')); }
};

/* ───────── invariants ───────── */
function checkInvariants(g, ctx) {
  for (const c of g.cells.values()) {
    if (!C.SOILS[c.soil]) throw new Error(`${ctx}: cell ${c.q},${c.r} bad soil ${c.soil}`);
    if (!Number.isFinite(c.e) || c.e < 0 || c.e > 1) throw new Error(`${ctx}: cell ${c.q},${c.r} e=${c.e}`);
    if (!Number.isFinite(c.eMin) || c.eMin < 0 || c.eMin > 1.0001) throw new Error(`${ctx}: eMin ${c.eMin}`);
    if (c.pat) {
      if (c.pat.t === 'frond' && (c.pat.depth < 0 || c.pat.depth > 12)) throw new Error(`${ctx}: frond depth ${c.pat.depth}`);
      if (c.pat.t === 'ant' && (c.pat.pop < -1 || c.pat.pop > 80)) throw new Error(`${ctx}: ant pop ${c.pat.pop}`);
    }
  }
  if (!Number.isFinite(g.order) || g.order < 0) throw new Error(`${ctx}: order=${g.order}`);
  if (!Number.isFinite(g.carry)) throw new Error(`${ctx}: carry NaN`);
}

/* ───────── bots ───────── */
function idleBot(seed) {
  const g = new Game(seed);
  while (!g.over && g.turn < 130) {
    if (g.widenReady) g.widen();
    if (g.pendingOffer) g.takeOffer(0);
    g.endTurn();
    checkInvariants(g, 'idle t' + g.turn);
  }
  return g;
}

const rarityRank = { legendary: 3, uncommon: 2, common: 1 };

function cellsOf(g) { return [...g.cells.values()]; }
function emptyCells(g) { return cellsOf(g).filter(c => !c.pat); }
function patCells(g, t) { return cellsOf(g).filter(c => c.pat && (!t || c.pat.t === t)); }
function nbrs(g, c) { return HEX.neighborsK(HEX.key(c.q, c.r)).map(k => g.cells.get(k)).filter(Boolean); }
function localE(g, c, R) {
  let s = 0, n = 0;
  for (const k of HEX.disk(c.q, c.r, R)) { const cc = g.cells.get(k); if (cc) { s += cc.e; n++; } }
  return n ? s / n : 0;
}
const byKey = (a, b) => (a.r - b.r) || (a.q - b.q);

/* a competent, fully deterministic player */
const EVO_PRIORITY = ['vessel', 'clover', 'leafcutter', 'sunfrond', 'frugal', 'rhizomorph',
  'secondhand', 'ferncath', 'quickmoss', 'lattice', 'greatheart', 'thirdhand', 'armyant',
  'perennial', 'ironmoss', 'sporeleaf'];
function greedyTurn(g) {
  if (g.widenReady) g.widen(); /* the bot never banks; humans may */
  /* spend insight as it comes, in a sensible order */
  for (const id of EVO_PRIORITY) if (g.canEvolve(id).ok) { g.evolve(id); break; }
  if (g.pendingOffer) {
    /* buy the legendary when flush (keep a cultivar reserve), else take the best free card */
    if (g.pendingLegend && g.insight >= g.pendingLegend.cost + 4) {
      g.takeLegend();
    } else {
      let best = 0, bestR = -1;
      g.pendingOffer.forEach((spec, i) => {
        const a = C.buildArtifact(spec);
        const r = rarityRank[a.rarity];
        if (r > bestR) { bestR = r; best = i; }
      });
      g.takeOffer(best);
    }
  }
  const reserve = 4 + 2 * g.stage;
  const can = cost => g.order >= cost + reserve;

  /* heartwood: the capstone (prune carpet to make room if needed) */
  if (g.stage >= 5 && patCells(g, 'heart').length === 0 && g.order >= 22) {
    const mycs0 = patCells(g, 'myc');
    let plot = null;
    const empties = emptyCells(g)
      .filter(c => nbrs(g, c).some(n => n.pat && n.pat.t === 'myc'))
      .sort((a, b) => (a.e - b.e) || byKey(a, b));
    if (empties.length) plot = empties[0];
    else {
      const mossy = patCells(g, 'moss')
        .filter(c => nbrs(g, c).some(n => n.pat && n.pat.t === 'myc'))
        .sort((a, b) => (a.e - b.e) || byKey(a, b));
      if (mossy.length) { g.prune(HEX.key(mossy[0].q, mossy[0].r)); plot = mossy[0]; }
    }
    if (plot && mycs0.length) {
      const k = HEX.key(plot.q, plot.r);
      while (plot.e > 0.35 && g.order >= 20 + g.tendCost() && g.tend(k).ok) {}
      if (g.canPlant('heart', k).ok) g.plant('heart', k);
    }
  }

  /* make room: a cell to plant on near `near`, pruning carpet moss if needed */
  const plotNear = (anchors, maxD, eMax) => {
    const okCell = c => HEX.dist2 && anchors.some(m => HEX.dist2(c.q, c.r, m.q, m.r) <= maxD);
    const empties = emptyCells(g).filter(c => c.e <= eMax && (!anchors.length || okCell(c)))
      .sort((a, b) => (a.e - b.e) || byKey(a, b));
    if (empties.length) return empties[0];
    const mossy = patCells(g, 'moss').filter(c => c.e <= eMax && (!anchors.length || okCell(c)) && c.pat.age >= 3)
      .sort((a, b) => (a.e - b.e) || byKey(a, b));
    if (mossy.length) { g.prune(HEX.key(mossy[0].q, mossy[0].r)); return mossy[0]; }
    return null;
  };

  /* mycelium: stitch the garden into ONE network (chain myc near myc) */
  if (g.stage >= 3) {
    const patN = patCells(g).length;
    const want = g.stage >= 6 ? 16 : (g.stage >= 5 ? 12 : 8);
    const perTurn = g.stage >= 5 ? 2 : 1;
    for (let i = 0; i < perTurn; i++) {
      const mycs = patCells(g, 'myc');
      if (mycs.length >= Math.min(want, Math.floor(patN / 2) + 1) || !can(6)) break;
      const plot = plotNear(mycs, 2, 0.6);
      if (!plot) break;
      if (!g.plant('myc', HEX.key(plot.q, plot.r)).ok) break;
    }
  }

  /* complete the heart's weave: it needs 4 kinds of life */
  if (g.stage >= 5) {
    const hearts = patCells(g, 'heart');
    const net = hearts.length ? g.netOf.get(HEX.key(hearts[0].q, hearts[0].r)) : null;
    if (net && net.types.size < 4) {
      const netMycs = [...net.cells].map(k => g.cells.get(k)).filter(c => c && c.pat && c.pat.t === 'myc');
      if (!net.types.has('frond') && can(5)) {
        const plot = plotNear(netMycs, 2, 0.30);
        if (plot) g.plant('frond', HEX.key(plot.q, plot.r));
      }
      const net2 = hearts.length ? g.netOf.get(HEX.key(hearts[0].q, hearts[0].r)) : null;
      if (net2 && net2.types.size < 4 && !net2.types.has('crys') && can(12)) {
        const plot = plotNear(netMycs, 2, 1.0);
        if (plot) g.plant('crys', HEX.key(plot.q, plot.r));
      }
    }
  }

  /* crystals near frond clusters */
  if (g.stage >= 3 && patCells(g, 'crys').length < g.stage - 2 && can(12)) {
    const cands = emptyCells(g)
      .map(c => ({ c, f: HEX.disk(c.q, c.r, 2).filter(k => { const cc = g.cells.get(k); return cc && cc.pat && cc.pat.t === 'frond'; }).length }))
      .filter(x => x.f >= 2)
      .sort((a, b) => (b.f - a.f) || byKey(a.c, b.c));
    if (cands.length) g.plant('crys', HEX.key(cands[0].c.q, cands[0].c.r));
  }

  /* fronds in sheltered pockets */
  const frondCap = 2 + 2 * g.stage;
  while (patCells(g, 'frond').length < frondCap && can(5)) {
    const cands = emptyCells(g)
      .filter(c => c.e <= 0.30 && nbrs(g, c).filter(n => n.pat && n.pat.t === 'moss').length >= 2)
      .sort((a, b) => (a.e - b.e) || byKey(a, b));
    if (!cands.length) break;
    if (!g.plant('frond', HEX.key(cands[0].q, cands[0].r)).ok) break;
  }

  /* moss frontier */
  let mossPlanted = 0;
  while (mossPlanted < 3 && can(3)) {
    const mossy = patCells(g, 'moss').length;
    let cands;
    if (!mossy) cands = emptyCells(g).sort((a, b) => (a.e - b.e) || byKey(a, b));
    else cands = emptyCells(g)
      .filter(c => c.e >= 0.2 && c.e <= 0.62 && nbrs(g, c).some(n => n.pat))
      .sort((a, b) => (b.e - a.e) || byKey(a, b)); /* claim contested ground */
    if (!cands.length) break;
    if (!g.plant('moss', HEX.key(cands[0].q, cands[0].r)).ok) break;
    mossPlanted++;
  }

  /* ant colonies on the frontier */
  if (g.stage >= 2 && patCells(g, 'ant').length < (g.stage >= 4 ? 2 : 1) && can(8)) {
    const cands = emptyCells(g)
      .filter(c => c.e <= 0.65)
      .map(c => ({ c, hunger: localE(g, c, 3) }))
      .sort((a, b) => (b.hunger - a.hunger) || byKey(a.c, b.c));
    if (cands.length) g.plant('ant', HEX.key(cands[0].c.q, cands[0].c.r));
  }

  /* bloom triads */
  if (g.stage >= 4) {
    let planted = 0;
    while (planted < 2 && can(4)) {
      const blooms = patCells(g, 'bloom');
      let cands;
      if (blooms.length >= 2) {
        cands = emptyCells(g)
          .filter(c => c.e < 0.38 && nbrs(g, c).filter(n => n.pat && n.pat.t === 'bloom').length === 2)
          .sort((a, b) => (a.e - b.e) || byKey(a, b));
      }
      if (!cands || !cands.length) {
        cands = emptyCells(g)
          .filter(c => c.e < 0.32 && nbrs(g, c).filter(n => n.pat && n.pat.t === 'bloom').length === (blooms.length ? 1 : 0)
            && nbrs(g, c).some(n => n.pat && n.pat.t === 'moss'))
          .sort((a, b) => (a.e - b.e) || byKey(a, b));
      }
      if (!cands.length) break;
      if (!g.plant('bloom', HEX.key(cands[0].q, cands[0].r)).ok) break;
      planted++;
    }
  }

  /* actives */
  g.artifacts.forEach((a, i) => {
    if (!a.active || a.charges <= 0) return;
    if (a.spec.id === 'poincare') {
      const t = g.target();
      if ((t != null && g.coherence() < t - 0.04) || (g.stage === 6 && g.coherence() < 0.78)) g.useArtifact(i, null);
    } else if (a.spec.id === 'schrodinger') {
      const cands = emptyCells(g).filter(c => c.e <= 0.6 && nbrs(g, c).some(n => n.pat))
        .sort((a2, b2) => (a2.e - b2.e) || byKey(a2, b2));
      if (cands.length) g.useArtifact(i, HEX.key(cands[0].q, cands[0].r));
    }
  });

  /* fight blight first — tend rotted cells touching the garden */
  let tends = 0;
  while (g.order > reserve && tends < 6 && g.blight && g.blight.size) {
    const rotted = [...g.blight.keys()]
      .map(k => g.cells.get(k))
      .filter(c => c && nbrs(g, c).some(n => n.pat))
      .sort((a, b) => (b.e - a.e) || byKey(a, b));
    if (!rotted.length) break;
    if (!g.tend(HEX.key(rotted[0].q, rotted[0].r)).ok) break;
    tends++;
  }
  /* then tend the worst frontier cells */
  while (g.order > reserve && tends < 9) {
    const cands = cellsOf(g)
      .filter(c => c.e >= 0.5 && (c.pat || nbrs(g, c).some(n => n.pat)))
      .sort((a, b) => (b.e - a.e) || byKey(a, b));
    if (!cands.length) break;
    if (!g.tend(HEX.key(cands[0].q, cands[0].r)).ok) break;
    tends++;
  }

  /* stage 6: gather and wake (in the long game beginCoalescence is a no-op, so
     fall through to endTurn — the bot keeps cultivating toward turn 100) */
  if (g.stage === 6 && g.coalesceReady() && g.beginCoalescence().ok) return;
  g.endTurn();
}

function greedyBot(seed, maxTurns, trace) {
  const g = new Game(seed);
  const arrivals = {};
  while (!g.over && g.turn < (maxTurns || 140)) {
    const st = g.stage;
    greedyTurn(g);
    if (g.stage > st) arrivals[g.stage] = g.turn;
    checkInvariants(g, 'greedy ' + seed + ' t' + g.turn);
    if (trace && g.turn % 10 === 0)
      console.log(`    t${g.turn} stage ${g.stage} C=${g.coherence().toFixed(3)} order=${g.order} income/t≈ arts=${g.artifacts.length}`);
    if (g.turn % 10 === 0) {
      const s1 = JSON.stringify(g.serialize());
      const s2 = JSON.stringify(Game.fromJSON(JSON.parse(s1)).serialize());
      if (s1 !== s2) throw new Error('roundtrip mismatch at t' + g.turn + ' seed ' + seed);
    }
  }
  return { g, arrivals };
}

function chaosBot(seed, turns) {
  const g = new Game(seed);
  const r = new RNG(seed + '|chaos');
  const types = C.PATTERN_ORDER;
  while (!g.over && g.turn < turns) {
    if (g.widenReady && r.chance(0.6)) g.widen();
    if (g.pendingOffer) g.takeOffer(r.i(4) - 1);
    const acts = 1 + r.i(6);
    for (let i = 0; i < acts; i++) {
      const all = cellsOf(g);
      const c = all[r.i(all.length)];
      const k = HEX.key(c.q, c.r);
      const roll = r.f();
      if (roll < 0.5) g.plant(types[r.i(types.length)], k);
      else if (roll < 0.75) g.tend(k);
      else if (roll < 0.85) g.prune(k);
      else if (g.artifacts.length) g.useArtifact(r.i(g.artifacts.length), k);
    }
    g.endTurn();
    checkInvariants(g, 'chaos ' + seed + ' t' + g.turn);
  }
  return g;
}

/* ───────── tests ───────── */
function main() {
  const args = process.argv.slice(2);
  const tune = args.includes('--tune');
  const seedsN = args.includes('--seeds') ? +args[args.indexOf('--seeds') + 1] : 24;

  console.log('LOOPHOLE harness — node', process.version);

  /* content sanity */
  console.log('\n[content]');
  ok(C.ECHOES.length === 24, 'there are 24 echoes');
  ok(Object.keys(C.LEGENDARIES).length >= 20, '≥20 legendaries', Object.keys(C.LEGENDARIES).length + '');
  let built = 0;
  for (const id of Object.keys(C.LEGENDARIES)) {
    const a = C.buildArtifact({ id });
    if (a.name && a.desc && a.sigilSeed != null) built++;
  }
  ok(built === Object.keys(C.LEGENDARIES).length, 'every legendary builds');
  {
    const g = new Game('artifact-roll');
    const names = new Set();
    let valid = 0;
    for (let i = 0; i < 1000; i++) {
      const s = C.rollAntFind(g);
      const a = C.buildArtifact(s);
      if (a.name && a.desc && (a.mods || a.hooks || a.active)) valid++;
      names.add(a.name + '|' + a.desc);
    }
    ok(valid === 1000, '1000 rolled artifacts all valid', valid + '');
    ok(names.size > 250, 'artifact permutations are plentiful', names.size + ' distinct');
    let offers = true, freeAreNotLegend = true, legendIsLegend = true;
    for (let i = 0; i < 50; i++) {
      const o = C.rollOffer(g);
      if (!o.cards || o.cards.length !== 3 || o.cards.some(s => !C.buildArtifact(s).name)) offers = false;
      if (o.cards.some(s => C.buildArtifact(s).rarity === 'legendary')) freeAreNotLegend = false;
      if (o.legend && C.buildArtifact(o.legend).rarity !== 'legendary') legendIsLegend = false;
    }
    ok(offers, '50 offers of 3 free cards all build');
    ok(freeAreNotLegend, 'free cards are never legendary (paid slot only)');
    ok(legendIsLegend, 'the paid slot, when present, is a legendary');
  }

  /* echo sequencing */
  console.log('\n[echoes]');
  {
    let owned = [], runs = 0;
    while (owned.length < 23 && runs < 10) {
      const g = new Game('echo' + runs, { echoes: owned });
      for (let i = 0; i < 40; i++) g._occasion('occ' + i, null);
      owned = [...g.echoOwned].sort((a, b) => a - b);
      runs++;
    }
    ok(owned.length === 23, 'all 23 murmurs reachable across runs', `got ${owned.length} in ${runs} runs`);
    ok(owned.every((v, i) => v === i), 'murmurs 0..22 all owned exactly once');
    const g = new Game('echo-cap', { echoes: [] });
    for (let i = 0; i < 40; i++) g._occasion('occ' + i, null);
    ok(g.echoesThisRun === g.echoCap(), 'per-run echo cap respected', g.echoesThisRun + '/' + g.echoCap());
    /* occasion preference: a fitting murmur steps forward within its movement */
    const g2 = new Game('echo-pref', { echoes: [] });
    g2._occasion('storm1', null);
    ok(g2.echoOwned.has(5), 'storm occasion pulls the camus murmur (vi swap within movement)', [...g2.echoOwned].join(','));
  }

  /* determinism */
  console.log('\n[determinism]');
  {
    const a = greedyBot('det-seed', 60).g.serialize();
    const b = greedyBot('det-seed', 60).g.serialize();
    ok(JSON.stringify(a) === JSON.stringify(b), 'same seed + same play = same world');
  }

  /* terrain */
  console.log('\n[terrain]');
  {
    let varied = 0, allLoam = 0;
    for (let i = 0; i < 20; i++) {
      const g = new Game('terra-' + i);
      const soils = new Set([...g.cells.values()].map(c => c.soil));
      if (soils.size >= 3) varied++;
      if (soils.size === 1) allLoam++;
    }
    ok(varied >= 16, 'maps have varied biomes (≥3 kinds on ≥16/20 seeds)', varied + '/20');
    ok(allLoam === 0, 'no map is a single biome', allLoam + ' flat');
    /* terrain is part of the deterministic world */
    const g1 = new Game('terra-det'), g2 = new Game('terra-det');
    const soilStr = g => [...g.cells.values()].sort(byKey).map(c => c.soil).join(',');
    ok(soilStr(g1) === soilStr(g2), 'terrain is deterministic from seed');
  }

  /* stakes: idleness dissolves */
  console.log('\n[stakes]');
  {
    const g = idleBot('idle-1');
    ok(g.over && !g.won, 'an untended garden dissolves', `over=${g.over} won=${g.won} turn=${g.turn}`);
    ok(g.turn < 60, 'dissolution comes reasonably fast', 't=' + g.turn);
  }

  /* fuzz */
  console.log('\n[fuzz]');
  {
    let threw = null;
    for (let i = 0; i < 60 && !threw; i++) {
      try { chaosBot('chaos-' + i, 50); } catch (e) { threw = e; }
    }
    ok(!threw, '60 chaos runs, no exceptions, invariants hold', threw && threw.message);
  }

  /* playability: greedy wins */
  console.log('\n[balance]');
  {
    let wins = 0, losses = 0, stalls = 0;
    const winTurns = [], stageArr = [[], [], [], [], []];
    let findCount = 0, stormCount = 0, echoTotal = 0;
    for (let i = 0; i < seedsN; i++) {
      const { g, arrivals } = greedyBot('bal-' + i, 140);
      if (g.won) { wins++; winTurns.push(g.turn); }
      else if (g.over) losses++;
      else stalls++;
      for (let s = 2; s <= 6; s++) if (arrivals[s]) stageArr[s - 2].push(arrivals[s]);
      findCount += g.finds;
      stormCount += g.stats.stormsSeen;
      echoTotal += g.echoesThisRun;
      if (tune) {
        const why = g.won ? 'WIN ' + g.turn : (g.over ? 'DISSOLVED t' + g.turn : 'stall s' + g.stage + ' C=' + g.coherence().toFixed(2));
        console.log(`    seed bal-${i}: ${why} arts=${g.artifacts.length} echoes=${g.echoesThisRun}`);
      }
    }
    const med = arr => arr.length ? arr.sort((x, y) => x - y)[Math.floor(arr.length / 2)] : '-';
    console.log(`    wins=${wins}/${seedsN} losses=${losses} stalls=${stalls} medianWin=${med(winTurns)}`);
    console.log(`    median stage arrivals: 2→${med(stageArr[0])} 3→${med(stageArr[1])} 4→${med(stageArr[2])} 5→${med(stageArr[3])} 6→${med(stageArr[4])}`);
    console.log(`    avg ant finds/run=${(findCount / seedsN).toFixed(2)} storms/run=${(stormCount / seedsN).toFixed(1)} echoes/run=${(echoTotal / seedsN).toFixed(1)}`);
    ok(wins / seedsN >= 0.6, 'greedy bot wins ≥60%', `${wins}/${seedsN}`);
    if (winTurns.length) {
      const m = med(winTurns);
      ok(m >= 30 && m <= 95, 'median win in 30–95 turns (humans run ~1.5× the bot)', m + '');
    }
  }

  console.log('\n' + (failures ? `${failures} FAILURE(S)` : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
}

if (require.main === module) main();
module.exports = { idleBot, greedyBot, chaosBot, greedyTurn, checkInvariants };
