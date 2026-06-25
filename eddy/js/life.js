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
    // reproduction, mutation toward the local blend, and death → mineralization.
    const REPRO = 2.0, MUT = 0.25, UPKEEP = 0.15, LIFE_CAP = 4000;
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
      ent.biomass *= 0.5;                                  // split biomass with the child (conserved)
      list.push({ id: nextId++, x: nx, y: ny, diet, biomass: ent.biomass, age: 0, gen: ent.gen + 1, alive: true });
    }
    function step(field) {
      for (const ent of list) {
        if (!ent.alive) continue;
        metabolize(field, ent);
        const i = E.idx(ent.x | 0, ent.y | 0);
        const cost = Math.min(UPKEEP, ent.biomass);
        ent.biomass -= cost; field.add(i, E.HUM, cost);   // upkeep respired back to the field (conserved)
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

    return { list, spawnFromPrimer, step, _rng: rng };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
