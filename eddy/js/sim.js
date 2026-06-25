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

    let burnRate = 0, lastDiss = 0;
    function tick() {
      field.diffuse();
      E.depositGenerators(field, gens);
      life.step(field);
      field.soilStep();
      E.fertilityStep(field, life, rng);
      const d = life.dissipated(); burnRate += ((d - lastDiss) - burnRate) * 0.1; lastDiss = d; // smoothed 2nd-law flux
    }
    function addGenerator(g) { gens.push(g); }
    function dropPrimer(x, y) { return life.spawnFromPrimer(field, x | 0, y | 0, 10); } // a player's seed brings starter substrate
    function dropPredator(x, y) { return life.spawnFromPrimer(field, x | 0, y | 0, 0, 0.7); } // seed a hunter into a living patch

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

    return { field, life, gens, tick, addGenerator, dropPrimer, dropPredator, stats, hash,
             burnRate: function () { return burnRate; },
             serialize() { return E.serializeSim(field, life, gens, seed); } };
  };

  // Field floats are Float32 — exactly representable in the JSON Float64 round-trip,
  // so set()-ing them back into a Float32Array reproduces the originals bit-for-bit.
  E.serializeSim = function (field, life, gens, seed) {
    return {
      v: 1, seed: seed >>> 0,
      gens: gens.map(g => Object.assign({}, g)),
      field: { el: Array.from(field.el), variant: Array.from(field.variant), soil: Array.from(field.soil) },
      life: life.list.filter(e => e.alive).map(e => ({
        id: e.id, x: e.x, y: e.y, diet: Array.from(e.diet),
        biomass: e.biomass, age: e.age, gen: e.gen, pred: e.pred,
      })),
    };
  };
  E.deserializeSim = function (obj) {
    const field = E.makeField(E.makeRng(1));   // rng only seeds the init we immediately overwrite
    field.el.set(obj.field.el);
    field.variant.set(obj.field.variant);
    if (obj.field.soil) field.soil.set(obj.field.soil);
    const life = E.makeLife(E.makeRng(1));
    for (const e of obj.life) {
      life.list.push({
        id: e.id, x: e.x, y: e.y, diet: new Float32Array(e.diet),
        biomass: e.biomass, age: e.age, gen: e.gen, alive: true, pred: e.pred || 0,
      });
    }
    const gens = (obj.gens || []).map(g => Object.assign({}, g));
    return { field, life, gens };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
