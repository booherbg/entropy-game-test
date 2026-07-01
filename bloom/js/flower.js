;(function (root) {
  'use strict';
  const B = root.B = root.B || {};

  // A flower is the plant's signal organ and the pollinator's reward maze, at two scales:
  //   far  — a BEACON (hue + intensity): a long-range attractor matched against a pollinator's preference.
  //   near — a DECODE-GRID (the genome's fingerprint): the pattern a pollinator must read with its decoder.
  // It offers two embodied resources (nectar = energy, pollen = material), restocked from the tree's sugar.
  // A visit's reward = beaconMatch × gridMatch — fumbling when mismatched, rich when the key fits.
  const EXTRACT = 2.0; // base amount a perfectly-matched visit can pull from a full pool

  B.makeFlower = function (genome, x, y, speciesId) {
    return {
      genome: genome,
      x: x, y: y,
      speciesId: speciesId | 0,
      beaconHue: genome.beaconHue,
      beaconIntensity: genome.beaconIntensity,
      honesty: genome.honesty == null ? 1 : genome.honesty, // how much real reward backs the beacon
      lace: genome.lace || 0,                // toxin keyed to the grid — safe to a matched specialist
      grid: B.Genome.decodeGrid(genome),     // the fingerprint — what selection drifts toward the key
      nectar: 0, pollen: 0,                  // pools (restocked from sugar)
      cap: 6,                                // pool ceiling (richer flowers earn a higher cap below)
      pollenOnStigma: 0,                     // pollen delivered by visitors → seed
      seedProgress: 0,                       // accumulates from pollination → reproduction
      locked: false,                         // the lever: a locked grid does not drift between generations

      // Convert delivered sugar into stocked nectar + pollen (per the genome's rates). Richer = costlier;
      // the tree pays the cost (see plant.js). Pools saturate at cap.
      restock: function (sugar) {
        this.nectar = Math.min(this.cap, this.nectar + sugar * genome.nectarRate * 0.8);
        this.pollen = Math.min(this.cap, this.pollen + sugar * genome.pollenRate * 0.8);
      },

      // A pollinator visits. Returns what it extracts + the pollination quality it delivers/enables.
      visit: function (key) {
        const beaconMatch = B.beaconMatch(key.preference, this.beaconHue);
        const gridMatch = B.match(key.decoder, this.grid);
        const eff = beaconMatch * gridMatch;                  // ∈ [0,1]
        const takeNectar = Math.min(this.nectar, eff * EXTRACT);
        const takePollen = Math.min(this.pollen, eff * EXTRACT);
        this.nectar -= takeNectar;
        this.pollen -= takePollen;
        // lace: a forager that reads this flower BADLY (low gridMatch) pays a gentle toxin cost; a matched
        // specialist (gridMatch→1) is immune. "match = safe, mismatch = poisoned."
        const poison = this.lace * (1 - gridMatch) * (0.4 + 0.6 * beaconMatch);
        return { nectar: takeNectar, pollen: takePollen, pollination: eff,
          beaconMatch: beaconMatch, gridMatch: gridMatch, poison: poison };
      },

      // Pollen arriving from another flower of the SAME species sets seed, scaled by the visit quality.
      receivePollen: function (amount, pollination) {
        this.pollenOnStigma += amount;
        this.seedProgress += amount * pollination;
      },
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
