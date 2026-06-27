;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  function radialWeights(g) {
    const r = g.radius || 12, r2 = r * r, out = [];
    let sum = 0;
    for (let y = Math.max(0, g.y - r); y <= Math.min(E.H - 1, g.y + r); y++)
      for (let x = Math.max(0, g.x - r); x <= Math.min(E.W - 1, g.x + r); x++) {
        const d2 = (x - g.x) * (x - g.x) + (y - g.y) * (y - g.y);
        if (d2 > r2) continue;
        const w = Math.exp(-d2 / (2 * (r / 2) * (r / 2)));
        out.push([E.idx(x, y), w]); sum += w;
      }
    return { out, sum };
  }
  function veinWeights(g) {
    const len = g.length || 26, half = len / 2, ang = g.angle || 0;
    const dx = Math.cos(ang), dy = Math.sin(ang), out = []; let sum = 0;
    for (let t = -half; t <= half; t += 0.5) {
      const x = Math.round(g.x + dx * t), y = Math.round(g.y + dy * t);
      if (x < 0 || y < 0 || x >= E.W || y >= E.H) continue;
      const w = 1 - Math.abs(t) / (half + 1); // taper toward the ends
      out.push([E.idx(x, y), w]); sum += w;
    }
    return { out, sum };
  }
  E.depositGenerators = function (field, gens) {
    for (const g of gens) {
      let emit = g.rate;
      if (g.reservoir !== undefined) {     // a finite spring: emits until it runs dry, then stops
        if (g.reservoir <= 1e-9) continue;
        emit = Math.min(g.rate, g.reservoir);
        g.reservoir -= emit;
      }
      if (emit <= 0) continue;
      const { out, sum } = (g.proj === 'vein' ? veinWeights(g) : radialWeights(g));
      if (sum <= 0) continue;
      for (const [i, w] of out) field.add(i, g.el, emit * (w / sum)); // Σ deposits == emit
    }
  };
  // procedural terrain: cup the opening in a basin (a richer, sheltered start — open at the top so life
  // still climbs out) and scatter a couple of wandering ridges for character. deterministic (passed rng);
  // never touched by the measured baselines (only a fresh live world calls it).
  E.makeTerrain = function (field, rng, ox, oy) {
    const lay = (x, y) => { x |= 0; y |= 0; if (x > 1 && y > 1 && x < E.W - 2 && y < E.H - 2) field.barrier[E.idx(x, y)] = 1; };
    const R = 13 + (rng() * 3 | 0);
    for (let deg = 0; deg < 360; deg += 3) {          // a U-basin: the ring minus its top (a cup, not a box)
      const a = deg * Math.PI / 180;
      if (Math.sin(a) < -0.6) continue;               // leave the top open
      lay(ox + Math.cos(a) * R, oy + Math.sin(a) * R);
      lay(ox + Math.cos(a) * (R + 1), oy + Math.sin(a) * (R + 1)); // 2 cells thick
    }
    const ridges = 2 + (rng() * 2 | 0);
    for (let r = 0; r < ridges; r++) {
      const cx = (rng() * E.W) | 0, cy = (rng() * E.H) | 0;
      if ((cx - ox) * (cx - ox) + (cy - oy) * (cy - oy) < (R + 16) * (R + 16)) continue; // not over the opening basin
      const ang = rng() * Math.PI * 2, dx = Math.cos(ang), dy = Math.sin(ang), len = 10 + (rng() * 22 | 0);
      for (let s = 0; s < len; s++) { lay(cx + dx * s, cy + dy * s); if (rng() < 0.4) lay(cx + dx * s + dy, cy + dy * s - dx); }
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
