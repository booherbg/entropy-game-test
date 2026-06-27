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
    // the world's "turns" — the emergent phenomena, each witnessed once per world. exposed as the player's
    // gentle objective: cultivate conditions that draw them out (the contemplative-sandbox goal — witness, not win).
    const seen = { hunter: false, decomposer: false, rot: false, cascade: false, symbiosis: false, pack: false, gaia: false };
    const extHist = [];                          // extinctions per observation, to spot a wave above baseline
    const CASCADE_MIN = 8, CASCADE_MULT = 1.3;   // a cascade = >=8 lost at once AND >1.3x the recent rate (baseline churn ~5/obs)
    const PACK_MIN = 8, PACK_FRAC = 0.22;        // a pack = hunters become a real GUILD (>=8 and >=22% of the living), not one lone hunter
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
      // extinctions — counted this observation, so an unusual WAVE can be named
      let extNow = 0;
      for (const rec of codex.values()) {
        if (rec.alive && !cur.has(rec.name)) { rec.alive = false; rec.count = 0; extNow++; emit(tick, 'extinct', `${rec.name} went extinct — witnessed ticks ${rec.firstTick}–${tick}`); }
      }
      // a cascade: an extinction wave well above the recent baseline — the self-organized-criticality
      // avalanches the criticality analysis measured, now surfaced so the drama is felt, not just real.
      const base = extHist.length ? extHist.reduce((a, b) => a + b, 0) / extHist.length : 0;
      if (extNow >= CASCADE_MIN && extNow >= CASCADE_MULT * Math.max(1, base)) {
        if (!seen.cascade) { seen.cascade = true; emit(tick, 'milestone', `the first cascade — ${extNow} lifeforms fell in one wave (extinctions come in avalanches: the edge of chaos)`); }
        else emit(tick, 'cascade', `a cascade — ${extNow} lifeforms fell together`);
      }
      extHist.push(extNow); if (extHist.length > 8) extHist.shift();
      // the pack: hunters cross from a lone predator into a real GUILD — predation is now a force in the world
      // (Leopold's wolves on the mountain). a once-only milestone, distinct from "the first hunters".
      if (!seen.pack) {
        let huntNow = 0, alive = 0; for (const e of sim.life.list) if (e.alive) { alive++; if ((e.pred || 0) > 0.4) huntNow++; }
        if (huntNow >= PACK_MIN && huntNow >= PACK_FRAC * alive) { seen.pack = true; emit(tick, 'milestone', `a pack has risen — ${huntNow} hunters, predation is a force now (the mountain fears its deer)`); }
      }
      // milestones (once each)
      if (!seen.hunter) { for (const [, c] of cur) if (c.predSum / c.count > 0.4) { seen.hunter = true; emit(tick, 'milestone', 'the first hunters — life has begun to eat life'); break; } }
      if (!seen.decomposer) { for (const [, c] of cur) { const d = c.diet; if (d[E.HUM] > d[E.LUM] && d[E.HUM] > d[E.MIN]) { seen.decomposer = true; emit(tick, 'milestone', 'a decomposer arose from the waste — the food web extends itself'); break; } } }
      if (!seen.rot && sim.field.rotTotal && sim.field.rotTotal() > 8) { seen.rot = true; emit(tick, 'milestone', 'a rot has taken hold — but it stalls at the seams between guilds. diversity is your firebreak'); }
      if (!seen.symbiosis) { for (const e of sim.life.list) if (e.alive && e.composite) { seen.symbiosis = true; emit(tick, 'milestone', 'two became one — symbiogenesis: a composite now lives by what neither could alone (Margulis)'); break; } }
      // Gaia: once a thriving world has tuned its albedo (off-path albedo never leaves 0.5) and HOLDS the clime
      // near the optimum after enough ticks that the brightening sun would otherwise have driven it out of band,
      // homeostasis is proven — name it. (gated on tick so the trivial initial clime=0.5 doesn't count.)
      if (!seen.gaia && sim.clime && tick >= 800) {
        let aliveN = 0, regulating = false;
        for (const e of sim.life.list) if (e.alive) { aliveN++; if (Math.abs((e.albedo != null ? e.albedo : 0.5) - 0.5) > 1e-6) regulating = true; }
        if (regulating && aliveN >= 60 && Math.abs(sim.clime() - 0.5) < 0.1) { seen.gaia = true; emit(tick, 'milestone', 'the world holds its temperature — life tunes its albedo to keep the clime habitable against the brightening sun (Gaia: homeostasis, Lovelock & Margulis)'); }
      }
    }
    function recent(n) { return events.slice(-(n || 6)).reverse(); }
    function aliveCount() { let a = 0; for (const r of codex.values()) if (r.alive) a++; return a; }
    function turnsSeen() { let n = 0; for (const k in seen) if (seen[k]) n++; return n; } // how many of the world's turns drawn out
    return { observe, events, milestones, codex, recent, aliveCount, seen, turnsSeen };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
