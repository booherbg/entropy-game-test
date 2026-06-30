;(function (root) {
  'use strict';
  const B = root.B = root.B || {};

  // The colony (the emergent machine). Stores the two resources its foragers bring home; coordinates by
  // stigmergy (no leader — trails do the recruiting). Per tick: intake (handled by bees on return) →
  // UPKEEP spends nectar (empty → a forager starves: the gentle maintenance pressure) → BUILD spends pollen
  // to raise larvae into new pollinators that inherit a well-fed forager's key + mutation (pollen is the
  // machinery; well-fed keys raise more larvae → the colony's keys drift toward the flowers).
  const UPKEEP = 0.004;      // nectar per bee per tick — gentle: a fumbling colony limps, doesn't collapse
  const LARVA_POLLEN = 0.8;  // pollen to raise one larva
  const LARVA_NECTAR = 0.5;  // nectar to raise one larva
  const POP_CAP = 60;
  const MAX_AGE = 1600;
  const STORE_CAP = 40;      // stores can't hoard infinitely — overflow is lost (the second law)
  const RESERVE = 30;        // keep ~30 ticks of upkeep banked before investing a larva (no boom-bust overshoot)

  B.makeColony = function (x, y, rng) {
    return {
      x: x, y: y,
      nectar: 0, pollen: 0,
      bees: [],
      population: 0,
      born: 0, starved: 0,

      deposit: function (nectar, pollen) { this.nectar += nectar; this.pollen += pollen; },

      // the best-fed recent forager (well-matched → high yield → reproduces). May be null if none has fed.
      bestForager: function () {
        let best = null, by = -Infinity;
        for (let i = 0; i < this.bees.length; i++) {
          const b = this.bees[i];
          if (b.lastGrid && b.lastYield > by) { by = b.lastYield; best = b; }
        }
        return best;
      },
      bestKey: function (rng) { const b = this.bestForager(); return b ? b.key : B.Genome.randomKey(rng); },

      tick: function (field, flowers, rng) {
        // forage (foragers deposit nectar + pollen on return)
        for (let i = 0; i < this.bees.length; i++) this.bees[i].tick(field, flowers, this, rng);
        // stores can't hoard infinitely — overflow is lost
        if (this.nectar > STORE_CAP) this.nectar = STORE_CAP;
        if (this.pollen > STORE_CAP) this.pollen = STORE_CAP;
        // natural death (old age)
        const keep = [];
        for (let i = 0; i < this.bees.length; i++) { const b = this.bees[i]; if (b.alive && b.age < MAX_AGE) keep.push(b); }
        this.bees = keep;
        // upkeep — empty nectar starves exactly one (gentle, never a wipe)
        const need = this.bees.length * UPKEEP;
        if (this.nectar >= need) this.nectar -= need;
        else { this.nectar = 0; this._starveOne(); }
        // build a larva when there's a comfortable surplus — at carrying capacity, REPLACE the oldest bee
        // (Moran turnover) so the colony keeps drifting its keys toward the flowers even when full.
        const reserve = this.bees.length * UPKEEP * RESERVE;
        if (this.nectar > reserve + LARVA_NECTAR && this.pollen > LARVA_POLLEN) {
          this.nectar -= LARVA_NECTAR; this.pollen -= LARVA_POLLEN;
          const parent = this.bestForager();
          const childKey = parent ? B.Genome.inheritKey(parent.key, parent.lastGrid, parent.lastBeaconHue, rng)
            : B.Genome.mutate(B.Genome.randomKey(rng), rng, 1);
          const bee = B.makePollinator(childKey, this.x, this.y);
          if (this.bees.length < POP_CAP) this.bees.push(bee);
          else { let oi = 0, oa = -1; for (let i = 0; i < this.bees.length; i++) if (this.bees[i].age > oa) { oa = this.bees[i].age; oi = i; } this.bees[oi] = bee; }
          this.born++;
        }
        this.population = this.bees.length;
      },

      _starveOne: function () {
        if (!this.bees.length) return;
        let oi = 0, oa = -1;
        for (let i = 0; i < this.bees.length; i++) if (this.bees[i].age > oa) { oa = this.bees[i].age; oi = i; }
        this.bees.splice(oi, 1); this.starved++;
      },
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
