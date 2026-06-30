;(function (root) {
  'use strict';
  const B = root.B = root.B || {};

  // The pollinator (animal machine). Mobile; heritable key = preference (beacon hue) + decoder (the
  // reading template its body markings express). The forage loop: leave → find a flower by beacon (weighted
  // by trail) → decode on landing (match → extraction efficiency) → collect nectar + pollen, carry pollen
  // between same-species flowers (pollination), → return laying a recruitment trail → deposit → repeat.
  B.makePollinator = function (key, x, y) {
    return {
      key: key,
      x: x, y: y,
      mode: 'out',
      nectar: 0, pollen: 0,
      pollenOnBody: 0, prevSpecies: -1,
      target: null,
      age: 0, energy: 3, lastYield: 0, trips: 0,
      alive: true,

      tick: function (field, flowers, colony, rng) {
        this.age++;
        this.energy -= 0.004 * this.key.speed;     // flight cost (vitality, not lethal — colony upkeep is the pressure)

        if (this.mode === 'out') {
          const empty = this.target && (this.target.nectar + this.target.pollen) <= 0.01;
          if (!this.target || empty || rng() < 0.02) this.target = this._pick(flowers, field);
          const f = this.target;
          if (!f) { this._wander(rng); }
          else {
            this._moveToward(f.x, f.y, rng);
            if (Math.hypot(f.x - this.x, f.y - this.y) < 1.5) this._land(f);
          }
        } else { // home
          this._moveToward(colony.x, colony.y, rng);
          field.add('trail', this.x, this.y, Math.min(0.5, this.lastYield * 0.18)); // stigmergy
          if (Math.hypot(colony.x - this.x, colony.y - this.y) < 2) {
            colony.deposit(this.nectar, this.pollen);
            this.energy = Math.min(6, this.energy + this.nectar * 0.5);
            this.nectar = 0; this.pollen = 0;
            this.mode = 'out'; this.target = null; this.trips++;
          }
        }
        return this.alive;
      },

      // choose a flower: drawn by the beacon its preference matches, weighted by trail and reward, minus distance
      _pick: function (flowers, field) {
        let best = null, bs = -Infinity;
        for (let i = 0; i < flowers.length; i++) {
          const f = flowers[i];
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d > this.key.forageRange) continue;
          const bm = B.beaconMatch(this.key.preference, f.beaconHue) * f.beaconIntensity;
          const tr = field.get('trail', f.x, f.y);
          const score = bm * 2 + tr * 0.5 - d * 0.01 + (f.nectar + f.pollen) * 0.04;
          if (score > bs) { bs = score; best = f; }
        }
        return best;
      },

      _moveToward: function (tx, ty, rng) {
        const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, sp = this.key.speed;
        this.x = B.clamp(this.x + dx / d * sp + (rng() - 0.5) * 0.3, 0, B.W - 1);
        this.y = B.clamp(this.y + dy / d * sp + (rng() - 0.5) * 0.3, 0, B.H - 1);
      },

      _wander: function (rng) {
        this.x = B.clamp(this.x + (rng() - 0.5) * 2, 0, B.W - 1);
        this.y = B.clamp(this.y + (rng() - 0.5) * 2, 0, B.H - 1);
      },

      _land: function (f) {
        const r = f.visit(this.key);
        this.nectar += r.nectar; this.pollen += r.pollen;
        // deliver pollen carried from the previous flower → pollination (same species sets seed)
        if (this.pollenOnBody > 0 && f.speciesId === this.prevSpecies) {
          f.receivePollen(this.pollenOnBody, r.pollination);
        }
        // pick up fresh pollen on the body (viable load scaled by how well it read the flower)
        this.pollenOnBody = r.pollination;
        this.prevSpecies = f.speciesId;
        this.lastYield = r.nectar + r.pollen;
        this.lastEff = r.pollination;            // for render/inspect (specialization legibility)
        this.mode = 'home';
      },
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
