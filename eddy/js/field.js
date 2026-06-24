;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  const D = 0.18; // diffusion rate (entropy). ≤0.25 for stability with 4 neighbours.

  E.makeField = function (rng) {
    const N = E.W * E.H;
    const el = new Float32Array(N * E.NEL);
    const variant = new Float32Array(N);
    const scratch = new Float32Array(N * E.NEL);
    // a calm, dull ambient blend everywhere (this is the "gray" the world relaxes toward)
    for (let i = 0; i < N; i++) {
      el[i * E.NEL + E.LUM] = 0.05 + rng() * 0.03;
      el[i * E.NEL + E.MIN] = 0.05 + rng() * 0.03;
      el[i * E.NEL + E.HUM] = 0.04 + rng() * 0.03;
      variant[i] = rng(); // static local flavour map
    }
    function total(k) { let s = 0; for (let i = 0; i < N; i++) s += el[i * E.NEL + k]; return s; }
    function diffuse() {
      for (let k = 0; k < E.NEL; k++) {
        for (let i = 0; i < N; i++) {
          const v = el[i * E.NEL + k];
          let acc = 0;
          E.forNeighbors(i, function (j) { acc += el[j * E.NEL + k] - v; });
          scratch[i * E.NEL + k] = v + D * acc;
        }
      }
      el.set(scratch);
    }
    return { el, variant, total, diffuse,
      // helpers used by later tasks:
      get(i, k) { return el[i * E.NEL + k]; },
      add(i, k, amt) { el[i * E.NEL + k] += amt; },
    };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
