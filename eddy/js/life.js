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
      const ent = { id: nextId++, x, y, diet, biomass: pred0 ? 1.0 : 0.5, age: 0, gen: 1, alive: true, pred: pred0 || 0, crack: 0 };
      list.push(ent);
      return ent;
    }

    // Mode-1 metabolism: eat a diet-weighted bite, keep a fixed ratio as biomass,
    // excrete the surplus as humus. Matter is conserved: field loss == biomass gain.
    const EAT = 0.4, RETAIN = 0.5, EAT_TRADEOFF = 0.0; // obligate predators (>0) starve even with mobility — prey base too small; grazing/omnivory for now
    // compounds (lignin/white-rot): a heritable `crack` trait lets a "cracker" eat the recalcitrant lignin
    // nothing else can. opt-in — when off, lockStep never runs and crack never drifts (no extra rng), so
    // every measured baseline is byte-identical. when on, crackers EVOLVE wherever lignin piles up (a free
    // food bonus there), so a white-rot specialist guild arises unbidden on the locked resource.
    let compounds = false;
    const CRACK_MIN = 0.2, CRACK_RATE = 0.4, MUT_CRACK = 0.06;
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
      // a cracker eats the recalcitrant lignin no ordinary life can touch (compounds only) — conserved:
      // locked → biomass + excreted humus. a free bonus where lignin piles, so `crack` is selected for there.
      if (compounds && (ent.crack || 0) > CRACK_MIN && field.locked[i] > 1e-6) {
        const got = Math.min(CRACK_RATE * ent.crack, field.locked[i]);
        field.locked[i] -= got;
        ent.biomass += got * RETAIN;
        field.add(i, E.HUM, got * (1 - RETAIN));
      }
    }
    // reproduction, mutation toward the local blend, and death → mineralization.
    const REPRO = 2.0, MUT = 0.25, UPKEEP = 0.15, LIFE_CAP = 4000;
    const PRED_BITE = 0.8, PRED_RETAIN = 0.7, PREY_FLOOR = 0.2, SATIETY = 1.8, MUT_PRED = 0.06, MOVE_MIN = 0.2;
    // the rot — an antagonist that pushes back. a disturbance INTENSITY on the field (not matter) that
    // damages the life in its cells (biomass → humus, conserved) and spreads cell-to-cell — FREELY through
    // ground held by one guild, but barely across a guild SEAM. so a uniform monoculture is one open field
    // it sweeps end to end, while a diverse world is a quilt of firebreaks that contains it to a patch.
    // diversity-as-shield (Elton's diversity–stability), expressed on the map's real structure. zero rot ⇒
    // rotStep is a no-op, so the measured baseline world is untouched until a rot is lit.
    const ROT_DAMAGE = 0.3, ROT_SPREAD = 0.45, ROT_MIN = 0.05, ROT_CAP = 2.0;
    const ROT_DECAY_FUEL = 0.08, ROT_DECAY_BARE = 0.5; // rot is FIRE — it burns out fast where its fuel-type isn't
    const ROT_SAME = 1.0, ROT_CROSS = 0.02, ROT_EMPTY = 0.22; // spread into matching fuel / a wrong-guild seam (firebreak) / bare bridge
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
      if (field.barrier[E.idx(nx, ny)]) return; // can't grow into rock (no-op where there's no terrain)
      const local = localBlend(field, E.idx(nx, ny));
      const diet = new Float32Array(E.NEL);
      let s = 0;
      for (let k = 0; k < E.NEL; k++) { diet[k] = ent.diet[k] * (1 - MUT) + local[k] * MUT; s += diet[k]; }
      for (let k = 0; k < E.NEL; k++) diet[k] /= (s || 1); // renormalize
      const pred = Math.max(0, Math.min(1, ent.pred + (rng() * 2 - 1) * MUT_PRED)); // predatory trait drifts; selection shapes it
      let crack = ent.crack || 0;
      if (compounds) crack = Math.max(0, Math.min(1, crack + (rng() * 2 - 1) * MUT_CRACK)); // crack drifts ONLY when compounds on (no extra rng off → baseline byte-identical)
      ent.biomass *= 0.5;                                  // split biomass with the child (conserved)
      list.push({ id: nextId++, x: nx, y: ny, diet, biomass: ent.biomass, age: 0, gen: ent.gen + 1, alive: true, pred, crack });
    }
    // life eats life: tag-matched exchange (v1 = predation). a predatory entity takes a bite of a
    // less-predatory neighbour's biomass — predator gains, the rest returns to humus (conserved).
    // predation/parasitism/mutualism are the same op; this is the take-and-kill sign. `pred` is not
    // authored — it drifts at reproduction and selection shapes it (Holland's Echo / Ray's Tierra).
    // mobility: hunters roam toward prey (down a prey-gradient), producers stay rooted. movement
    // scales with the pred trait, so the world's motion IS the hunters following the herd — and an
    // obligate predator can now follow prey instead of eating out its patch and starving.
    function move(field) {
      const occ = new Map();
      for (const e of list) { if (!e.alive) continue; const k = E.idx(e.x | 0, e.y | 0); let a = occ.get(k); if (!a) { a = []; occ.set(k, a); } a.push(e); }
      const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const h of list) {
        if (!h.alive || h.pred < MOVE_MIN) continue;
        const cx = h.x | 0, cy = h.y | 0;
        let best = -1, bx = cx, by = cy;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= E.W || ny >= E.H) continue;
          if (field.barrier[E.idx(nx, ny)]) continue; // hunters can't enter rock (no-op without terrain)
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
    function seedRot(field, x, y, amt) { field.rot[E.idx(x | 0, y | 0)] += (amt || 4); } // light a rot at a cell
    function rotStep(field) {
      const rot = field.rot, rotType = field.rotType, N = E.W * E.H;
      let any = false; for (let i = 0; i < N; i++) if (rot[i] > ROT_MIN) { any = true; break; }
      if (!any) return; // no rot → no-op (baseline untouched; pure deterministic field op, no rng)
      // per-cell dominant guild from the current life — the FUEL map. -1 = no life.
      const dom = new Int8Array(N).fill(-1), cellD = new Map();
      for (const e of list) {
        if (!e.alive) continue;
        const k = E.idx(e.x | 0, e.y | 0); let a = cellD.get(k); if (!a) { a = [0, 0, 0]; cellD.set(k, a); }
        a[0] += e.diet[0]; a[1] += e.diet[1]; a[2] += e.diet[2];
      }
      for (const [k, a] of cellD) { let d = 0; if (a[1] > a[d]) d = 1; if (a[2] > a[d]) d = 2; dom[k] = d; }
      // a freshly-lit cell takes the local guild as its fire-TYPE (what it burns); default lumen if bare
      for (let i = 0; i < N; i++) if (rot[i] > ROT_MIN && rotType[i] < 0) rotType[i] = dom[i] >= 0 ? dom[i] : 0;
      // 1. damage all life standing in rotted cells (biomass → humus, conserved)
      for (const e of list) {
        if (!e.alive) continue;
        const k = E.idx(e.x | 0, e.y | 0), r = rot[k]; if (r <= ROT_MIN) continue;
        const loss = Math.min(ROT_DAMAGE * r, e.biomass); e.biomass -= loss; field.add(k, E.HUM, loss);
        if (e.biomass <= 1e-6) { field.add(k, E.HUM, Math.max(0, e.biomass)); e.alive = false; }
      }
      // 2. spread (gather then apply). a fire of type T feeds on T-fuel (full), bridges bare ground weakly
      // carrying its type, and is all but BLOCKED by a different guild — the firebreak diversity builds.
      const add = new Float32Array(N), addType = new Int8Array(N).fill(-1), best = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const r = rot[i]; if (r <= ROT_MIN) continue;
        const T = rotType[i], x = i % E.W, y = (i / E.W) | 0;
        const spreadTo = (ni) => {
          if (field.barrier[ni]) return; // rock is a firebreak — the rot cannot cross it (terrain firebreak)
          const dn = dom[ni], mult = dn === T ? ROT_SAME : (dn < 0 ? ROT_EMPTY : ROT_CROSS);
          const c = r * ROT_SPREAD * mult; if (c <= 0) return;
          add[ni] += c; if (c > best[ni]) { best[ni] = c; addType[ni] = T; }
        };
        if (x > 0) spreadTo(i - 1); if (x < E.W - 1) spreadTo(i + 1);
        if (y > 0) spreadTo(i - E.W); if (y < E.H - 1) spreadTo(i + E.W);
      }
      // 3. decay (FAST unless the cell's living fuel matches the fire's type) + apply spread, capped.
      for (let i = 0; i < N; i++) {
        if (rot[i] <= 0 && add[i] <= 0) continue;
        const T = rotType[i] >= 0 ? rotType[i] : addType[i];
        const fueled = T >= 0 && dom[i] === T;
        let v = rot[i] * (1 - (fueled ? ROT_DECAY_FUEL : ROT_DECAY_BARE)) + add[i];
        if (v > ROT_CAP) v = ROT_CAP;
        if (v < 1e-4) { v = 0; rotType[i] = -1; } else if (rotType[i] < 0) rotType[i] = addType[i];
        rot[i] = v;
      }
    }
    function step(field) {
      move(field);
      predate(field);
      rotStep(field);
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

    return { list, spawnFromPrimer, seedRot, step, _rng: rng, dissipated: function () { return _dissipated; },
             setCompounds: function (v) { compounds = !!v; } };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
