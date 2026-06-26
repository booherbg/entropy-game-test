;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  E.makeSim = function (seed, snapshot) {
    seed = (snapshot ? snapshot.seed : seed) >>> 0;
    const rng = E.makeRng(seed);
    let field, life, gens;
    if (snapshot) {
      const d = E.deserializeSim(snapshot);
      field = d.field; life = d.life; gens = d.gens;
    } else {
      field = E.makeField(E.makeRng((seed ^ 0x9e3779b9) >>> 0));
      life = E.makeLife(E.makeRng((seed ^ 0x85ebca6b) >>> 0));
      gens = [];
    }

    let burnRate = 0, lastDiss = 0, ticks = 0, autoRot = false, compounds = false;
    // spontaneous rot: a MONOCULTURE rots from within (uniformity = vulnerability) — the antagonist striking
    // unbidden. gated so a diverse world is NEVER touched, and (default OFF) so every measured baseline is
    // byte-identical; the live game turns it on. the gate is checked with no rng unless it passes.
    const IGNITE_CHECK = 30, IGNITE_ALIVE = 80, IGNITE_FRAC = 0.85, IGNITE_RATE = 0.12;
    function maybeIgnite() {
      if (!autoRot || ticks % IGNITE_CHECK !== 0) return;
      let alive = 0; const g = [0, 0, 0];
      for (const e of life.list) { if (!e.alive) continue; alive++; let d = 0; for (let k = 1; k < E.NEL; k++) if (e.diet[k] > e.diet[d]) d = k; g[d]++; }
      if (alive < IGNITE_ALIVE) return;
      if (Math.max(g[0], g[1], g[2]) / alive <= IGNITE_FRAC) return; // a diverse world is untouched — and no rng is drawn
      if (rng() >= IGNITE_RATE) return;                              // rng ONLY past the gate → baseline byte-identical
      let bestCell = -1, bestN = 0; const cc = new Map();            // monoculture & unlucky → ignite at its thickest point
      for (const e of life.list) { if (!e.alive) continue; const key = E.idx(e.x | 0, e.y | 0); const n = (cc.get(key) || 0) + 1; cc.set(key, n); if (n > bestN) { bestN = n; bestCell = key; } }
      if (bestCell >= 0) life.seedRot(field, bestCell % E.W, (bestCell / E.W) | 0, 5);
    }
    function tick() {
      field.diffuse();
      E.depositGenerators(field, gens);
      life.step(field);
      field.soilStep();
      if (compounds) field.lockStep(); // lignin forms only when compounds are on → baselines untouched
      E.fertilityStep(field, life, rng);
      const d = life.dissipated(); burnRate += ((d - lastDiss) - burnRate) * 0.1; lastDiss = d; // smoothed 2nd-law flux
      ticks++; maybeIgnite();
    }
    function addGenerator(g) { gens.push(g); }
    function dropPrimer(x, y) { return life.spawnFromPrimer(field, x | 0, y | 0, 10); } // a player's seed brings starter substrate
    function dropPredator(x, y) { return life.spawnFromPrimer(field, x | 0, y | 0, 0, 0.7); } // seed a hunter into a living patch
    function dropRot(x, y) { return life.seedRot(field, x | 0, y | 0, 5); } // light a rot — it sweeps a uniform patch, stalls at guild seams
    function paintRock(x, y, on) { // shape the land: a small brush of rock (basins concentrate flow; walls firebreak the rot)
      const r = 2;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const nx = (x | 0) + dx, ny = (y | 0) + dy; if (nx < 0 || ny < 0 || nx >= E.W || ny >= E.H) continue;
        if (dx * dx + dy * dy <= r * r) field.barrier[E.idx(nx, ny)] = on ? 1 : 0;
      }
    }

    function stats() {
      const live = life.list.filter(e => e.alive);
      const keys = new Set(live.map(e => e.diet.map(v => Math.round(v * 4)).join(',')));
      return {
        alive: live.length,
        speciesApprox: keys.size,
        fieldTotal: field.total(E.LUM) + field.total(E.MIN) + field.total(E.HUM),
      };
    }
    function hash() {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < field.el.length; i += 7) { h ^= Math.round(field.el[i] * 1000); h = Math.imul(h, 16777619) >>> 0; }
      for (const e of life.list) if (e.alive) { h ^= (e.x | 0) * 131 + (e.y | 0) + Math.round(e.biomass * 100); h = Math.imul(h, 16777619) >>> 0; }
      return h >>> 0;
    }

    return { field, life, gens, tick, addGenerator, dropPrimer, dropPredator, dropRot, paintRock, stats, hash,
             burnRate: function () { return burnRate; },
             setAutoRot: function (v) { autoRot = !!v; }, autoRot: function () { return autoRot; },
             setCompounds: function (v) { compounds = !!v; life.setCompounds(v); },
             serialize() { return E.serializeSim(field, life, gens, seed); } };
  };

  // Field floats are Float32 — exactly representable in the JSON Float64 round-trip,
  // so set()-ing them back into a Float32Array reproduces the originals bit-for-bit.
  E.serializeSim = function (field, life, gens, seed) {
    return {
      v: 1, seed: seed >>> 0,
      gens: gens.map(g => Object.assign({}, g)),
      field: { el: Array.from(field.el), variant: Array.from(field.variant), soil: Array.from(field.soil), rot: Array.from(field.rot), rotType: Array.from(field.rotType), barrier: Array.from(field.barrier), locked: Array.from(field.locked) },
      life: life.list.filter(e => e.alive).map(e => ({
        id: e.id, x: e.x, y: e.y, diet: Array.from(e.diet),
        biomass: e.biomass, age: e.age, gen: e.gen, pred: e.pred, crack: e.crack || 0,
      })),
    };
  };
  E.deserializeSim = function (obj) {
    const field = E.makeField(E.makeRng(1));   // rng only seeds the init we immediately overwrite
    field.el.set(obj.field.el);
    field.variant.set(obj.field.variant);
    if (obj.field.soil) field.soil.set(obj.field.soil);
    if (obj.field.rot) field.rot.set(obj.field.rot);
    if (obj.field.rotType) field.rotType.set(obj.field.rotType);
    if (obj.field.barrier) field.barrier.set(obj.field.barrier);
    if (obj.field.locked) field.locked.set(obj.field.locked);
    const life = E.makeLife(E.makeRng(1));
    for (const e of obj.life) {
      life.list.push({
        id: e.id, x: e.x, y: e.y, diet: new Float32Array(e.diet),
        biomass: e.biomass, age: e.age, gen: e.gen, alive: true, pred: e.pred || 0, crack: e.crack || 0,
      });
    }
    const gens = (obj.gens || []).map(g => Object.assign({}, g));
    return { field, life, gens };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
