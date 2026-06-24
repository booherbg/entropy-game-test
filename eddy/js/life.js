;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  E.makeLife = function (rng) {
    const list = [];
    let nextId = 1;

    function localBlend(field, i) {
      const v = [field.get(i, E.LUM), field.get(i, E.MIN), field.get(i, E.HUM)];
      const s = v[0] + v[1] + v[2] || 1;
      return new Float32Array([v[0] / s, v[1] / s, v[2] / s]);
    }
    function spawnFromPrimer(field, x, y) {
      const i = E.idx(x, y);
      const diet = localBlend(field, i);              // latch: eat what's in surplus here
      const ent = { id: nextId++, x, y, diet, biomass: 0.5, age: 0, gen: 1, alive: true };
      list.push(ent);
      return ent;
    }
    return { list, spawnFromPrimer, _rng: rng,
      // step() is implemented in Task 5–6
    };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
