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

    // Mode-1 metabolism: eat a diet-weighted bite, keep a fixed ratio as biomass,
    // excrete the surplus as humus. Matter is conserved: field loss == biomass gain.
    const EAT = 0.4, RETAIN = 0.5;
    function metabolize(field, ent) {
      const i = E.idx(ent.x | 0, ent.y | 0);
      let eaten = 0;
      for (let k = 0; k < E.NEL; k++) {
        const want = EAT * ent.diet[k];
        const have = field.get(i, k);
        const take = Math.min(want, have);
        field.add(i, k, -take);            // deplete the field
        eaten += take;
      }
      ent.biomass += eaten * RETAIN;        // keep its ratio as biomass
      field.add(i, E.HUM, eaten * (1 - RETAIN)); // excrete the surplus as humus (conserved)
    }
    function step(field) {
      for (const ent of list) if (ent.alive) { metabolize(field, ent); ent.age++; }
    }

    return { list, spawnFromPrimer, step, _rng: rng };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
