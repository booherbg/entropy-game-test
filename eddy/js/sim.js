;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  E.makeSim = function (seed) {
    seed = seed >>> 0;
    const rng = E.makeRng(seed);
    const field = E.makeField(E.makeRng((seed ^ 0x9e3779b9) >>> 0));
    const life = E.makeLife(E.makeRng((seed ^ 0x85ebca6b) >>> 0));
    const gens = [];

    function tick() {
      field.diffuse();
      E.depositGenerators(field, gens);
      life.step(field);
      E.fertilityStep(field, life, rng);
    }
    function addGenerator(g) { gens.push(g); }
    function dropPrimer(x, y) { return life.spawnFromPrimer(field, x | 0, y | 0); }

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

    return { field, life, gens, tick, addGenerator, dropPrimer, stats, hash,
             serialize() { return E.serializeSim(field, life, gens, seed); } };
  };

  // stub; Task 9 replaces this with a full deterministic serializer.
  E.serializeSim = E.serializeSim || function (field, life, gens, seed) { return { seed: seed, gens: gens.slice() }; };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
