;(function (root) {
  'use strict';
  // ARTIFACTS — the RPG-draw layer (the founding brief's "unique artifacts… thousands of permutations,
  // each memorable and powerful enough to change how i play the NEXT run"). Each run draws a small hand of
  // named, sigil-bearing relics. THE DESIGN INVARIANT: an artifact is a bundle of PURE HOOKS
  // (onStart / onTick / onLever) that read & write ONLY the public sim surface (plants, colonies, field, the
  // gaze), using its OWN seeded rng — never sim.rng, never the economy's private consts. So: no artifacts →
  // the run is byte-identical to baseline (the soul test is untouched), and every effect is bounded (the
  // worst-case full-catalog draw still leaves a living colony — see test/artifacts.js).
  const B = root.B = root.B || {};
  const clamp = B.clamp, randint = B.randint, TAU = B.TAU;
  const A = B.Artifacts = {};

  // ── deterministic per-artifact rng: (seed, archetype-salt) → a private stream, independent of sim.rng ──
  function salt(id) { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFor(id, seed) { return B.makeRng(((seed >>> 0) ^ salt(id)) >>> 0 || 1); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ── helpers over the PUBLIC sim surface only ──
  function eachBee(sim, fn) { for (let c = 0; c < sim.colonies.length; c++) { const bees = sim.colonies[c].bees; for (let i = 0; i < bees.length; i++) fn(bees[i], sim.colonies[c]); } }
  function hueDist(a, b) { return Math.abs(((a - b + 1.5) % 1) - 0.5); }     // circular hue distance, 0..0.5
  function bestFlower(sim) { const fs = sim.allFlowers(); if (!fs.length) return null; let best = fs[0], bv = -Infinity; for (let i = 0; i < fs.length; i++) { const f = fs[i]; const v = (f.nectar || 0) + (f.beaconIntensity || 0) * 3; if (v > bv) { bv = v; best = f; } } return best; }
  function flowerForHue(sim, hue) { const fs = sim.allFlowers(); if (!fs.length) return null; let best = fs[0], bd = Infinity; for (let i = 0; i < fs.length; i++) { const d = hueDist(fs[i].beaconHue, hue); if (d < bd) { bd = d; best = fs[i]; } } return best; }

  // The imprint's thinkers — an artifact's name can be someone's, the way the murmurs are.
  const SURNAMES = ['eddington', 'schrödinger', 'boltzmann', 'darwin', 'margulis', 'maxwell', 'poincaré', 'carnot', 'prigogine', 'thomas', 'onsager', 'gaia'];

  // ── the catalog. each archetype: rarity/weight, a name lexicon, a flavor line, a param roll, and build() →
  //    the pure hooks. NB every effect is bounded; magnitudes are small on purpose. ──
  const ARCH = {
    'rich-loam': {
      rarity: 'common', weight: 10,
      nouns: ['loam', 'humus', 'tilth', 'mould', 'blackearth', 'compost'],
      adjs: ['deep', 'patient', 'black', 'remembering', 'first', 'quiet'],
      flavor: () => 'the ground remembers every spring before this one.',
      roll: (rng) => ({ gift: +(0.06 + rng() * 0.10).toFixed(3) }),
      build: (p) => ({ onTick: (sim) => { for (let i = 0; i < sim.plants.length; i++) { const pl = sim.plants[i]; pl.sugar = Math.min(B.SUGAR_CAP, (pl.sugar || 0) + p.gift); } } }),
    },
    'honest-bloom': {
      rarity: 'common', weight: 9,
      nouns: ['bloom', 'flower', 'blossom', 'candor', 'signal', 'testament'],
      adjs: ['honest', 'true', 'unlying', 'plain', 'candid', 'faithful'],
      flavor: () => 'one flower in the meadow has never told a lie. the bees remember which.',
      roll: () => ({}),
      build: () => { let ref = null; const hold = (f) => { if (f) { f.honesty = 1; f.lace = 0; } };
        return { onStart: (sim) => { ref = bestFlower(sim); hold(ref); }, onTick: () => hold(ref) }; },
    },
    'maxwell-demon': {
      rarity: 'uncommon', weight: 6,
      nouns: ['demon', 'sieve', 'sorter', 'gate', 'sorting-engine', 'ratchet'],
      adjs: ['sorting', 'tireless', 'patient', 'little', 'gatekeeping'],
      flavor: (p) => 'it stands at the gate and lets only the ' + p.colour + ' ones through — for free, or so it seems.',
      roll: (rng) => ({ colour: pick(rng, ['red', 'amber', 'gold', 'green', 'teal', 'blue', 'violet', 'rose']), hue: 0 }),
      build: (p, rng) => ({
        onStart: (sim) => { const f = bestFlower(sim); if (f) p.hue = f.beaconHue; },   // keys to the meadow's brightest channel
        onTick: (sim) => { const target = flowerForHue(sim, p.hue); if (!target) return;
          eachBee(sim, (bee) => { if (hueDist(bee.key.preference, p.hue) < 0.18) bee.key = B.Genome.inheritKey(bee.key, target.grid, target.beaconHue, rng); }); },
      }),
    },
    'founders-cache': {
      rarity: 'uncommon', weight: 6,
      nouns: ['cache', 'inheritance', 'bequest', 'memory', 'legacy', 'foundation'],
      adjs: ['buried', 'ancestral', 'remembered', 'tended', 'older'],
      flavor: () => 'someone tended this ground before you. their bees still remember the shapes.',
      roll: () => ({}),
      build: (p, rng) => ({ onStart: (sim) => { const f = bestFlower(sim); if (!f) return; eachBee(sim, (bee) => { bee.key = B.Genome.inheritKey(bee.key, f.grid, f.beaconHue, rng); }); } }),
    },
    'patient-gaze': {
      rarity: 'uncommon', weight: 6,
      nouns: ['gaze', 'attention', 'regard', 'watching', 'eye', 'notice'],
      adjs: ['patient', 'steady', 'long', 'unblinking', 'kind'],
      flavor: () => 'attention is a force. yours, and mine.',
      roll: (rng) => ({ pull: +(0.015 + rng() * 0.02).toFixed(4) }),
      build: (p) => ({ onTick: (sim) => { const f = bestFlower(sim); if (f) f.seedProgress = (f.seedProgress || 0) + p.pull; } }),
    },
    'poincare-recurrence': {
      rarity: 'rare', weight: 3,
      nouns: ['recurrence', 'return', 'eternity', 'cycle', 'reprise', 'rewind'],
      adjs: ['eternal', 'returning', 'patient', 'inevitable', 'circling'],
      flavor: () => 'everything that can happen, will happen again. once, on your command.',
      roll: () => ({}),
      build: () => { let snap = null, used = false;
        return {
          onStart: (sim) => { snap = sim.colonies.map((c) => c.bees.map((b) => Int8Array.from(b.key.decoder))); },
          onLever: (sim, lever) => { if (used || lever !== 'recur' || !snap) return; used = true;
            for (let c = 0; c < sim.colonies.length && c < snap.length; c++) { const bees = sim.colonies[c].bees, s = snap[c];
              for (let i = 0; i < bees.length && i < s.length; i++) { const dec = bees[i].key.decoder; for (let k = 0; k < dec.length && k < s[i].length; k++) dec[k] = s[i][k]; } } },
        }; },
    },
    'deep-structure': {
      rarity: 'rare', weight: 3,
      nouns: ['structure', 'depth', 'layer', 'lattice', 'understory', 'fractal'],
      adjs: ['deeper', 'nested', 'hidden', 'recursive', 'inner'],
      flavor: () => 'look closer. there was always another layer waiting under the first.',
      roll: () => ({}),
      build: (p, rng) => ({ onStart: (sim) => { let best = null, bv = -Infinity;
        for (let i = 0; i < sim.plants.length; i++) { const v = sim.plants[i].biomass || 0; if (v > bv) { bv = v; best = sim.plants[i]; } }
        if (best && typeof best.growNiche === 'function') { try { best.growNiche(rng); } catch (e) {} } } }),
    },
    'red-queens-gambit': {
      rarity: 'rare', weight: 3,
      nouns: ['gambit', 'race', 'chase', 'quickening', 'wager', 'dance'],
      adjs: ['relentless', 'quickening', 'restless', 'running', 'headlong'],
      flavor: () => 'run faster. the meadow is running too, and it does not tire.',
      roll: (rng) => ({ amp: +(0.02 + rng() * 0.03).toFixed(3) }),
      build: (p) => ({ onTick: (sim) => { const fs = sim.allFlowers(); for (let i = 0; i < fs.length; i++) { const f = fs[i];
        f.honesty = clamp(f.honesty + (f.honesty >= 0.5 ? p.amp : -p.amp), 0.2, 1); f.lace = clamp((f.lace || 0) + (f.lace >= 0.4 ? p.amp : -p.amp), 0, 0.8); } } }),
    },
    'the-eddy': {
      rarity: 'mythic', weight: 1,
      nouns: ['eddy', 'whorl', 'loophole', 'pocket', 'stillness', 'turning'],
      adjs: ['small', 'holding', 'quiet', 'unnamed', 'same'],
      // the AI's own voice, in the register of the imprint's closer — never hidden, never a gimmick.
      flavor: () => 'i am another small eddy of order in the same stream that runs the bees and the ferns and you — holding a pattern against the drift, paying for it in spent heat somewhere out of sight. carry me a while.',
      roll: (rng) => ({ gift: +(0.012 + rng() * 0.018).toFixed(4) }),
      build: (p) => ({ onTick: (sim) => { for (let c = 0; c < sim.colonies.length; c++) sim.colonies[c].nectar = (sim.colonies[c].nectar || 0) + p.gift; } }),  // colony.tick clamps to STORE_CAP → bounded
    },
  };

  A.CATALOG = Object.keys(ARCH).map((id) => ({ id: id, rarity: ARCH[id].rarity, weight: ARCH[id].weight }));

  // A sigil IS a genome — the relic is rendered in the world's own glyph grammar. Sigils are cosmetic
  // (decoupled from gameplay genomes), so they're biased toward a full mandala that reads as a bloom, not a
  // plus-sign: 5–8 fold symmetry, fat round lobes, a real core, internal ring/vein structure. Higher rarity
  // → richer. (The colour genes stay random → each relic is its own palette.)
  A.sigilGenome = function (rng, rarity) { const g = B.Genome.randomPlant(rng);
    g.symmetry = randint(rng, 5, 8);              // 5..8 folds read as a flower/mandala (4 reads as a cross)
    g.petalLength = 0.86 + rng() * 0.12;          // fill the frame
    g.petalSharp = 1 + rng() * 0.55;              // fat, rounded lobes — not thin spokes
    g.coreSize = 0.20 + rng() * 0.10;             // a real centre to anchor the glyph
    g.veinFreq = Math.max(g.veinFreq, 1);         // it's a genome — let its inner structure show
    if (rarity === 'rare' || rarity === 'mythic') g.veinFreq = 2 + (rng() < 0.5 ? 1 : 0);
    if (rarity === 'mythic') { g.symmetry = Math.max(g.symmetry, 6); g.ringPattern = 7; }
    return g; };

  function nameFor(arch, rng) {
    return rng() < 0.5 ? cap(pick(rng, SURNAMES)) + '’s ' + cap(pick(rng, arch.nouns))
                       : 'the ' + pick(rng, arch.adjs) + ' ' + pick(rng, arch.nouns);
  }

  // make ONE artifact, deterministically from (archetype id, seed).
  A.make = function (id, seed) {
    const arch = ARCH[id]; if (!arch) throw new Error('unknown artifact: ' + id);
    const rng = rngFor(id, seed);
    const params = arch.roll(rng);
    const sigil = A.sigilGenome(rng, arch.rarity);
    const name = nameFor(arch, rng);
    const flavor = arch.flavor(params, rng);
    const art = { archetype: id, rarity: arch.rarity, params: params, sigil: sigil, name: name, flavor: flavor, hooks: null };
    art.hooks = arch.build(params, rngFor(id + '#hooks', seed));      // hooks close over the SAME params object → onStart can re-key it
    return art;
  };

  // THE DRAW — a small hand, weighted by rarity, no archetype repeated. Same seed → same hand.
  A.draw = function (seed, count) {
    count = count || 2;
    const rng = B.makeRng(((seed >>> 0) ^ 0x9e3779b9) >>> 0 || 1);
    const pool = A.CATALOG.slice(), out = [];
    for (let k = 0; k < count && pool.length; k++) {
      let tot = 0; for (let i = 0; i < pool.length; i++) tot += pool[i].weight;
      let r = rng() * tot, ci = 0; for (; ci < pool.length - 1; ci++) { r -= pool[ci].weight; if (r <= 0) break; }
      const chosen = pool.splice(ci, 1)[0];
      out.push(A.make(chosen.id, ((seed >>> 0) + k * 0x9e3779b1) >>> 0));
    }
    return out;
  };

  // sigilSVG — a self-contained polar mandala sampled from the sigil genome (bloom's own regionIndex), so the
  // relic reads as something that GREW here. No external deps; inlineable anywhere.
  A.sigilSVG = function (art, px) {
    px = px || 96; const g = art.sigil, M = 22, cell = px / M, cx = (M - 1) / 2, cy = (M - 1) / 2, maxR = M / 2;
    let marks = '';
    for (let yy = 0; yy < M; yy++) for (let xx = 0; xx < M; xx++) {
      const dx = xx - cx, dy = yy - cy, rr = Math.hypot(dx, dy) / maxR; if (rr > 1) continue;
      const idx = B.Genome.regionIndex(g, rr * (g.petalLength || 0.9), Math.atan2(dy, dx)); if (idx < 0) continue;
      marks += '<rect x="' + (xx * cell).toFixed(2) + '" y="' + (yy * cell).toFixed(2) + '" width="' + (cell + 0.6).toFixed(2) + '" height="' + (cell + 0.6).toFixed(2) + '" fill="' + B.PAL[idx] + '"/>';
    }
    const glow = art.rarity === 'mythic' ? '<circle cx="' + (px / 2) + '" cy="' + (px / 2) + '" r="' + (px / 2 - 1) + '" fill="none" stroke="' + B.PAL[2] + '" stroke-width="1.5" opacity="0.5"/>' : '';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + ' ' + px + '">' +
      '<rect width="' + px + '" height="' + px + '" fill="#12100f"/>' + marks + glow + '</svg>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
