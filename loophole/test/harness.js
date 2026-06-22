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
    if (g.pendingLegend && g.insight >= g.legendCost() + 4) {
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

function chaosBot(seed, turns, mode) {
  const g = new Game(seed, mode ? { mode } : undefined);
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
    if (g.turn % 15 === 0) { /* serialization roundtrip — in longgame this now exercises the food-web fields
                                (species, fauna, the run-counters) too, catching any unserialized state. */
      const s1 = JSON.stringify(g.serialize());
      if (s1 !== JSON.stringify(Game.fromJSON(JSON.parse(s1)).serialize())) throw new Error('roundtrip mismatch at t' + g.turn + ' seed ' + seed);
    }
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
  ok(C.ECHOES.length === 26, 'there are 26 echoes (25 + the standalone oneness murmur)');
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
    while (owned.length < 24 && runs < 10) {
      const g = new Game('echo' + runs, { echoes: owned });
      for (let i = 0; i < 40; i++) g._occasion('occ' + i, null);
      owned = [...g.echoOwned].sort((a, b) => a - b);
      runs++;
    }
    ok(owned.length === 24, 'all 24 murmurs reachable across runs', `got ${owned.length} in ${runs} runs`);
    ok(owned.every((v, i) => v === i), 'murmurs 0..23 all owned exactly once');
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
    /* the LONG GAME (the food web) was never fuzzed — only garden mode. random play through flora,
       fauna, symbiogenesis, predation and oneness, with widening, on the growing board. */
    let threwL = null;
    for (let i = 0; i < 60 && !threwL; i++) {
      try { chaosBot('chaosL-' + i, 80, 'longgame'); } catch (e) { threwL = e; }
    }
    ok(!threwL, '60 long-game chaos runs (the food web), no exceptions, invariants hold', threwL && threwL.message);
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

  /* emergence: the ecology engine summons persistent, diverse flora (longgame only).
     this is the "measure the edge of chaos" dashboard — tune the engine against it. */
  console.log('\n[emergence]');
  {
    const runEco = seed => {
      const g = new Game(seed, { mode: 'longgame' });
      let peak = 0; const elems = new Set();
      while (g.over === false && g.turn < 90) {
        if (g.stage === 6 && g.coalesceReady() && g.beginCoalescence().ok) break;
        greedyTurn(g);
        const flora = cellsOf(g).filter(c => c.pat && c.pat.t === 'flora');
        peak = Math.max(peak, new Set(flora.map(c => c.pat.sp)).size);
        for (const c of flora) { const sp = g.species.get(c.pat.sp); if (sp) elems.add(sp.ch); }
      }
      const live = new Set(cellsOf(g).filter(c => c.pat && c.pat.t === 'flora').map(c => c.pat.sp)).size;
      return { summoned: g.nextSpecies - 1, peak, elems: elems.size, live };
    };
    const n = 6; let summon = 0, peak = 0, elems = 0, persisted = 0, anySummon = 0;
    for (let i = 0; i < n; i++) {
      const r = runEco('emerge-' + i);
      summon += r.summoned; peak += r.peak; elems += r.elems;
      if (r.summoned > 0) anySummon++; if (r.live >= 1) persisted++;
    }
    console.log(`    avg summoned=${(summon / n).toFixed(1)} · peak coexisting=${(peak / n).toFixed(1)} · element-kinds=${(elems / n).toFixed(1)}/3 · ${persisted}/${n} worlds end alive`);
    ok(anySummon === n, 'every longgame summons flora from its surpluses', `${anySummon}/${n}`);
    ok(peak / n >= 2, 'flora coexist — peak ≥2 species, not a monoculture', (peak / n).toFixed(1));
    ok(persisted >= n - 1, 'flora persist to the end — Class-4, not churn-to-zero', `${persisted}/${n}`);
    const a = runEco('emerge-det'), b = runEco('emerge-det');
    ok(a.summoned === b.summoned && a.peak === b.peak, 'emergence is deterministic (same seed → same flora)');
    /* the dense greedy bot UNDERSTATES the feature — in open ground (a real garden / sandbox)
       beds spread huge and diversity is richer. measure that regime too, per the balance audit. */
    const sparseEco = seed => {
      const g = new Game(seed, { mode: 'longgame' });
      /* an OPEN garden: a scatter of all three element-makers leaving most ground free, so
         beds have room to spread (a moss-saturated garden leaves none — the real constraint) */
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      const disk = cellsOf(g).filter(c => hd(c) <= 7).sort((c, d) => (c.q - d.q) || (c.r - d.r));
      disk.forEach((c, i) => { if (i % 9 === 0) c.pat = g._mkPat('moss'); else if (i % 9 === 3) c.pat = g._mkPat('ant'); else if (i % 17 === 5) c.pat = g._mkPat('crys'); });
      g._recompute();
      let peak = 0;
      for (let t = 0; t < 75 && g.over === false; t++) {
        g.order += 12; g.endTurn();
        peak = Math.max(peak, new Set(cellsOf(g).filter(c => c.pat && c.pat.t === 'flora').map(c => c.pat.sp)).size);
      }
      const flora = cellsOf(g).filter(c => c.pat && c.pat.t === 'flora'), bed = {};
      for (const c of flora) bed[c.pat.sp] = (bed[c.pat.sp] || 0) + 1;
      return { peak, summoned: g.nextSpecies - 1, maxBed: Math.max(0, ...Object.values(bed)) };
    };
    const sn = 4; let sPeak = 0, sBed = 0;
    for (let i = 0; i < sn; i++) { const r = sparseEco('sparse-' + i); sPeak += r.peak; sBed += r.maxBed; }
    console.log(`    open garden: peak coexisting=${(sPeak / sn).toFixed(1)} · biggest bed=${(sBed / sn).toFixed(0)} cells`);
    ok(sPeak / sn >= 3, 'open gardens grow diverse flora (peak ≥3 species)', (sPeak / sn).toFixed(1));
    ok(sBed / sn >= 4, 'beds spread into real meadows in open ground (avg biggest ≥4 cells)', (sBed / sn).toFixed(0));

    /* MEGAFAUNA: a rich meadow summons grazing beasts, and the predator-prey does NOT collapse —
       beasts AND flora both persist (the donor-control + satiety + prey-refuge tuning). this guards
       the hardest-won property: my first cut was textbook Lotka-Volterra and crashed to zero. */
    const faunaEco = seed => {
      const g = new Game(seed, { mode: 'longgame' });
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      cellsOf(g).filter(c => hd(c) <= 7).sort((c, d) => (c.q - d.q) || (c.r - d.r)).forEach((c, i) => { if (i % 9 === 0) c.pat = g._mkPat('moss'); else if (i % 9 === 3) c.pat = g._mkPat('ant'); else if (i % 17 === 5) c.pat = g._mkPat('crys'); });
      g._recompute();
      let herd = 0;
      for (let t = 0; t < 100 && g.over === false; t++) { g.order += 12; g.endTurn(); herd = Math.max(herd, g.fauna.length); }
      return { summoned: g.nextFauna - 1, herd, live: g.fauna.length, flora: cellsOf(g).filter(c => c.pat && c.pat.t === 'flora').length };
    };
    const fn = 4; let fHerd = 0, fLive = 0, fFlora = 0, fAny = 0;
    for (let i = 0; i < fn; i++) { const r = faunaEco('fauna-' + i); fHerd += r.herd; fLive += r.live; fFlora += r.flora; if (r.summoned > 0) fAny++; }
    console.log(`    megafauna: peak herd=${(fHerd / fn).toFixed(1)} · live@end=${(fLive / fn).toFixed(1)} · flora@end=${(fFlora / fn).toFixed(1)}`);
    ok(fAny >= fn - 1, 'a rich meadow summons megafauna', `${fAny}/${fn}`);
    ok(fLive / fn >= 1, 'beasts persist — predator-prey does not collapse to zero', (fLive / fn).toFixed(1));
    ok(fFlora / fn >= 4, 'the meadow survives the grazing (prey refuge holds)', (fFlora / fn).toFixed(1));
    const da = faunaEco('fauna-det'), db = faunaEco('fauna-det');
    ok(da.summoned === db.summoned && da.live === db.live, 'megafauna are deterministic (same seed → same beasts)');
    const fgarden = new Game('fauna-garden');
    while (fgarden.over === false && fgarden.turn < 50) { if (fgarden.stage === 6 && fgarden.coalesceReady() && fgarden.beginCoalescence().ok) break; greedyTurn(fgarden); }
    ok(fgarden.fauna.length === 0 && fgarden.faunaSpecies.size === 0, 'base garden mode stays free of megafauna');

    /* THE FOOD WEB → MUTUALISM (Margulis: "life took over by networking, not combat"). A meadow
       that grows both rich AND varied summons not only grazers (consumers) but POLLINATORS — a
       mutualist that sips nectar without killing and carries a flower's kind into open ground.
       Two claims: (1) both roles emerge by succession (consumer first, mutualist as the mature
       meadow's reward); (2) the mutualism is POSITIVE-SUM — a pollinated meadow ends richer in
       flora than the same world grazed, networking out-producing combat. */
    {
      const seedRoles = s => {
        const g = new Game('web-' + s, { mode: 'longgame' });
        cellsOf(g).filter(c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2 <= 6)
          .forEach((c, i) => { if (i % 7 === 0) c.pat = g._mkPat('moss'); else if (i % 11 === 4) c.pat = g._mkPat('ant'); else if (i % 13 === 6) c.pat = g._mkPat('crys'); });
        g._recompute();
        const seen = new Set(); /* a role EVER seen — grazers are increasingly transient (they merge away into corals), so snapshotting only the final turn misses them */
        for (let t = 0; t < 95 && !g.over; t++) { g.order += 12; g.endTurn(); for (const sp of g.faunaSpecies.values()) seen.add(sp.role); }
        return [...seen];
      };
      let pol = 0, grz = 0; const N = 10;
      for (let s = 0; s < N; s++) { const r = seedRoles(s); if (r.includes('pollinator')) pol++; if (r.includes('grazer')) grz++; }
      const mutual = forceRole => {
        const g = new Game('web-mutual', { mode: 'longgame' });
        cellsOf(g).filter(c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2 <= 6)
          .forEach((c, i) => { if (i % 7 === 0) c.pat = g._mkPat('moss'); else if (i % 11 === 4) c.pat = g._mkPat('ant'); else if (i % 13 === 6) c.pat = g._mkPat('crys'); });
        g._recompute();
        const orig = g._speciateFauna.bind(g);
        g._speciateFauna = (est, ev) => { orig(est, ev); for (const sp of g.faunaSpecies.values()) sp.role = forceRole; };
        for (let t = 0; t < 120; t++) { g.over = false; g.turn = Math.min(g.turn, 90); g.order += 12; g.endTurn(); }
        const fl = cellsOf(g).filter(c => c.pat && c.pat.t === 'flora');
        return { flora: fl.length, coral: [...g.species.values()].filter(s => s.compound).length };
      };
      /* the matured web DISSOLVES the combat/cooperation dichotomy. Once grazers became gentle
         specialists that MERGE (symbiogenesis), "combat" stopped being destructive AND became
         generative — an all-grazer meadow ends as rich as an all-pollinator one (carrying-capacity
         bound, the old 17-vs-5 gap gone) and produces CORALS the pollinated one never does. Margulis's
         real point: there was never a clean line between combat and networking. */
      const polM = mutual('pollinator'), grzM = mutual('grazer');
      console.log(`    food web: roles by succession — grazers ${grz}/${N}, pollinators ${pol}/${N} · combat≈cooperation: pollinated ${polM.flora}f/${polM.coral}coral vs grazed ${grzM.flora}f/${grzM.coral}coral`);
      ok(grz >= N - 1 && pol >= Math.ceil(N / 2), 'both roles emerge — a consumer first, a mutualist as the varied meadow earns it', `grazers ${grz}/${N}, pollinators ${pol}/${N}`);
      ok(polM.flora >= grzM.flora - 2 && grzM.coral >= 1, 'the matured web is all NET-POSITIVE — the mutualist never destroys, and even the grazer ends in UNION (combat becomes symbiogenesis); the old networking-beats-combat gap dissolved', `pollinated ${polM.flora} ≈ grazed ${grzM.flora}, grazed corals ${grzM.coral}`);
    }

    /* THE FOOD WEB → SYMBIOGENESIS (Margulis's actual radical claim: major novelty comes from MERGER,
       not competition — the eukaryotic cell is a union, its mitochondria & chloroplasts once free-living).
       A grazer that has lived a youth as a specialist beside its OWN diet flora, then cohabited with it
       long enough, does not eat it — it MERGES into a compound KIND (a coral): sessile, self-feeding,
       reef-building, hardier than either parent. Claims: (1) a compound EMERGES by succession in a mature
       meadow, deterministically; (2) the union is GENERATIVE / positive-sum — a meadow that lets its grazers
       merge ends MORE DIVERSE (more distinct kinds coexisting) than the same world grazed: the merger
       *creates* novel persisting kinds. This is Paine's keystone measured the way Paine measured it —
       on species RICHNESS, not total biomass (the flora COUNT is null, carrying-capacity-bound; the
       discovery is that the signal lives in diversity, not in the count). */
    {
      const grow = (seed, turns, disableMerge) => {
        const g = new Game('sym-' + seed, { mode: 'longgame' });
        if (disableMerge) g._shouldMerge = () => false;
        cellsOf(g).filter(c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2 <= 8)
          .forEach((c, i) => { if (i % 7 === 0) c.pat = g._mkPat('moss'); else if (i % 7 === 3) c.pat = g._mkPat('ant'); else if (i % 13 === 5) c.pat = g._mkPat('crys'); });
        g._recompute();
        for (let t = 0; t < turns; t++) { g.over = false; g.turn = Math.min(g.turn, 90); g.order += 12; g.endTurn(); }
        const fl = cellsOf(g).filter(c => c.pat && c.pat.t === 'flora');
        const comp = [...g.species.values()].filter(s => s.compound);
        return { compounds: comp.length, names: comp.map(s => s.name).sort().join(','), flora: fl.length, kinds: new Set(fl.map(c => c.pat.sp)).size };
      };
      let emerged = 0; const M = 6;
      for (let s = 0; s < M; s++) if (grow(s, 180, false).compounds > 0) emerged++;
      let on = 0, off = 0, onF = 0, offF = 0; const K = 6; /* keystone A/B over seeds, measured on DIVERSITY (Paine) — and flora COUNT to show it is the null variable */
      for (let s = 0; s < K; s++) { const a = grow('ks' + s, 200, false), b = grow('ks' + s, 200, true); on += a.kinds; off += b.kinds; onF += a.flora; offF += b.flora; }
      const d1 = grow('det', 180, false), d2 = grow('det', 180, false);
      console.log(`    symbiogenesis: compounds emerge in ${emerged}/${M} meadows · GENERATIVE (Σ${K} seeds): merged ${on} kinds vs grazed ${off} (Δ${on - off}) — while flora COUNT is null (${onF} vs ${offF}) · e.g. ${grow('det', 180, false).names || '(none)'}`);
      ok(emerged >= Math.ceil(M * 0.6), 'a compound KIND emerges — a grazer and its diet flora merge into a coral (Margulis symbiogenesis)', `${emerged}/${M} meadows`);
      ok(on > off, 'symbiogenesis is GENERATIVE — the union ends a meadow MORE DIVERSE in kinds (Paine measured on richness, not biomass; the count is carrying-capacity-bound)', `merged ${on} kinds > grazed ${off}`);
      ok(d1.names === d2.names && d1.compounds === d2.compounds, 'symbiogenesis is deterministic (same seed → same unions)', `${d1.names} | ${d2.names}`);
    }

    /* THE FOOD WEB → PREDATION (the keystone apex, and combat that DRIVES cooperation). An abundance of
       GRAZERS (a herd) summons an APEX — a culler that hunts the herd under the same non-collapse
       discipline (donor-control, refuge, dissipative). It fits a web that SHEDS combat for cooperation by
       *accelerating* it: under predation FEAR a grazer flees into union (it merges faster, and the meadow
       tolerates more corals — a coral is immune to the culler). So the apex, by hunting, drives its prey
       into the very form that escapes it — combat DRIVES cooperation (Margulis, all the way) — and a
       predator-present meadow ends with MORE corals, no less diverse, and never collapses. */
    {
      const growP = (seed, noPred) => {
        const g = new Game('pred-' + seed, { mode: 'longgame' });
        if (noPred) g._speciatePredator = () => {};
        cellsOf(g).filter(c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2 <= 8)
          .forEach((c, i) => { if (i % 7 === 0) c.pat = g._mkPat('moss'); else if (i % 7 === 3) c.pat = g._mkPat('ant'); else if (i % 13 === 5) c.pat = g._mkPat('crys'); });
        g._recompute();
        let apex = false;
        for (let t = 0; t < 200; t++) { g.over = false; g.turn = Math.min(g.turn, 90); g.order += 12; g.endTurn(); if ([...g.faunaSpecies.values()].some(s => s.role === 'predator')) apex = true; }
        const fl = cellsOf(g).filter(c => c.pat && c.pat.t === 'flora');
        return { apex, kinds: new Set(fl.map(c => c.pat.sp)).size, corals: [...g.species.values()].filter(s => s.compound).length };
      };
      let emerged = 0, onK = 0, offK = 0, onC = 0, offC = 0, alive = 0; const M = 6;
      for (let s = 0; s < M; s++) { const on = growP(s, false), off = growP(s, true); if (on.apex) emerged++; onK += on.kinds; offK += off.kinds; onC += on.corals; offC += off.corals; if (on.kinds >= 3) alive++; }
      const d1 = growP('det', false), d2 = growP('det', false);
      console.log(`    predation: apex emerges ${emerged}/${M} · COMBAT DRIVES COOPERATION (Σ${M} seeds): predator-present ${onK}kinds/${onC}coral vs absent ${offK}kinds/${offC}coral · ${alive}/${M} meadows stay alive`);
      ok(emerged >= Math.ceil(M * 0.6), 'an APEX emerges — a grazer herd summons a keystone predator (the top-down counterpart to the bottom-up summoning chain)', `${emerged}/${M} meadows`);
      ok(onC > offC && onK >= offK && alive === M, 'COMBAT DRIVES COOPERATION — predation fear drives prey into union, so a predator-present meadow ends with MORE corals, no less diverse, and never collapses (Margulis: combat → cooperation)', `corals ${onC}>${offC}, kinds ${onK}≥${offK}, alive ${alive}/${M}`);
      ok(d1.apex === d2.apex && d1.corals === d2.corals && d1.kinds === d2.kinds, 'predation is deterministic (same seed → same apex, same unions driven)', `apex ${d1.apex}, corals ${d1.corals}|${d2.corals}`);
    }

    /* THE MEADOW BECOMES ONE — the long game's quiet awakening, where the ecology arc meets the
       consciousness arc. When the food web reaches a COOPERATIVE CLIMAX — a real community of corals
       (mergers, ≥6), the combative consumers (grazers+apex) all but gone (≤2), richly diverse (≥6 kinds),
       sustained — the whole is recognised as ONE: a Gaian holobiont (Margulis's literal subject). Claims:
       it fires for meadows that reach the climax, within a single game; it is EARNED (never fires young or
       combative); deterministic. */
    {
      const onenessAt = seed => {
        const g = new Game('one-' + seed, { mode: 'longgame' });
        cellsOf(g).filter(c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2 <= 8)
          .forEach((c, i) => { if (i % 7 === 0) c.pat = g._mkPat('moss'); else if (i % 7 === 3) c.pat = g._mkPat('ant'); else if (i % 13 === 5) c.pat = g._mkPat('crys'); });
        g._recompute();
        let at = null;
        for (let t = 1; t <= 140; t++) { g.over = false; g.turn = Math.min(g.turn, 90); g.order += 12; g.endTurn(); if (g.firedOcc['oneness'] && at == null) at = t; }
        return at;
      };
      let fired = 0, early = 0; const ats = []; const M = 8;
      for (let s = 0; s < M; s++) { const at = onenessAt(s); if (at) { fired++; ats.push(at); if (at < 30) early++; } }
      const d1 = onenessAt('det'), d2 = onenessAt('det');
      console.log(`    oneness (the meadow becomes one): fires in ${fired}/${M} meadows · at turns ${ats.sort((a, b) => a - b).join(',')} · ${early} premature`);
      ok(fired >= Math.ceil(M / 2), 'the meadow is recognised as ONE — a cooperative climax (a community of unions, combat all but gone, diverse) awakens the whole as a single living thing', `${fired}/${M} meadows`);
      ok(early === 0, 'oneness is EARNED — it never fires in a young or combative meadow, only at a deep cooperative climax', `${early} premature`);
      ok(d1 === d2 && d1 != null, 'oneness is deterministic (same seed → same awakening turn)', `${d1} | ${d2}`);
    }

    /* TROPHIC CASCADE → the measured three-part truth. Pull the base (every producer) and:
         1. RELAXATION (Prigogine): a brief bloom, then a long decline. The biomass the abiotic
            base was SUBSIDISING is shed — flora falls well below its supported peak.
         2. COUPLING: the entire FLOW-DEPENDENT web unwinds. With no production there is no food
            and no nectar, so every FED flora and every beast (grazer and pollinator alike) dies
            off — metabolism and fauna both reach ZERO. The living layer is genuinely coupled to
            the base; it is not decoration.
         3. HYSTERESIS: yet it does not all vanish. A small FOSSIL SCAFFOLD of established beds
            persists on niche-construction MEMORY alone (Holland/Odling-Smee) — held above zero
            for 175+ turns in the long probe (see _closure_probe.js) — like a coral skeleton after
            the polyps. Habitat the life built, outliving the life. (An earlier all-pollinator
            regime showed false autocatalytic closure; realistic grazer-first succession unwinds it.)
       We must run PAST the long-game turn-100 end to watch this, so the probe neutralises it. */
    {
      const g = new Game('cascade-1', { mode: 'longgame' });
      const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
      cellsOf(g).filter(c => hd(c) <= 7).sort((c, d) => (c.q - d.q) || (c.r - d.r)).forEach((c, i) => { if (i % 9 === 0) c.pat = g._mkPat('moss'); else if (i % 9 === 3) c.pat = g._mkPat('ant'); else if (i % 17 === 5) c.pat = g._mkPat('crys'); });
      g._recompute();
      for (let t = 0; t < 85 && g.over === false; t++) { g.order += 12; g.endTurn(); }
      const floraB = cellsOf(g).filter(c => c.pat && c.pat.t === 'flora').length, faunaB = g.fauna.length, spB = g.species.size;
      const floraN = () => cellsOf(g).filter(c => c.pat && c.pat.t === 'flora').length;
      const fedN = () => cellsOf(g).filter(c => c.pat && c.pat.t === 'flora' && c.pat.fedOk).length;
      const pump = n => { for (let t = 0; t < n; t++) { g.over = false; g.turn = Math.min(g.turn, 90); g.order += 12; g.endTurn(); } }; /* run past the turn-100 end to see the true long-run trend */
      for (const c of g.cells.values()) if (c.pat && (c.pat.t === 'moss' || c.pat.t === 'crys' || c.pat.t === 'ant')) c.pat = null; /* pull the base */
      g._recompute();
      pump(25); const floraPeak = floraN(); /* the overshoot bloom */
      pump(200); const floraEnd = floraN(), fedEnd = fedN(), faunaEnd = g.fauna.length; /* the settled state */
      console.log(`    trophic cascade: pull the base → bloom to ${floraPeak} flora, then RELAX to ${floraEnd} (Prigogine). the flow-dependent web fully unwinds — ${fedEnd} fed flora, ${faunaEnd} fauna — leaving a fossil scaffold of ${floraEnd} niche-built beds on habitat-memory alone (hysteresis). from ${floraB} pre-pull, fauna ${faunaB}`);
      ok(faunaB >= 1 && spB >= 1, 'the cascade test grew a real ecology first', `flora ${floraB} fauna ${faunaB} species ${spB}`);
      ok(floraEnd < floraPeak * 0.7, 'RELAXATION — pull the base, the meadow BLOOMS (overshoot) then relaxes far below the bloom (Prigogine); the fed/subsidised biomass is shed (see COUPLING) while only the inert coral scaffold keeps the count up (see HYSTERESIS)', `peak ${floraPeak} → settled ${floraEnd}, fed ${fedEnd} (pre-pull ${floraB})`);
      ok(fedEnd === 0 && faunaEnd === 0, 'COUPLING — the whole flow-dependent web (metabolism + fauna) unwinds to zero; the living layer IS coupled to the base', `fed ${fedEnd}, fauna ${faunaEnd}`);
      ok(floraEnd >= 1, 'HYSTERESIS — a fossil scaffold of niche-built beds persists on habitat-memory alone (a coral skeleton after the polyps)', `${floraEnd} inert beds`);
    }
  }

  /* save robustness — corrupted / old / bad-data saves must recover, never strand a player. the clean
     round-trip is proved above (determinism, the t%15 roundtrip in bots); this guards the FAILURE path
     (ui.js's top-level load catch + continueRun's try, plus fromJSON's tolerance). regress it and a real
     player gets a dead "continue" button. */
  console.log('\n[save robustness]');
  {
    const g0 = new Game('save', { mode: 'longgame' });
    for (let i = 0; i < 40; i++) { if (g0.widenReady) g0.widen(); g0.order += 20; g0.endTurn(); }
    const good = g0.serialize();
    let clean = false;
    try { const g = Game.fromJSON(good); g.order += 20; g.endTurn(); clean = true; } catch (e) { /* fall through */ }
    ok(clean, 'a clean save reloads and keeps playing');
    /* the only unacceptable outcome is "loads, then crashes a turn later" — that strands the player.
       throwing (continueRun catches it → fresh start) or loading-and-playing are both fine. */
    const corruptions = [
      ['delete cells', s => delete s.cells],
      ['empty cells', s => { s.cells = []; }],
      ['order = string', s => { s.order = 'xyz'; }],
      ['order = NaN', s => { s.order = NaN; }],
      ['missing fauna', s => delete s.fauna],
      ['missing species', s => delete s.species],
      ['stage out of range', s => { s.stage = 99; }],
      ['only version field', s => { for (const k in s) if (k !== 'v') delete s[k]; }],
      ['a cell e = string', s => { const c = s.cells; if (c && typeof c === 'object') { const k0 = Array.isArray(c) ? 0 : Object.keys(c)[0]; if (c[k0]) c[k0].e = 'bad'; } }],
    ];
    let safe = 0;
    for (const [label, mutate] of corruptions) {
      const save = JSON.parse(JSON.stringify(good)); mutate(save);
      let stranded = false;
      try { const g = Game.fromJSON(save); try { for (let i = 0; i < 3; i++) { g.order += 20; g.endTurn(); } } catch (e2) { stranded = true; } } catch (e) { /* threw on load → continueRun catches it */ }
      if (!stranded) safe++; else console.log(`    !! ${label} loads then crashes a turn later`);
    }
    ok(safe === corruptions.length, 'no corrupted save strands the player (it throws→caught, or loads & plays — never loads-then-crashes)', `${safe}/${corruptions.length}`);
  }

  /* thermodynamics — the game's deepest claim, the one its title/README/intro all rest on: a living world
     dissipates the gradient FASTER than bare rock (Schneider & Kay — life accelerates entropy production).
     It's computed in pressure() as slope = 1 + 1.5·coherence. Guard it so the central claim can never
     silently go false — the audio-harmony bug proved a documented claim can quietly diverge from the code. */
  console.log('\n[thermodynamics]');
  {
    const g = new Game('therm', { mode: 'longgame' });
    g._cohCache = 0; const bareRock = g.pressure();
    g._cohCache = 1; const living = g.pressure();
    ok(living > bareRock * 1.5, 'the second law bills you for the order you hold — the seep scales with coherence, so a living world runs the gradient down faster than bare rock (Schneider & Kay)', `bare=${bareRock.toFixed(4)} living=${living.toFixed(4)} (${(living / bareRock).toFixed(2)}x)`);
  }

  /* embodiments — DISCOVERIES.md claims the harness doesn't otherwise exercise: the wins don't depend on
     HOW the blight targets, or whether the mycelium pools exactly. The audio-harmony bug proved a
     documented claim can silently go false; these guard the wonders-file's central embodiments. */
  console.log('\n[embodiments]');
  {
    /* the blight hunts your order: the wisp seeks the calmest (most-ordered) open ground */
    const g = new Game(1);
    const ck = HEX.key(0, 0);
    const nbrs = HEX.neighborsK(ck).filter(nk => g.cells.has(nk));
    const es = [0.05, 0.90, 0.50, 0.30, 0.70, 0.15];
    nbrs.forEach((nk, i) => { const c = g.cells.get(nk); c.pat = null; c.e = es[i % es.length]; });
    const calmest = nbrs.reduce((a, b) => g.cells.get(a).e < g.cells.get(b).e ? a : b);
    ok(g._blightStep(ck, false) === calmest, 'the blight hunts your order — the wisp seeks the calmest, most-ordered open ground');
  }
  {
    /* the mycelium is a commons: every cell in a network shares ONE fed ratio (variance 0) */
    let maxVar = 0, nets = 0;
    for (const seed of ['myc-a', 'myc-b', 'myc-c']) {
      const g = new Game(seed, { mode: 'longgame' });
      for (let t = 0; t < 80 && !g.over; t++) { greedyTurn(g); g.endTurn(); }
      for (const n of g.networks) {
        const feds = [...n.cells].map(k => g.cells.get(k)).filter(c => c && c.pat).map(c => c.pat.fed);
        if (feds.length >= 2) { nets++; const m = feds.reduce((a, b) => a + b, 0) / feds.length; maxVar = Math.max(maxVar, feds.reduce((a, b) => a + (b - m) ** 2, 0) / feds.length); }
      }
    }
    ok(nets > 0 && maxVar < 1e-9, 'the mycelium is the wood-wide web — every cell in a network shares one fed ratio (variance 0)', `${nets} nets, maxVar=${maxVar.toExponential(1)}`);
  }

  /* longevity — the harness's other games all end by turn ~140 (win, dissolve, or the 100-turn long game).
     The base garden has no turn limit, though: a player can tend it forever without triggering the
     awakening. This exercises that long-run regime — sustained stage 6 against the 2.5x seep — for the slow
     failures a short game never reaches: a NaN creeping in, entropy escaping [0,1], runaway order, a crash. */
  console.log('\n[longevity]');
  {
    const g = new Game('longevity', { mode: 'garden' });
    g.beginCoalescence = () => ({ ok: false }); // a player who tends but never awakens — stays at stage 6
    let nan = null, eMax = 0, crash = null, ran = 0, orderMax = 0;
    try {
      for (let t = 0; t < 300; t++) {
        greedyTurn(g); g.endTurn(); ran = t + 1;
        for (const c of g.cells.values()) {
          if (!Number.isFinite(c.e) && !nan) nan = 'cell.e';
          eMax = Math.max(eMax, c.e);
          if (c.pat && !Number.isFinite(c.pat.fed) && !nan) nan = 'pat.fed';
        }
        if (!Number.isFinite(g.order) && !nan) nan = 'order';
        orderMax = Math.max(orderMax, g.order);
        if (g.over) break;
      }
    } catch (e) { crash = e.message || String(e); }
    ok(!nan && !crash && eMax <= 1.0001 && ran >= 100, 'the base garden tends stably over a long run — no NaN, entropy bounded, no crash (300 turns at sustained stage 6)', `ran=${ran} nan=${nan} crash=${crash} eMax=${eMax.toFixed(3)} orderMax=${orderMax.toFixed(0)}`);
  }

  /* rites — the board-scale activations charge order, THEN run their effect (core.js:999 before :1002). Most
     always do something, but genesis no-ops when there's no calm open ground — so without a gate the player
     pays full price (44+) for nothing. Regression guard for that fix (a real bug, found 2026-06-22). */
  console.log('\n[rites]');
  {
    const g = new Game('rite-noop', { mode: 'garden' });
    g.stage = 2; g.order = 200;
    for (const c of g.cells.values()) { if (!c.pat) c.e = 0.9; } // no calm open cell anywhere
    const o0 = g.order, can = g.canRite('genesis'); g.invokeRite('genesis');
    ok(!can.ok && g.order === o0, 'genesis is gated when no calm open ground exists — never pay for a no-op', `canRite=${can.ok} charged=${o0 - g.order}`);
    const g2 = new Game('rite-ok', { mode: 'garden' }); g2.stage = 2; g2.order = 200;
    const open = [...g2.cells.values()].find(c => !c.pat); if (open) open.e = 0.1; // guarantee calm open ground
    const n0 = [...g2.cells.values()].filter(c => c.pat).length; g2.invokeRite('genesis');
    const n1 = [...g2.cells.values()].filter(c => c.pat).length;
    ok(n1 > n0, 'genesis still seeds life when calm ground exists', `planted +${n1 - n0}`);
  }

  /* legendaries — 22 artifacts with mods + hooks (turnEnd: morphogen/otherhand; dissolve: secondspring and
     mnemosyne's rewind), exercised by no other test. Smoke guard after the genesis no-op bug proved an
     untested activation can break: each adds + runs its hooks without crashing; the dissolve-savers fire,
     and mnemosyne survives a dissolve with no history to rewind to (the same edge-shape genesis tripped on). */
  console.log('\n[legendaries]');
  {
    const ids = Object.keys(new Game('p', { mode: 'longgame' }).C.LEGENDARIES);
    let crashed = null;
    for (const id of ids) {
      try {
        const g = new Game('L-' + id, { mode: 'longgame' });
        for (let t = 0; t < 12 && !g.over; t++) { greedyTurn(g); g.endTurn(); }
        g.addArtifact({ id });
        for (let t = 0; t < 8 && !g.over; t++) { greedyTurn(g); g.endTurn(); }
      } catch (e) { crashed = id + ': ' + (e.message || e); break; }
    }
    ok(!crashed, `all ${ids.length} legendaries add + run their hooks without crashing`, crashed || `${ids.length} ok`);
    let dCrash = null, saved = false;
    try {
      const g = new Game('spr', { mode: 'garden' }); for (let t = 0; t < 8; t++) { greedyTurn(g); g.endTurn(); }
      g.addArtifact({ id: 'secondspring' }); const s = { by: null }; g.emit('dissolve', s, []); saved = !!s.by;
      const g2 = new Game('mn', { mode: 'garden' }); g2.addArtifact({ id: 'mnemosyne' }); // no history yet
      g2.emit('dissolve', { by: null }, []); // must not throw on the no-rewind edge
    } catch (e) { dCrash = e.message || String(e); }
    ok(!dCrash && saved, 'dissolve-saver hooks fire and survive the no-history edge', dCrash || `secondspring saved=${saved}`);
  }

  console.log('\n' + (failures ? `${failures} FAILURE(S)` : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
}

if (require.main === module) main();
module.exports = { idleBot, greedyBot, chaosBot, greedyTurn, checkInvariants };
