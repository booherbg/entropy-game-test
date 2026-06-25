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
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
