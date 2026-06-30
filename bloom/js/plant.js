;(function (root) {
  'use strict';
  const B = root.B = root.B || {};

  // The mother tree (plant machine). Rooted; grows deterministically from a genome. Runs on ENERGY:
  // photosynthesis (light → sugar). Spends sugar to grow biomass and to build & keep FLOWERS stocked.
  // A flower offers nectar + pollen and, when pollinated (pollen carried between same-species flowers),
  // sets SEED — the plant's reproduction. Progress = the tree grows niches (1 → 2 here): each niche is a
  // new flower (a new lock) awaiting a key.
  const PHOTO_K = 0.9;           // sugar per tick per unit light at full canopy (comfortably > restock cost)
  const SUGAR_CAP = 20.0;        // a plant can't bank sugar forever (bounds the economy; light still gates it)
  const BIOMASS_CAP = 2.0;
  const FLOWER_COST = 2.0;       // sugar to build a flower
  const NICHE_COST = 8.0;        // sugar to grow a whole new niche
  const SEED_THRESHOLD = 3.0;    // pollination accumulated → one seed

  B.makePlant = function (genome, x, y, rng, speciesId) {
    const plant = {
      genome: genome,
      x: x, y: y,
      speciesId: speciesId | 0,
      sugar: 2.0,
      biomass: 0.2,
      flowers: [],
      age: 0,
      niches: 1,
      seeds: 0,
      alive: true,

      tick: function (field) {
        this.age++;
        // ── photosynthesis (light → sugar), scaled by canopy (leaf area grows with biomass) ──
        const canopy = 0.25 + Math.min(this.biomass, 1.5) / 1.5 * 0.75;
        this.sugar += PHOTO_K * field.lightAt(this.x, this.y) * canopy;
        // ── respiration: the second law — a steady leak that scales with size (never makes sugar) ──
        this.sugar -= 0.008 * (0.5 + this.biomass);
        if (this.sugar < 0) this.sugar = 0;
        if (this.sugar > SUGAR_CAP) this.sugar = SUGAR_CAP;

        // ── grow biomass toward the cap (spend a little sugar) ──
        if (this.biomass < BIOMASS_CAP && this.sugar > 1) {
          const grow = Math.min(0.01, (this.sugar - 1) * 0.004);
          this.biomass += grow; this.sugar -= grow * 2;
        }

        // ── build flowers up to the current niche count ──
        if (this.biomass > 0.6 && this.flowers.length < this.niches && this.sugar > FLOWER_COST) {
          this.sugar -= FLOWER_COST;
          this._buildFlower(this.genome, this.flowers.length);
        }

        // ── keep flowers stocked (richer flowers cost more → trait trade-off has teeth) ──
        for (let i = 0; i < this.flowers.length; i++) {
          const fl = this.flowers[i];
          const want = 0.35 * fl.beaconIntensity;
          if (this.sugar > want) { this.sugar -= want; fl.restock(want); }
          // accumulated pollination → seed
          if (fl.seedProgress >= SEED_THRESHOLD) { this.seeds++; fl.seedProgress -= SEED_THRESHOLD; }
        }
      },

      // place a flower in the canopy at a niche-specific offset (different niches = different heights/sides)
      _buildFlower: function (g, nicheIndex) {
        const ang = -Math.PI / 2 + (nicheIndex - (this.niches - 1) / 2) * 0.7; // fan across the crown
        const rad = 2 + this.biomass * 1.5;
        const fx = B.clamp(Math.round(this.x + Math.cos(ang) * rad), 0, B.W - 1);
        const fy = B.clamp(Math.round(this.y + Math.sin(ang) * rad), 0, B.H - 1);
        const fl = B.makeFlower(g, fx, fy, this.speciesId);
        fl.cap = 6 + g.beaconIntensity * 6;     // richer beacon → higher pool ceiling
        fl.niche = nicheIndex;
        this.flowers.push(fl);
        return fl;
      },

      // Spend sugar to grow a new niche: a fresh flower with a mutated genome at a different beacon hue/grid.
      growNiche: function (rng) {
        if (this.sugar < NICHE_COST) return false;
        this.sugar -= NICHE_COST;
        this.niches++;
        const ng = B.Genome.mutate(this.genome, rng, 3);
        ng.beaconHue = (this.genome.beaconHue + 0.3 + rng() * 0.2) % 1; // force a distinct attractor
        this._buildFlower(ng, this.flowers.length);
        return true;
      },

      // Yield a child genome (parent mutated) when a seed is banked. Placement/selection is the sim's job —
      // only well-pollinated (well-matched) flowers set seed, so the population's grids drift toward the keys.
      reproduce: function (rng) {
        if (this.seeds < 1) return null;
        this.seeds--;
        return B.Genome.mutate(this.genome, rng, 1);
      },
    };
    return plant;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
