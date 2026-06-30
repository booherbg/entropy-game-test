'use strict';
// The merge, in one image: the garden at four moments (fumbling → native) stacked over a filmstrip of the
// flower's maze vs the colony's key drifting into a matched pair. Usage: node bloom/test/timelapse.js [seed]
const fs = require('fs');
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim', 'render-core', 'render-dash'].forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B;
const { encodePNG, blit } = require('./pngutil.js');

const seed = parseInt(process.argv[2] || '7', 10);
const S = 6, GAP = 10;
const sim = B.makeSim(seed); sim.warmStart();
const STOPS = [0, 250, 800, 2600];           // ticks elapsed → fumbling, learning, specialising, native
const frames = [], grids = [];

let prev = 0;
for (const stop of STOPS) {
  for (let t = prev; t < stop; t++) sim.tick();
  prev = stop;
  const fit = sim.meanFit();
  frames.push({ img: B.Render.paint(sim, S, { fit: fit }), fit: fit });
  // capture the merging pair
  const consensus = B.Render.Dash.consensusDecoder(sim);
  const fl = B.Render.Dash.representativeFlower(sim, consensus);
  grids.push({ flower: fl ? fl.grid : new Int8Array(B.N * B.N), key: consensus, fit: fit });
}

const fw = frames[0].img.w, fh = frames[0].img.h;
const cols = 2, rows = 2;
const stripW = cols * fw + (cols + 1) * GAP;
const gridCell = 8, gridBlock = B.N * gridCell, pairW = gridBlock * 2 + 14;
const filmW = STOPS.length * (pairW + 24);
const W = Math.max(stripW, filmW + GAP * 2);
const H = rows * fh + (rows + 1) * GAP + gridBlock + 50;
const rgb = new Uint8Array(W * H * 3);
for (let i = 0; i < rgb.length; i += 3) { rgb[i] = 9; rgb[i + 1] = 11; rgb[i + 2] = 15; }

// the four garden frames in a 2×2
for (let i = 0; i < 4; i++) {
  const cx = i % cols, cy = (i / cols) | 0;
  blit(rgb, W, frames[i].img.rgb, fw, fh, GAP + cx * (fw + GAP), GAP + cy * (fh + GAP));
}

// the grid filmstrip across the bottom
function putCell(ox, oy, idx) {
  const c = (idx === B.EMPTY) ? [12, 14, 18] : B.PAL_RGB[idx];
  for (let y = 0; y < gridCell; y++) for (let x = 0; x < gridCell; x++) { const o = ((oy + y) * W + (ox + x)) * 3; rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2]; }
}
function putGrid(ox, oy, g) { for (let i = 0; i < B.N; i++) for (let j = 0; j < B.N; j++) putCell(ox + j * gridCell, oy + i * gridCell, g[i * B.N + j]); }
const filmY = rows * fh + (rows + 1) * GAP + 8;
for (let i = 0; i < grids.length; i++) {
  const ox = GAP + i * (pairW + 24);
  putGrid(ox, filmY, grids[i].flower);
  putGrid(ox + gridBlock + 14, filmY, grids[i].key);
}

fs.mkdirSync(__dirname + '/../shots', { recursive: true });
const out = __dirname + '/../shots/timelapse.png';
fs.writeFileSync(out, encodePNG(W, H, rgb));
console.log('wrote ' + out + '  (' + W + 'x' + H + ', seed ' + seed + ')');
console.log('the merge: ' + grids.map(g => (g.fit * 100).toFixed(0) + '%').join('  →  '));
