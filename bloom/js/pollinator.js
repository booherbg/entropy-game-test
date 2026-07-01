;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  const FILAMENT_EFF = 0.55;   // a read this good becomes a visible light-filament (round-3 audit item #1)

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
          // a small ring buffer of recent positions, so a filament (render-core.js) can be drawn from where the
          // bee actually was a couple of ticks ago rather than the landing instant — the <1.5 landing radius
          // collapses that into the flower's own glow, reading as a spark rather than a visible thread.
          this._prevX2 = this._prevX1; this._prevY2 = this._prevY1;
          this._prevX1 = this.x; this._prevY1 = this.y;
          const empty = this.target && (this.target.nectar + this.target.pollen) <= 0.01;
          if (!this.target || empty || rng() < 0.02) this.target = this._pick(flowers, field);
          const f = this.target;
          if (!f) { this._wander(rng); }
          else {
            this._moveToward(f.x, f.y, rng, field);
            if (Math.hypot(f.x - this.x, f.y - this.y) < 1.5) this._land(f);
          }
        } else { // home
          this._moveToward(colony.x, colony.y, rng, field);
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
          if (field.rayBlocked && field.rayBlocked(this.x, this.y, f.x, f.y)) continue; // can't forage across a hedge
          const bm = B.beaconMatch(this.key.preference, f.beaconHue) * f.beaconIntensity;
          const tr = field.get('trail', f.x, f.y);
          // your gaze is a gentle pressure: a flower you are watching draws a little more attention (the
          // observer is part of the system — never a command, just a lean). Off by default → tests unchanged.
          const gaze = f.watched ? 1.4 : 0;
          // flower constancy (Darwin): a forager slightly favours the hue it last fed on, so foragers self-sort
          // into hue-lanes → assortative pollination → a single patch can split sympatrically, and rarer colours
          // keep their own loyal pollinators (helps diversity).
          const constancy = (this.lastBeaconHue != null) ? B.beaconMatch(this.lastBeaconHue, f.beaconHue) * 0.7 : 0;
          const score = bm * 2 + tr * 0.5 - d * 0.01 + (f.nectar + f.pollen) * 0.04 + gaze + constancy;
          if (score > bs) { bs = score; best = f; }
        }
        return best;
      },

      _moveToward: function (tx, ty, rng, field) {
        const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, sp = this.key.speed;
        let nx = B.clamp(this.x + dx / d * sp + (rng() - 0.5) * 0.3, 0, B.W - 1);
        let ny = B.clamp(this.y + dy / d * sp + (rng() - 0.5) * 0.3, 0, B.H - 1);
        // a hedge blocks flight — try sliding along it (move only in the clear axis), else hold
        if (field && field.blocked && field.blocked(nx, ny)) {
          if (!field.blocked(nx, this.y)) ny = this.y;
          else if (!field.blocked(this.x, ny)) nx = this.x;
          else { nx = this.x; ny = this.y; }
        }
        this.x = nx; this.y = ny;
      },

      _wander: function (rng) {
        this.x = B.clamp(this.x + (rng() - 0.5) * 2, 0, B.W - 1);
        this.y = B.clamp(this.y + (rng() - 0.5) * 2, 0, B.H - 1);
      },

      _land: function (f) {
        const r = f.visit(this.key);
        this.nectar += r.nectar; this.pollen += r.pollen;
        this.readEvent = (r.pollination > FILAMENT_EFF)
          ? { x0: this._prevX2 != null ? this._prevX2 : this.x, y0: this._prevY2 != null ? this._prevY2 : this.y,
              x1: f.x, y1: f.y, hue: f.beaconHue, eff: r.pollination }
          : this.readEvent;
        // deliver pollen carried from the PREVIOUS flower → seed set, scaled by GENETIC COMPATIBILITY between
        // that pollen and this flower. Same/similar lineage → fertile; drifted-apart lineage → sterile. This
        // is what lets isolated clusters become distinct species (gradually).
        if (this.pollenOnBody > 0 && this.pollenGrid) {
          const compat = B.geneticCompat(this.pollenGrid, this.pollenHue, f.grid, f.beaconHue);
          if (compat > 0.02) f.receivePollen(this.pollenOnBody * compat, r.pollination * compat);
        }
        // pick up fresh pollen from THIS flower (its genetic signature) for the next deposit
        this.pollenOnBody = r.pollination;
        this.pollenGrid = f.grid; this.pollenHue = f.beaconHue;
        this.prevSpecies = f.speciesId;
        // net haul = reward minus any lace toxin (a mismatched generalist pays; a matched specialist is safe).
        // gentle: it lowers the forager's yield (so it raises fewer larvae) and vitality — never lethal.
        const poison = r.poison || 0;
        this.lastYield = Math.max(0, r.nectar + r.pollen - poison);
        this.energy -= poison * 0.5;
        this.lastEff = r.pollination;            // for render/inspect (specialization legibility)
        this.lastGrid = f.grid;                  // the flower that fed it — its offspring's key drifts toward this
        this.lastBeaconHue = f.beaconHue;
        this.mode = 'home';
      },
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
