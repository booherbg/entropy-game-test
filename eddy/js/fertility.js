;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  const FERT_THRESH = 3.0, MAX_SPAWN = 1, SAMPLE = 400;
  // ambient abiogenesis: where local surplus is rich, a primer forms on its own.
  E.fertilityStep = function (field, life, rng) {
    let spawns = 0;
    for (let s = 0; s < SAMPLE && spawns < MAX_SPAWN; s++) {
      const i = (rng() * E.W * E.H) | 0;
      const surplus = field.get(i, E.LUM) + field.get(i, E.MIN) + field.get(i, E.HUM);
      if (surplus > FERT_THRESH && rng() < (surplus - FERT_THRESH) * 0.01) {
        life.spawnFromPrimer(field, i % E.W, (i / E.W) | 0); spawns++;
      }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
