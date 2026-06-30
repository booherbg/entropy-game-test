;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  const clamp = B.clamp, randint = B.randint, W = function () { return B.W; }, H = function () { return B.H; };

  // The sim owns one world — the field + a patch of plants + a pollinator colony — and ticks it
  // deterministically. Two selection pressures close the co-evolution:
  //   • the COLONY drifts its keys toward the flowers (well-fed = well-matched foragers raise more larvae);
  //   • the PATCH drifts its grids toward the keys (well-read = well-pollinated flowers set more seed,
  //     and a Moran birth–death replaces a random plant with the seeder's mutated offspring).
  // The two apparatus meet in the middle: the lock-and-key merges. Determinism gives legibility.
  const PLANT_CAP = 12;

  B.makeSim = function (seed, opts) {
    const rng = B.makeRng((seed >>> 0) || 1);
    const sim = {
      seed: (seed >>> 0) || 1,
      rng: rng,
      field: B.makeField(rng),
      plants: [],
      colonies: [],
      tickCount: 0,
      _nextFlowerId: 1,
      ancestorHue: 0,
      bandY0: 20, bandY1: 46,
      locks: 0,         // how many flower grids are currently locked (the lever)
      milestones: {},   // set as they fire (for the imprint layer)

      _ensureIds: function () {
        for (let pi = 0; pi < this.plants.length; pi++) {
          const fs = this.plants[pi].flowers;
          for (let fi = 0; fi < fs.length; fi++) if (fs[fi].id == null) fs[fi].id = this._nextFlowerId++;
        }
      },

      _plantLocked: function (p) { for (let i = 0; i < p.flowers.length; i++) if (p.flowers[i].locked) return true; return false; },

      allFlowers: function () {
        const a = [];
        for (let pi = 0; pi < this.plants.length; pi++) {
          const fs = this.plants[pi].flowers;
          for (let fi = 0; fi < fs.length; fi++) a.push(fs[fi]);
        }
        return a;
      },

      tick: function () {
        const rng = this.rng;
        this._ensureIds();
        // ── field dynamics ──
        this.field.diffuse('trail', 0.16);
        this.field.decay('trail', 0.05);
        this.field.decay('nectar', 0.08);
        this.field.decay('pollen', 0.08);

        // ── plants: grow, photosynthesize, restock & set seed ──
        const flowers = this.allFlowers();
        const fset = new Set(flowers);
        for (let i = 0; i < this.plants.length; i++) this.plants[i].tick(this.field);

        // ── plant reproduction: Moran birth–death (matched flowers seed faster → grids drift toward keys) ──
        for (let i = 0; i < this.plants.length; i++) {
          const child = this.plants[i].reproduce(rng);
          if (child && this.plants.length > 1) {
            let ri = randint(rng, 0, this.plants.length - 1);
            if (ri === i) ri = (ri + 1) % this.plants.length;
            // a locked flower is the player's anchor — never overwrite it (the keys must chase it)
            if (this._plantLocked(this.plants[ri])) continue;
            const px = clamp(Math.round(this.plants[i].x + (rng() - 0.5) * 10), 4, B.W - 4);
            const py = clamp(Math.round(this.plants[i].y + (rng() - 0.5) * 6), this.bandY0, this.bandY1);
            const np = B.makePlant(child, px, py, rng, this.plants[i].speciesId);
            np.biomass = 0.7; np.sugar = 3;  // a seed from a vigorous parent flowers quickly
            this.plants[ri] = np;
          }
        }

        // prune any bee target pointing at a flower that was just replaced (keeps state clean + serializable)
        const flowers2 = this.allFlowers(), fset2 = new Set(flowers2);
        for (let c = 0; c < this.colonies.length; c++) {
          const bees = this.colonies[c].bees;
          for (let b = 0; b < bees.length; b++) if (bees[b].target && !fset2.has(bees[b].target)) bees[b].target = null;
        }

        // ── colonies: forage across all flowers; evolve keys ──
        for (let c = 0; c < this.colonies.length; c++) this.colonies[c].tick(this.field, flowers2, rng);

        this.tickCount++;
      },

      // The headline merge metric: for each forager, how well it reads the flower its beacon best matches.
      meanFit: function () {
        const flowers = this.allFlowers();
        if (!flowers.length) return 0;
        let sum = 0, n = 0;
        for (let c = 0; c < this.colonies.length; c++) {
          const bees = this.colonies[c].bees;
          for (let bi = 0; bi < bees.length; bi++) {
            const b = bees[bi];
            let bestBm = -1, fit = 0;
            for (let fi = 0; fi < flowers.length; fi++) {
              const fl = flowers[fi];
              const bm = B.beaconMatch(b.key.preference, fl.beaconHue);
              if (bm > bestBm) { bestBm = bm; fit = bm * B.match(b.key.decoder, fl.grid); }
            }
            sum += fit; n++;
          }
        }
        return n ? sum / n : 0;
      },

      // mean realized grid match (decoder vs the best-beacon flower) — used by the dashboards
      meanGridMatch: function () {
        const flowers = this.allFlowers(); if (!flowers.length) return 0;
        let sum = 0, n = 0;
        for (let c = 0; c < this.colonies.length; c++) for (let bi = 0; bi < this.colonies[c].bees.length; bi++) {
          const b = this.colonies[c].bees[bi];
          let bestBm = -1, gm = 0;
          for (let fi = 0; fi < flowers.length; fi++) {
            const bm = B.beaconMatch(b.key.preference, flowers[fi].beaconHue);
            if (bm > bestBm) { bestBm = bm; gm = B.match(b.key.decoder, flowers[fi].grid); }
          }
          sum += gm; n++;
        }
        return n ? sum / n : 0;
      },

      stats: function () {
        let pollinators = 0, nectarTotal = 0, pollenTotal = 0;
        for (let c = 0; c < this.colonies.length; c++) {
          pollinators += this.colonies[c].bees.length;
          nectarTotal += this.colonies[c].nectar; pollenTotal += this.colonies[c].pollen;
        }
        const flowers = this.allFlowers();
        for (let fi = 0; fi < flowers.length; fi++) { nectarTotal += flowers[fi].nectar; pollenTotal += flowers[fi].pollen; }
        return {
          plants: this.plants.length, pollinators: pollinators, colonyPop: pollinators,
          flowers: flowers.length, meanFit: this.meanFit(), gridMatch: this.meanGridMatch(),
          nectarTotal: nectarTotal, pollenTotal: pollenTotal, tick: this.tickCount,
        };
      },

      // Warm-start: a fumbling pair already alive, mid-scene. One species (a patch of varied plants around a
      // single ancestor) advertising a beacon; a colony of foragers with random decoders, loosely-tuned
      // preferences. Badly matched → barely surviving → the climb to "native" is the play.
      warmStart: function (config) {
        const rng = this.rng;
        const ancestor = B.Genome.randomPlant(rng);
        this.ancestorHue = ancestor.beaconHue;
        for (let i = 0; i < PLANT_CAP; i++) {
          const g = B.Genome.mutate(ancestor, rng, 2);             // a population around one form
          const x = 8 + Math.floor(rng() * (B.W - 16));
          const y = this.bandY0 + Math.floor(rng() * (this.bandY1 - this.bandY0));
          const p = B.makePlant(g, x, y, rng, 0);
          p.biomass = 0.85 + rng() * 0.3; p.sugar = 4;             // already mature enough to flower
          this.plants.push(p);
        }
        const colony = B.makeColony(B.W >> 1, B.H - 6, rng);
        for (let i = 0; i < 14; i++) {
          const k = B.Genome.randomKey(rng);
          k.preference = (ancestor.beaconHue + (rng() - 0.5) * 0.24 + 1) % 1; // tuned to the patch hue (so most can forage)
          colony.bees.push(B.makePollinator(k, colony.x, colony.y));
        }
        colony.nectar = 30; colony.pollen = 20;                    // runway so it survives the fumbling warm-up
        this.colonies.push(colony);
        for (let t = 0; t < 30; t++) this.tick();                  // settle: flowers stock, bees start moving
        return this;
      },

      // ── the levers (steward of selection) ──
      lockFlower: function (flower, on) { flower.locked = !!on; this.locks = this.allFlowers().filter(function (f) { return f.locked; }).length; },
      placeColony: function (x, y) { const c = B.makeColony(x | 0, y | 0, this.rng);
        for (let i = 0; i < 8; i++) { const k = B.Genome.randomKey(this.rng); c.bees.push(B.makePollinator(k, c.x, c.y)); }
        c.nectar = 4; c.pollen = 3; this.colonies.push(c); return c; },
      plantAt: function (x, y, genome) { const g = genome || B.Genome.randomPlant(this.rng);
        const p = B.makePlant(g, x | 0, y | 0, this.rng, 0); p.biomass = 0.8; p.sugar = 4;
        if (this.plants.length >= PLANT_CAP) this.plants.shift();
        this.plants.push(p); return p; },
      growNicheOn: function (plant) { return plant.growNiche(this.rng); },

      serialize: function () {
        this._ensureIds();
        const f = this.field;
        return {
          v: 1, seed: this.seed, tickCount: this.tickCount, rng: this.rng.state(),
          nextFlowerId: this._nextFlowerId, ancestorHue: this.ancestorHue,
          bandY0: this.bandY0, bandY1: this.bandY1,
          field: { light: Array.from(f.light), trail: Array.from(f.trail), nectar: Array.from(f.nectar),
            pollen: Array.from(f.pollen), barrier: Array.from(f.barrier) },
          plants: this.plants.map(function (p) {
            return {
              genome: p.genome, x: p.x, y: p.y, sugar: p.sugar, biomass: p.biomass, age: p.age,
              niches: p.niches, seeds: p.seeds, speciesId: p.speciesId,
              flowers: p.flowers.map(function (fl) {
                return { id: fl.id, genome: fl.genome, x: fl.x, y: fl.y, speciesId: fl.speciesId,
                  nectar: fl.nectar, pollen: fl.pollen, cap: fl.cap, pollenOnStigma: fl.pollenOnStigma,
                  seedProgress: fl.seedProgress, locked: fl.locked, niche: fl.niche, grid: Array.from(fl.grid) };
              }),
            };
          }),
          colonies: this.colonies.map(function (c) {
            return { x: c.x, y: c.y, nectar: c.nectar, pollen: c.pollen, born: c.born, starved: c.starved,
              bees: c.bees.map(function (b) {
                return { key: { preference: b.key.preference, decoder: Array.from(b.key.decoder),
                    forageRange: b.key.forageRange, speed: b.key.speed, dietBias: b.key.dietBias },
                  x: b.x, y: b.y, mode: b.mode, nectar: b.nectar, pollen: b.pollen, pollenOnBody: b.pollenOnBody,
                  prevSpecies: b.prevSpecies, age: b.age, energy: b.energy, lastYield: b.lastYield,
                  lastEff: b.lastEff || 0, lastBeaconHue: b.lastBeaconHue == null ? -1 : b.lastBeaconHue,
                  lastGrid: b.lastGrid ? Array.from(b.lastGrid) : null,
                  trips: b.trips, targetId: b.target ? b.target.id : -1 };
              }) };
          }),
        };
      },
    };
    return sim;
  };

  B.loadSim = function (json) {
    const sim = B.makeSim(json.seed);
    sim.rng.setState(json.rng);
    sim.tickCount = json.tickCount;
    sim._nextFlowerId = json.nextFlowerId || 1;
    sim.ancestorHue = json.ancestorHue; sim.bandY0 = json.bandY0; sim.bandY1 = json.bandY1;
    const f = sim.field;
    f.light.set(json.field.light); f.trail.set(json.field.trail);
    f.nectar.set(json.field.nectar); f.pollen.set(json.field.pollen); f.barrier.set(json.field.barrier);
    const idMap = new Map();
    sim.plants = json.plants.map(function (pj) {
      const p = B.makePlant(pj.genome, pj.x, pj.y, sim.rng, pj.speciesId);
      p.sugar = pj.sugar; p.biomass = pj.biomass; p.age = pj.age; p.niches = pj.niches; p.seeds = pj.seeds;
      p.flowers = pj.flowers.map(function (flj) {
        const fl = B.makeFlower(flj.genome, flj.x, flj.y, flj.speciesId);
        fl.id = flj.id; fl.nectar = flj.nectar; fl.pollen = flj.pollen; fl.cap = flj.cap;
        fl.pollenOnStigma = flj.pollenOnStigma; fl.seedProgress = flj.seedProgress; fl.locked = flj.locked;
        fl.niche = flj.niche; fl.grid = Int8Array.from(flj.grid);
        idMap.set(fl.id, fl);
        return fl;
      });
      return p;
    });
    sim.colonies = json.colonies.map(function (cj) {
      const c = B.makeColony(cj.x, cj.y, sim.rng);
      c.nectar = cj.nectar; c.pollen = cj.pollen; c.born = cj.born; c.starved = cj.starved;
      c.bees = cj.bees.map(function (bj) {
        const key = { preference: bj.key.preference, decoder: Int8Array.from(bj.key.decoder),
          forageRange: bj.key.forageRange, speed: bj.key.speed, dietBias: bj.key.dietBias };
        const b = B.makePollinator(key, bj.x, bj.y);
        b.mode = bj.mode; b.nectar = bj.nectar; b.pollen = bj.pollen; b.pollenOnBody = bj.pollenOnBody;
        b.prevSpecies = bj.prevSpecies; b.age = bj.age; b.energy = bj.energy; b.lastYield = bj.lastYield; b.trips = bj.trips;
        b.lastEff = bj.lastEff || 0; b.lastBeaconHue = bj.lastBeaconHue >= 0 ? bj.lastBeaconHue : null;
        b.lastGrid = bj.lastGrid ? Int8Array.from(bj.lastGrid) : null;
        b.target = bj.targetId >= 0 ? (idMap.get(bj.targetId) || null) : null;
        return b;
      });
      c.population = c.bees.length;
      return c;
    });
    return sim;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
