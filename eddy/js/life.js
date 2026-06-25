;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  // a species' niche identity: diet quantized to quarters + a hunter flag — coarse on purpose (it counts
  // meaningfully-distinct ways of making a living, max ~30, not every micro-drift). Shared by the diversity
  // score, the criticality analysis, and keystone predation, so all three mean the same thing by "species".
  E.speciesKey = function (e) {
    return e.diet.map(v => Math.round(v * 4)).join(',') + ((e.pred || 0) > 0.4 ? 'h' : '');
  };

  E.makeLife = function (rng) {
    const list = [];
    let nextId = 1, _dissipated = 0;

    function localBlend(field, i) {
      const v = [field.get(i, E.LUM), field.get(i, E.MIN), field.get(i, E.HUM)];
      const s = v[0] + v[1] + v[2] || 1;
      return new Float32Array([v[0] / s, v[1] / s, v[2] / s]);
    }
    function spawnFromPrimer(field, x, y, starter, pred0) {
      const i = E.idx(x, y);
      if (starter > 0) {                              // a player's primer carries its own substrate, so the seeding takes
        const d = localBlend(field, i);               // biased toward whatever's locally present
        field.add(i, E.LUM, starter * d[E.LUM]);
        field.add(i, E.MIN, starter * d[E.MIN]);
        field.add(i, E.HUM, starter * d[E.HUM]);
      }
      const diet = localBlend(field, i);              // latch: eat what's in surplus here (incl. the starter)
      // pred0>0 seeds a predator (it lives by hunting, not the field) — a player decision; its
      // descendants' pred still drifts, so the predator/prey arms race can evolve from there.
      const ent = { id: nextId++, x, y, diet, biomass: pred0 ? 1.0 : 0.5, age: 0, gen: 1, alive: true, pred: pred0 || 0 };
      list.push(ent);
      return ent;
    }

    // Mode-1 metabolism: eat a diet-weighted bite, keep a fixed ratio as biomass,
    // excrete the surplus as humus. Matter is conserved: field loss == biomass gain.
    const EAT = 0.4, RETAIN = 0.5, EAT_TRADEOFF = 0.0; // obligate predators (>0) starve even with mobility — prey base too small; grazing/omnivory for now
    function metabolize(field, ent) {
      const i = E.idx(ent.x | 0, ent.y | 0);
      // take a diet-weighted bite of each element — but predators are poor producers (they must hunt
      // to live), which is what keeps the predator/producer niche split from diffusing away.
      const eat = EAT * (1 - (ent.pred || 0) * EAT_TRADEOFF);
      const tL = Math.min(eat * ent.diet[E.LUM], field.get(i, E.LUM));
      const tM = Math.min(eat * ent.diet[E.MIN], field.get(i, E.MIN));
      const tH = Math.min(eat * ent.diet[E.HUM], field.get(i, E.HUM));
      field.add(i, E.LUM, -tL); field.add(i, E.MIN, -tM); field.add(i, E.HUM, -tH);
      const eaten = tL + tM + tH;
      ent.biomass += eaten * RETAIN;                 // keep its ratio as biomass
      const ex = 1 - RETAIN;
      // the nutrient cycle, conserved: eating energy/structure (lumen+mineral) excretes organic
      // waste (humus); eating humus MINERALIZES it back to inorganic (lumen+mineral) — like a
      // real decomposer. this closes producer→humus→decomposer→inorganic→producer and stops the
      // humus loop from being a free pasture a monoculture can farm.
      field.add(i, E.HUM, (tL + tM) * ex);
      field.add(i, E.LUM, tH * ex * 0.5);
      field.add(i, E.MIN, tH * ex * 0.5);
    }
    // reproduction, mutation toward the local blend, and death → mineralization.
    const REPRO = 2.0, MUT = 0.25, UPKEEP = 0.15, LIFE_CAP = 4000;
    const PRED_BITE = 0.8, PRED_RETAIN = 0.7, PREY_FLOOR = 0.2, SATIETY = 1.8, MUT_PRED = 0.06, MOVE_MIN = 0.2;
    function neighborCell(ent) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const d = dirs[(rng() * 4) | 0];
      const nx = Math.min(E.W - 1, Math.max(0, (ent.x | 0) + d[0]));
      const ny = Math.min(E.H - 1, Math.max(0, (ent.y | 0) + d[1]));
      return { nx, ny };
    }
    function reproduce(field, ent) {
      if (list.length >= LIFE_CAP) return;
      const { nx, ny } = neighborCell(ent);
      const local = localBlend(field, E.idx(nx, ny));
      const diet = new Float32Array(E.NEL);
      let s = 0;
      for (let k = 0; k < E.NEL; k++) { diet[k] = ent.diet[k] * (1 - MUT) + local[k] * MUT; s += diet[k]; }
      for (let k = 0; k < E.NEL; k++) diet[k] /= (s || 1); // renormalize
      const pred = Math.max(0, Math.min(1, ent.pred + (rng() * 2 - 1) * MUT_PRED)); // predatory trait drifts; selection shapes it
      ent.biomass *= 0.5;                                  // split biomass with the child (conserved)
      list.push({ id: nextId++, x: nx, y: ny, diet, biomass: ent.biomass, age: 0, gen: ent.gen + 1, alive: true, pred });
    }
    // life eats life: tag-matched exchange (v1 = predation). a predatory entity takes a bite of a
    // less-predatory neighbour's biomass — predator gains, the rest returns to humus (conserved).
    // predation/parasitism/mutualism are the same op; this is the take-and-kill sign. `pred` is not
    // authored — it drifts at reproduction and selection shapes it (Holland's Echo / Ray's Tierra).
    // mobility: hunters roam toward prey (down a prey-gradient), producers stay rooted. movement
    // scales with the pred trait, so the world's motion IS the hunters following the herd — and an
    // obligate predator can now follow prey instead of eating out its patch and starving.
    function move() {
      const occ = new Map();
      for (const e of list) { if (!e.alive) continue; const k = E.idx(e.x | 0, e.y | 0); let a = occ.get(k); if (!a) { a = []; occ.set(k, a); } a.push(e); }
      const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const h of list) {
        if (!h.alive || h.pred < MOVE_MIN) continue;
        const cx = h.x | 0, cy = h.y | 0;
        let best = -1, bx = cx, by = cy;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= E.W || ny >= E.H) continue;
          const a = occ.get(E.idx(nx, ny)); let score = 0;
          if (a) for (const e of a) if (e !== h && e.alive && e.pred < h.pred - 0.05 && e.biomass > PREY_FLOOR) score += e.biomass;
          if (score > best) { best = score; bx = nx; by = ny; } // ties keep current (dirs[0]) → stay-bias
        }
        h.x = bx; h.y = by;
      }
    }
    function predate(field) {
      const occ = new Map(), pop = new Map();
      for (const e of list) {
        if (!e.alive) continue;
        const k = E.idx(e.x | 0, e.y | 0); let a = occ.get(k); if (!a) { a = []; occ.set(k, a); } a.push(e);
        const sk = E.speciesKey(e); pop.set(sk, (pop.get(sk) || 0) + 1); // species census, for keystone targeting
      }
      const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const pr of list) {
        if (!pr.alive || pr.pred <= 0.02 || pr.biomass >= SATIETY) continue; // sated or barely predatory → skip
        const cx = pr.x | 0, cy = pr.y | 0;
        // keystone predation (Paine 1966): among reachable prey, take one of the most ABUNDANT species —
        // cropping the competitive dominant frees resource for rarer niches, so hunting raises diversity
        // rather than thinning everyone evenly. ties keep the first found → deterministic.
        let prey = null, preyPop = -1;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= E.W || ny >= E.H) continue;
          const a = occ.get(E.idx(nx, ny)); if (!a) continue;
          for (const e of a) {
            if (e === pr || !e.alive || e.pred >= pr.pred - 0.05 || e.biomass <= PREY_FLOOR) continue;
            const p = pop.get(E.speciesKey(e)) || 0;
            if (p > preyPop) { preyPop = p; prey = e; }
          }
        }
        if (!prey) continue;
        const bite = Math.min(PRED_BITE * pr.pred, prey.biomass - PREY_FLOOR);
        if (bite <= 0) continue;
        prey.biomass -= bite;
        pr.biomass += bite * PRED_RETAIN;
        field.add(E.idx(cx, cy), E.HUM, bite * (1 - PRED_RETAIN)); // the kill's waste, conserved
        if (prey.biomass <= 1e-6) { field.add(E.idx(prey.x | 0, prey.y | 0), E.HUM, Math.max(0, prey.biomass)); prey.alive = false; }
      }
    }
    function step(field) {
      move();
      predate(field);
      for (const ent of list) {
        if (!ent.alive) continue;
        metabolize(field, ent);
        const i = E.idx(ent.x | 0, ent.y | 0);
        const cost = Math.min(UPKEEP, ent.biomass);
        ent.biomass -= cost; _dissipated += cost;          // upkeep dissipates — maintenance energy leaves as heat (the 2nd-law sink, bounds the world by flow)
        if (ent.biomass >= REPRO) reproduce(field, ent);
        if (ent.biomass <= 1e-6) { field.add(i, E.HUM, Math.max(0, ent.biomass)); ent.alive = false; }
        ent.age++;
      }
      // occasionally compact the dead to bound memory
      const liveCount = list.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
      if (list.length > 64 && list.length > 2 * liveCount) {
        for (let w = list.length - 1; w >= 0; w--) if (!list[w].alive) list.splice(w, 1);
      }
    }

    return { list, spawnFromPrimer, step, _rng: rng, dissipated: function () { return _dissipated; } };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
