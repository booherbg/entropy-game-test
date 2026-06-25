;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  // The chronicle watches a world and records what emerges — species born, species lost, milestones —
  // and keeps a codex of every species witnessed. This is the legibility of depth: the evolution and
  // the food web stop being numbers and become a felt, narrated history. Pure logic (uses Content.nameFor).
  E.makeChronicle = function () {
    const codex = new Map();  // name -> { name, diet, pred, firstTick, lastTick, peak, count, alive }
    const events = [];        // { tick, kind, text }  (kind: born | extinct | milestone) — recent feed, capped
    const milestones = [];    // rare, important — kept uncapped and pinned
    let sawHunter = false, sawDecomposer = false;
    const ELN = ['lumen', 'mineral', 'humus'];

    function emit(tick, kind, text) {
      const ev = { tick, kind, text };
      events.push(ev); if (events.length > 80) events.shift();
      if (kind === 'milestone') milestones.push(ev);
    }

    function observe(sim, tick) {
      const cur = new Map();
      for (const e of sim.life.list) {
        if (!e.alive) continue;
        const name = E.Content.nameFor(e.diet);
        let c = cur.get(name); if (!c) { c = { count: 0, diet: e.diet, predSum: 0 }; cur.set(name, c); }
        c.count++; c.predSum += (e.pred || 0);
      }
      // births + updates
      for (const [name, c] of cur) {
        const meanPred = c.predSum / c.count;
        let rec = codex.get(name);
        if (!rec) {
          const diet = Array.from(c.diet), dom = diet.indexOf(Math.max(diet[0], diet[1], diet[2]));
          rec = { name, diet, pred: meanPred, dom, firstTick: tick, lastTick: tick, peak: c.count, count: c.count, alive: true };
          codex.set(name, rec);
          emit(tick, 'born', `${name} arose — a ${ELN[dom]}-eater${meanPred > 0.3 ? ', and a hunter' : ''}`);
        } else {
          rec.count = c.count; rec.alive = true; rec.lastTick = tick; rec.pred = meanPred;
          if (c.count > rec.peak) rec.peak = c.count;
        }
      }
      // extinctions
      for (const rec of codex.values()) {
        if (rec.alive && !cur.has(rec.name)) { rec.alive = false; rec.count = 0; emit(tick, 'extinct', `${rec.name} went extinct — witnessed ticks ${rec.firstTick}–${tick}`); }
      }
      // milestones (once each)
      if (!sawHunter) { for (const [, c] of cur) if (c.predSum / c.count > 0.4) { sawHunter = true; emit(tick, 'milestone', 'the first hunters — life has begun to eat life'); break; } }
      if (!sawDecomposer) { for (const [, c] of cur) { const d = c.diet; if (d[E.HUM] > d[E.LUM] && d[E.HUM] > d[E.MIN]) { sawDecomposer = true; emit(tick, 'milestone', 'a decomposer arose from the waste — the food web extends itself'); break; } } }
    }
    function recent(n) { return events.slice(-(n || 6)).reverse(); }
    function aliveCount() { let a = 0; for (const r of codex.values()) if (r.alive) a++; return a; }
    return { observe, events, milestones, codex, recent, aliveCount };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
