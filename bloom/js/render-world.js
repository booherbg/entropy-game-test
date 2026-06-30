;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  const R = B.Render = B.Render || {};

  // Browser world render: paint() into the canvas's own ImageData (internal res = world×scale), then CSS
  // scales the element crisp (image-rendering: pixelated). Headless == browser because both call paint().
  R.world = function (canvas, sim, S, opts) {
    const out = R.paint(sim, S, opts), w = out.w, h = out.h, rgb = out.rgb;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; R._img = null; }
    const ctx = canvas.getContext('2d');
    let img = R._img;
    if (!img) { img = R._img = ctx.createImageData(w, h); }
    const d = img.data;
    for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) { d[j] = rgb[i]; d[j + 1] = rgb[i + 1]; d[j + 2] = rgb[i + 2]; d[j + 3] = 255; }
    ctx.putImageData(img, 0, 0);
  };

  // map a click on the (CSS-scaled) canvas to world cell coords
  R.pickCell = function (canvas, clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) / r.width * B.W, y = (clientY - r.top) / r.height * B.H;
    return { x: Math.max(0, Math.min(B.W - 1, x)), y: Math.max(0, Math.min(B.H - 1, y)) };
  };

  // nearest flower / bee to a world point (for inspect + lock), within a small radius
  R.pickFlower = function (sim, wx, wy, rad) {
    rad = rad || 4.5; let best = null, bd = rad * rad;
    const fs = sim.allFlowers();
    for (let i = 0; i < fs.length; i++) { const d = (fs[i].x - wx) * (fs[i].x - wx) + (fs[i].y - wy) * (fs[i].y - wy); if (d < bd) { bd = d; best = fs[i]; } }
    return best;
  };
  R.pickBee = function (sim, wx, wy, rad) {
    rad = rad || 3.5; let best = null, bd = rad * rad;
    for (let c = 0; c < sim.colonies.length; c++) for (let i = 0; i < sim.colonies[c].bees.length; i++) {
      const b = sim.colonies[c].bees[i], d = (b.x - wx) * (b.x - wx) + (b.y - wy) * (b.y - wy); if (d < bd) { bd = d; best = b; }
    }
    return best;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
