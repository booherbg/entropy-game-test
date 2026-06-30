;(function (root) {
  'use strict';
  const B = root.B = root.B || {};

  // The colony (the emergent machine). Stores the two resources its foragers bring home; coordinates by
  // stigmergy (no leader — trails do the recruiting). Per tick: intake (handled by bees on return) →
  // UPKEEP spends nectar (empty → a forager starves: the gentle maintenance pressure) → BUILD spends pollen
  // to raise larvae into new pollinators that inherit a well-fed forager's key + mutation (pollen is the
  // machinery; well-fed keys raise more larvae → the colony's keys drift toward the flowers).
  const UPKEEP = 0.02;       // nectar per bee per tick
  const LARVA_POLLEN = 1.5;  // pollen to raise one larva
  const LARVA_NECTAR = 1.0;  // nectar to raise one larva
  const POP_CAP = 60;
  const MAX_AGE = 1600;

  B.makeColony = function (x, y, rng) {
    return {
      x: x, y: y,
      nectar: 0, pollen: 0,
      bees: [],
      population: 0,
      born: 0, starved: 0,

      deposit: function (nectar, pollen) { this.nectar += nectar; this.pollen += pollen; },

      // the key of the best-fed recent forager (well-matched → high yield → reproduces)
      bestKey: function (rng) {
        let best = null, by = -Infinity;
        for (let i = 0; i < this.bees.length; i++) if (this.bees[i].lastYield > by) { by = this.bees[i].lastYield; best = this.bees[i]; }
        return best ? best.key : B.Genome.randomKey(rng);
      },

      tick: function (field, flowers, rng) {
        // forage
        for (let i = 0; i < this.bees.length; i++) this.bees[i].tick(field, flowers, this, rng);
        // natural death (old age)
        const keep = [];
        for (let i = 0; i < this.bees.length; i++) { const b = this.bees[i]; if (b.alive && b.age < MAX_AGE) keep.push(b); }
        this.bees = keep;
        // upkeep — empty nectar starves exactly one (gentle, never a wipe)
        const need = this.bees.length * UPKEEP;
        if (this.nectar >= need) this.nectar -= need;
        else { this.nectar = 0; this._starveOne(); }
        // build a larva when both currencies allow and there's room
        if (this.pollen >= LARVA_POLLEN && this.nectar >= LARVA_NECTAR && this.bees.length < POP_CAP) {
          this.pollen -= LARVA_POLLEN; this.nectar -= LARVA_NECTAR;
          const childKey = B.Genome.mutate(this.bestKey(rng), rng, 1);
          const bee = B.makePollinator(childKey, this.x, this.y);
          this.bees.push(bee); this.born++;
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
