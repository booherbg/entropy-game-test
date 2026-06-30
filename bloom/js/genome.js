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
      petalLength: 0.5 + rng() * 0.48,              // 0.5..0.98
      petalSharp: 1 + rng() * 2.5,                   // 1..3.5 — round↔pointed (rounder so blooms read full, not spiky)
      coreSize: 0.10 + rng() * 0.24,                // 0.10..0.34
      // SIGNAL (indices into the shared pixel palette) — these give the bloom AND the decode-grid their 2D pattern
      petalColor: randint(rng, 0, 7),
      guideColor: randint(rng, 0, 7),
      coreColor: randint(rng, 0, 7),
      guidePattern: randint(rng, 0, 7),             // along-petal guide bands (3 bits)
      ringColor: randint(rng, 0, 7),                // concentric nectar-guide rings (RADIAL structure → grid rows)
      ringPattern: randint(rng, 0, 7),              // which of 3 radial bands carry a ring (3 bits)
      veinColor: randint(rng, 0, 7),                // sub-veins across the petal (ANGULAR structure → grid columns)
      veinFreq: randint(rng, 0, 3),                 // 0 = no veins; 1..3 = that many sub-veins per petal
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
    const sym = g.symmetry;
    const wave = (Math.cos(theta * sym) + 1) / 2;                  // 1 on a petal axis, 0 in the gap
    const reach = g.coreSize + (g.petalLength - g.coreSize) * Math.pow(wave, g.petalSharp);
    if (r > reach) return -1;                                      // empty
    let col = g.petalColor | 0;
    // RINGS — concentric bands by radius (independent of angle): structure down the grid ROWS
    const span = g.petalLength - g.coreSize + 1e-6;
    const rb = Math.min(2, (((r - g.coreSize) / span) * 3) | 0);   // 3 radial bands
    if (((g.ringPattern | 0) >> rb) & 1) col = g.ringColor | 0;
    // VEINS — sub-stripes across the petal at a higher harmonic (independent of radius): structure across COLUMNS
    if ((g.veinFreq | 0) > 0 && Math.cos(theta * sym * (g.veinFreq + 1)) > 0.35) col = g.veinColor | 0;
    // along-petal guide bands, on the petal axis (kept)
    const along = (r - g.coreSize) / (reach - g.coreSize + 1e-6);
    if (wave > 0.6 && ((g.guidePattern >> Math.min(2, (along * 3) | 0)) & 1)) col = g.guideColor | 0;
    return col;                                                    // rings × veins × guides → a genuinely 2D glyph
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
      ringColor: g.ringColor | 0, ringPattern: g.ringPattern | 0, veinColor: g.veinColor | 0, veinFreq: g.veinFreq | 0,
      beaconHue: g.beaconHue, beaconIntensity: g.beaconIntensity, nectarRate: g.nectarRate, pollenRate: g.pollenRate,
    };
    // how many genes to touch this step (usually 1)
    const k = 1 + (rng() < 0.25 * rate ? 1 : 0);
    for (let n = 0; n < k; n++) {
      const pick = randint(rng, 0, 15);
      switch (pick) {
        case 0: c.symmetry = clamp(c.symmetry + (rng() < 0.5 ? -1 : 1), 3, 8); break;
        case 1: c.petalLength = clamp(c.petalLength + B.gauss(rng) * 0.10 * rate, 0.5, 0.98); break;
        case 2: c.petalSharp = clamp(c.petalSharp + B.gauss(rng) * 0.5 * rate, 1, 3.5); break;
        case 3: c.coreSize = clamp(c.coreSize + B.gauss(rng) * 0.05 * rate, 0.10, 0.34); break;
        case 4: c.petalColor = (c.petalColor + (rng() < 0.5 ? 7 : 1)) % 8; break;
        case 5: c.guideColor = (c.guideColor + (rng() < 0.5 ? 7 : 1)) % 8; break;
        case 6: c.coreColor = (c.coreColor + (rng() < 0.5 ? 7 : 1)) % 8; break;
        case 7: c.guidePattern = c.guidePattern ^ (1 << randint(rng, 0, 2)); break; // flip one band bit
        case 8: c.ringColor = (c.ringColor + (rng() < 0.5 ? 7 : 1)) % 8; break;
        case 9: c.ringPattern = c.ringPattern ^ (1 << randint(rng, 0, 2)); break;
        case 10: c.veinColor = (c.veinColor + (rng() < 0.5 ? 7 : 1)) % 8; break;
        case 11: c.veinFreq = clamp(c.veinFreq + (rng() < 0.5 ? -1 : 1), 0, 3); break;
        case 12: c.beaconHue = (c.beaconHue + B.gauss(rng) * 0.06 * rate + 1) % 1; break;
        case 13: c.beaconIntensity = clamp(c.beaconIntensity + B.gauss(rng) * 0.08 * rate, 0.4, 1); break;
        case 14: c.nectarRate = clamp(c.nectarRate + B.gauss(rng) * 0.12 * rate, 0.4, 1.6); break;
        case 15: c.pollenRate = clamp(c.pollenRate + B.gauss(rng) * 0.12 * rate, 0.4, 1.6); break;
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

  // Directed inheritance — a new forager inherits the best-fed parent's key, drifting a FEW decoder cells
  // toward the flower that actually fed it (the lineage adapts to the flowers it exploits) plus a little
  // exploratory mutation. Selection still decides which lineage dominates; this just biases mutation toward
  // the niche, so the colony's keys converge on the flowers legibly and visibly (the merge) instead of
  // wandering. The plant side answers via seed-set selection — both apparatus meet in the middle.
  Genome.inheritKey = function (parentKey, targetGrid, targetHue, rng) {
    const decoder = parentKey.decoder.slice();
    if (targetGrid) {                                  // drift toward the experienced flower (2 cells/gen)
      for (let n = 0; n < 2; n++) { const i = randint(rng, 0, decoder.length - 1); decoder[i] = targetGrid[i]; }
    }
    if (rng() < 0.5) decoder[randint(rng, 0, decoder.length - 1)] = randint(rng, 0, 8); // exploration
    let pref = parentKey.preference;
    if (targetHue != null) { let d = targetHue - pref; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; pref += d * 0.3; }
    pref = (pref + B.gauss(rng) * 0.02 + 1) % 1;
    return {
      preference: pref, decoder: decoder,
      forageRange: clamp(parentKey.forageRange + B.gauss(rng) * 2, 12, 48),
      speed: clamp(parentKey.speed + B.gauss(rng) * 0.06, 0.6, 1.6),
      dietBias: clamp(parentKey.dietBias + B.gauss(rng) * 0.04, 0.2, 0.8),
    };
  };

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
