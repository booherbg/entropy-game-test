;(function (root) {
  'use strict';
  // THE CENSUS — a read-only reading of how many biological species live in the garden right now. Speciation
  // already HAPPENS in the sim (isolated clusters drift until their pollen no longer sets seed); the census
  // just makes it legible. It clusters the LIVE flowers by reproductive compatibility (geneticCompat) with a
  // union-find over cross-fertile pairs — touching NO sim state and consuming NO rng, so it's deterministic
  // and cannot perturb the merge or the soul test. Comprehension IS the wonder.
  const B = root.B = root.B || {};
  const C = B.Census = {};
  C.FERTILE = 0.5;   // geneticCompat ≥ this → the two flowers still interbreed freely enough to be one species

  function compat(a, b) { return B.geneticCompat(a.grid, a.beaconHue, b.grid, b.beaconHue); }

  // Cluster live flowers into species. Returns { count, clusters (largest-first), isolation, flowers }.
  // isolation = 1 − mean cross-species compat (0 when a single species): how reproductively separated they are.
  C.species = function (sim, fertile) {
    const th = (fertile == null) ? C.FERTILE : fertile;
    const fs = sim.allFlowers(), n = fs.length;
    const parent = new Array(n); for (let i = 0; i < n; i++) parent[i] = i;
    function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (compat(fs[i], fs[j]) >= th) parent[find(i)] = find(j);
    const groups = new Map();
    for (let i = 0; i < n; i++) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(fs[i]); }
    const clusters = Array.from(groups.values()).sort((a, b) => b.length - a.length);
    let cross = 0, cn = 0;
    for (let a = 0; a < clusters.length; a++) for (let b = a + 1; b < clusters.length; b++)
      for (let x = 0; x < clusters[a].length; x++) for (let y = 0; y < clusters[b].length; y++) { cross += compat(clusters[a][x], clusters[b][y]); cn++; }
    return { count: clusters.length, clusters: clusters, isolation: cn ? 1 - cross / cn : 0, flowers: n };
  };

  // A cluster's representative = the flower most central to it (min mean distance to the rest of its species).
  C.representative = function (cluster) {
    if (cluster.length === 1) return cluster[0];
    let best = cluster[0], bestScore = -Infinity;
    for (let i = 0; i < cluster.length; i++) { let s = 0; for (let j = 0; j < cluster.length; j++) if (i !== j) s += compat(cluster[i], cluster[j]);
      if (s > bestScore) { bestScore = s; best = cluster[i]; } }
    return best;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
