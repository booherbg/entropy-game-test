;(function (root) {
  'use strict';
  const B = root.B = root.B || {};

  // The field — the pixel resource grid. Five named channels, each a Float32Array(W*H):
  //   light  — a (mostly) static gradient: the canopy sun, brighter toward the top. The plant's input.
  //   sugar  — produced by photosynthesis, a faint glow in the world (book-keeping lives on the plant).
  //   nectar — dropped/visualised reward pixels (the main store lives on flowers/colony).
  //   pollen — material reward pixels.
  //   trail  — stigmergic recruitment pheromone: diffuses + decays. The colony's shared memory.
  // Conserved + dissipative: trail diffusion conserves mass; decay leaks it (the second law).
  B.makeField = function (rng) {
    const W = B.W, H = B.H, NCELL = W * H;
    const light = new Float32Array(NCELL);
    const sugar = new Float32Array(NCELL);
    const nectar = new Float32Array(NCELL);
    const pollen = new Float32Array(NCELL);
    const trail = new Float32Array(NCELL);
    const barrier = new Uint8Array(NCELL); // walls block bee movement (the speciation lever)
    const scratch = new Float32Array(NCELL);

    // light gradient: bright canopy up top falling to shaded loam below, with mild seeded variation
    // so no two worlds light identically. Range ~[0.15, 1.0].
    for (let y = 0; y < H; y++) {
      const base = 1.0 - 0.78 * (y / (H - 1));            // 1.0 at top → 0.22 at bottom
      for (let x = 0; x < W; x++) {
        const jitter = (rng() - 0.5) * 0.08;
        light[y * W + x] = Math.max(0.12, base + jitter);
      }
    }

    const chan = { light: light, sugar: sugar, nectar: nectar, pollen: pollen, trail: trail };

    const f = {
      W: W, H: H, light: light, sugar: sugar, nectar: nectar, pollen: pollen, trail: trail, barrier: barrier,
      idx: function (x, y) { return (y | 0) * W + (x | 0); },
      inBounds: function (x, y) { return x >= 0 && y >= 0 && x < W && y < H; },
      lightAt: function (x, y) {
        if (x < 0 || y < 0 || x >= W || y >= H) return 0;
        return light[(y | 0) * W + (x | 0)];
      },
      get: function (ch, x, y) {
        if (x < 0 || y < 0 || x >= W || y >= H) return 0;
        return chan[ch][(y | 0) * W + (x | 0)];
      },
      add: function (ch, x, y, v) {
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        chan[ch][(y | 0) * W + (x | 0)] += v;
      },
      total: function (ch) { const a = chan[ch]; let s = 0; for (let i = 0; i < NCELL; i++) s += a[i]; return s; },
      decay: function (ch, rate) { const a = chan[ch], k = 1 - rate; for (let i = 0; i < NCELL; i++) a[i] *= k; },
      // mass-conserving 5-point diffusion (von Neumann), edge-aware so nothing leaks off the grid.
      diffuse: function (ch, rate) {
        const a = chan[ch], s = scratch;
        for (let i = 0; i < NCELL; i++) s[i] = a[i];
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const c = s[i];
            let flow = 0;
            // give a quarter of (rate*c) to each in-bounds neighbour; keep the rest (conserves total)
            const q = rate * c * 0.25;
            if (x > 0) { a[i - 1] += q; flow += q; }
            if (x < W - 1) { a[i + 1] += q; flow += q; }
            if (y > 0) { a[i - W] += q; flow += q; }
            if (y < H - 1) { a[i + W] += q; flow += q; }
            a[i] -= flow;
          }
        }
      },
      clear: function (ch) { const a = chan[ch]; for (let i = 0; i < NCELL; i++) a[i] = 0; },
    };
    return f;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
