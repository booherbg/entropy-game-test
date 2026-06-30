;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  // mulberry32 — fast, seedable, deterministic. The single source of all randomness in the sim.
  B.makeRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // small helpers built on a rng() function
  B.randint = function (rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); };       // inclusive
  B.gauss = function (rng) { return (rng() + rng() + rng() - 1.5) * 0.9; };                      // ~N(0, ~0.5)
  B.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
