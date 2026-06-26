;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  const D = 0.18; // diffusion rate (entropy). ≤0.25 for stability with 4 neighbours.

  E.makeField = function (rng) {
    const N = E.W * E.H;
    const el = new Float32Array(N * E.NEL);
    const variant = new Float32Array(N);
    const scratch = new Float32Array(N * E.NEL);
    const soil = new Float32Array(N); // matter life has accreted into the ground (niche construction)
    const rot = new Float32Array(N);     // a disturbance INTENSITY (not matter) — the rot covering a cell
    const rotType = new Int8Array(N).fill(-1); // which guild the rot is BURNING (its fuel-type); -1 = none
    const barrier = new Uint8Array(N);   // terrain: 1 = impassable rock — blocks diffusion (material pools into basins), the rot, and life
    const locked = new Float32Array(N);  // compounds: recalcitrant humus (lignin) — locked away where humus concentrates; only a "cracker" can eat it
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
          if (barrier[i]) { scratch[i * E.NEL + k] = 0; continue; }     // rock holds nothing
          const v = el[i * E.NEL + k];
          let acc = 0;
          E.forNeighbors(i, function (j) { if (!barrier[j]) acc += el[j * E.NEL + k] - v; }); // no flux across rock → material pools against it (basins)
          scratch[i * E.NEL + k] = v + D * acc;
        }
      }
      el.set(scratch);
    }
    // Mode-2 / niche construction: where life's humus piles up, it accretes into persistent SOIL
    // that slowly releases back — a source life builds, which outlasts the geological springs. the
    // substrate shifts from geological (your generators) to biogenic (what life made). conserved
    // (field humus <-> soil), so it cannot drive a runaway.
    const SOIL_FORM_THRESH = 0.1, SOIL_FORM_RATE = 0.05, SOIL_RELEASE = 0.01;
    function soilStep() {
      for (let i = 0; i < N; i++) {
        const hi = i * E.NEL + E.HUM, h = el[hi];
        if (h > SOIL_FORM_THRESH) { const lock = (h - SOIL_FORM_THRESH) * SOIL_FORM_RATE; el[hi] -= lock; soil[i] += lock; }
        const rel = soil[i] * SOIL_RELEASE; soil[i] -= rel; el[hi] += rel;
      }
    }
    function soilTotal() { let s = 0; for (let i = 0; i < N; i++) s += soil[i]; return s; }
    function rotTotal() { let s = 0; for (let i = 0; i < N; i++) s += rot[i]; return s; }
    // compounds (lignin): where humus piles HIGH, a fraction locks into a recalcitrant store that ordinary
    // life cannot eat — it only seeps back very slowly. conserved (field humus <-> locked). gated by the
    // sim's compounds flag, so it never runs (and the baselines never change) unless compounds are on.
    const LOCK_THRESH = 0.7, LOCK_RATE = 0.02, LOCK_RELEASE = 0.002; // only genuine EXCESS humus locks, gently — a lignin-maturation phase, then a richer mature web, without cratering the founder game
    function lockStep() {
      for (let i = 0; i < N; i++) {
        const hi = i * E.NEL + E.HUM, h = el[hi];
        if (h > LOCK_THRESH) { const lock = (h - LOCK_THRESH) * LOCK_RATE; el[hi] -= lock; locked[i] += lock; }
        const rel = locked[i] * LOCK_RELEASE; locked[i] -= rel; el[hi] += rel; // recalcitrant: seeps back far slower than soil
      }
    }
    function lockedTotal() { let s = 0; for (let i = 0; i < N; i++) s += locked[i]; return s; }
    return { el, variant, soil, rot, rotType, barrier, locked, total, diffuse, soilStep, soilTotal, rotTotal, lockStep, lockedTotal,
      get(i, k) { return el[i * E.NEL + k]; },
      add(i, k, amt) { el[i * E.NEL + k] += amt; },
      isBarrier(x, y) { return barrier[E.idx(x, y)] === 1; },
    };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
