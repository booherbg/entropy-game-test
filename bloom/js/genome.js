;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  const clamp = B.clamp, randint = B.randint;

  // ── THE KEYSTONE ──────────────────────────────────────────────────────────────────────────────
  // A flower's genome is ~8 genes in two kinds — FORM (symmetry, petalLength, petalSharp, coreSize)
  // and SIGNAL (palette colours + the nectar-guide pattern) — plus a few economy genes. The genome IS
  // the grid: the flower is its bloom (world view), the decode-grid is the same genome sampled down one
  // petal-wedge (inspect view). One genome, two renderings. A pollinator's "key" is the complementary
  // reading apparatus: a preference hue (for the far-scale beacon) + a decoder template (for the near-
  // scale grid). Reward = beaconMatch × gridMatch. Co-evolution drifts grid and decoder until they merge.

  const Genome = B.Genome = {};

  // The plant genome.
  Genome.randomPlant = function (rng) {
    return {
      // FORM
      symmetry: randint(rng, 3, 8),                 // petal count (the radial repeat — why it reads as a flower)
      petalLength: 0.45 + rng() * 0.53,             // 0.45..0.98
      petalSharp: 1 + rng() * 5,                     // 1..6 — round↔pointed
      coreSize: 0.10 + rng() * 0.26,                // 0.10..0.36
      // SIGNAL (indices into the shared pixel palette)
      petalColor: randint(rng, 0, 7),
      guideColor: randint(rng, 0, 7),
      coreColor: randint(rng, 0, 7),
      guidePattern: randint(rng, 0, 7),             // 3 bits → which radial bands carry the guide colour
      // BEACON (far-scale attractor)
      beaconHue: rng(),                             // 0..1
      beaconIntensity: 0.5 + rng() * 0.5,           // 0.5..1
      // ECONOMY — richer = costlier (selection has teeth)
      nectarRate: 0.6 + rng() * 0.9,                // how much nectar this flower stocks per sugar
      pollenRate: 0.6 + rng() * 0.9,                // how much pollen
    };
  };

  // The pollinator key (its heritable reading apparatus + body plan).
  Genome.randomKey = function (rng) {
    const N = B.N, decoder = new Int8Array(N * N);
    for (let i = 0; i < N * N; i++) decoder[i] = randint(rng, 0, 8); // 0..7 palette + 8 EMPTY
    return {
      preference: rng(),                            // beacon hue it's drawn to
      decoder: decoder,                             // its N×N reading template (body markings express this)
      forageRange: 18 + rng() * 22,                 // 18..40 cells
      speed: 0.8 + rng() * 0.6,                     // 0.8..1.4
      dietBias: 0.35 + rng() * 0.3,                 // 0.35..0.65 — nectar vs pollen priority
    };
  };

  // The polar expression — ported verbatim from docs/bloom-mechanisms.html Mechanism 1·b.
  // Every pixel's (normalized r ∈[0,1], angle θ) decides: core / petal / guide-band / empty.
  Genome.regionIndex = function (g, r, theta) {
    if (r < g.coreSize) return g.coreColor | 0;
    const wave = (Math.cos(theta * g.symmetry) + 1) / 2;           // 1 on a petal axis, 0 in the gap
    const reach = g.coreSize + (g.petalLength - g.coreSize) * Math.pow(wave, g.petalSharp);
    if (r <= reach) {
      const along = (r - g.coreSize) / (reach - g.coreSize + 1e-6); // 0..1 out the petal
      const band = Math.min(2, (along * 3) | 0);
      if (wave > 0.6 && ((g.guidePattern >> band) & 1)) return g.guideColor | 0;
      return g.petalColor | 0;
    }
    return -1;                                                      // empty
  };

  // The decode-grid = one petal-wedge, unrolled & downsampled. radius→rows (core→tip), angle→columns.
  // Empty samples become the EMPTY sentinel so a decoder can learn to read the gaps too.
  Genome.decodeGrid = function (g, N) {
    N = N || B.N;
    const grid = new Int8Array(N * N), half = Math.PI / g.symmetry, span = (Math.PI * 2) / g.symmetry;
    for (let i = 0; i < N; i++) {
      const r = (i + 0.5) / N * g.petalLength;
      for (let j = 0; j < N; j++) {
        const th = -half + (j + 0.5) / N * span;
        const idx = Genome.regionIndex(g, r, th);
        grid[i * N + j] = idx < 0 ? B.EMPTY : idx;
      }
    }
    return grid;
  };

  // Mutate — polymorphic (plant genome or key). Clone, then nudge a small number of genes so a single
  // step produces SMOOTH, VISIBLE drift (the bloom and its fingerprint shift only a little). rate scales
  // both how many genes and how far.
  Genome.mutate = function (g, rng, rate) {
    rate = rate == null ? 1 : rate;
    if (g.decoder) return mutateKey(g, rng, rate);
    return mutatePlant(g, rng, rate);
  };

  function mutatePlant(g, rng, rate) {
    const c = {
      symmetry: g.symmetry, petalLength: g.petalLength, petalSharp: g.petalSharp, coreSize: g.coreSize,
      petalColor: g.petalColor, guideColor: g.guideColor, coreColor: g.coreColor, guidePattern: g.guidePattern,
      beaconHue: g.beaconHue, beaconIntensity: g.beaconIntensity, nectarRate: g.nectarRate, pollenRate: g.pollenRate,
    };
    // how many genes to touch this step (usually 1)
    const k = 1 + (rng() < 0.25 * rate ? 1 : 0);
    for (let n = 0; n < k; n++) {
      const pick = randint(rng, 0, 11);
      switch (pick) {
        case 0: c.symmetry = clamp(c.symmetry + (rng() < 0.5 ? -1 : 1), 3, 8); break;
        case 1: c.petalLength = clamp(c.petalLength + B.gauss(rng) * 0.10 * rate, 0.45, 0.98); break;
        case 2: c.petalSharp = clamp(c.petalSharp + B.gauss(rng) * 0.8 * rate, 1, 6); break;
        case 3: c.coreSize = clamp(c.coreSize + B.gauss(rng) * 0.05 * rate, 0.10, 0.36); break;
        case 4: c.petalColor = (c.petalColor + (rng() < 0.5 ? 7 : 1)) % 8; break;
        case 5: c.guideColor = (c.guideColor + (rng() < 0.5 ? 7 : 1)) % 8; break;
        case 6: c.coreColor = (c.coreColor + (rng() < 0.5 ? 7 : 1)) % 8; break;
        case 7: c.guidePattern = c.guidePattern ^ (1 << randint(rng, 0, 2)); break; // flip one band bit
        case 8: c.beaconHue = (c.beaconHue + B.gauss(rng) * 0.06 * rate + 1) % 1; break;
        case 9: c.beaconIntensity = clamp(c.beaconIntensity + B.gauss(rng) * 0.08 * rate, 0.4, 1); break;
        case 10: c.nectarRate = clamp(c.nectarRate + B.gauss(rng) * 0.12 * rate, 0.4, 1.6); break;
        case 11: c.pollenRate = clamp(c.pollenRate + B.gauss(rng) * 0.12 * rate, 0.4, 1.6); break;
      }
    }
    return c;
  }

  function mutateKey(g, rng, rate) {
    const decoder = g.decoder.slice();
    // flip a couple of decoder cells toward a random symbol — the decoder climbs toward the grid here
    const flips = 1 + (rng() < 0.5 * rate ? 1 : 0);
    for (let n = 0; n < flips; n++) decoder[randint(rng, 0, decoder.length - 1)] = randint(rng, 0, 8);
    return {
      preference: (g.preference + B.gauss(rng) * 0.05 * rate + 1) % 1,
      decoder: decoder,
      forageRange: clamp(g.forageRange + B.gauss(rng) * 3 * rate, 12, 48),
      speed: clamp(g.speed + B.gauss(rng) * 0.1 * rate, 0.6, 1.6),
      dietBias: clamp(g.dietBias + B.gauss(rng) * 0.05 * rate, 0.2, 0.8),
    };
  }

  // Lock-and-key fit — fraction of grid cells the decoder reads correctly. The headline metric.
  B.match = function (a, b) {
    const n = a.length; let m = 0;
    for (let i = 0; i < n; i++) if (a[i] === b[i]) m++;
    return m / n;
  };

  // Circular beacon match (hues wrap at 1.0).
  B.beaconMatch = function (prefHue, beaconHue) {
    let d = Math.abs(prefHue - beaconHue); if (d > 0.5) d = 1 - d;
    return 1 - d * 2; // 1 at identical, 0 at opposite
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
