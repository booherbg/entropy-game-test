'use strict';
// Headless screenshot: renders a sim state to a PNG by mirroring render.js's color math in pure JS
// (no WebGL needed). Lets the autonomous loop SEE the world, and lets us send Blaine a preview.
// Usage: node eddy/test/shot.js [ticks] [outname]
const fs = require('fs');
const zlib = require('zlib');
['rng', 'grid', 'field', 'generators', 'life', 'fertility', 'sim', 'render'].forEach(f => require('../js/' + f + '.js'));
const E = globalThis.E;

// ── minimal PNG encoder (RGB8, filter 0), using Node's zlib for IDAT ──
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const cd = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cd), 0);
  return Buffer.concat([len, cd, crc]);
}
function encodePNG(w, h, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const stride = 1 + w * 3, raw = Buffer.alloc(h * stride);
  const src = Buffer.from(rgb.buffer, rgb.byteOffset, rgb.length);
  for (let y = 0; y < h; y++) { raw[y * stride] = 0; src.copy(raw, y * stride + 1, y * w * 3, (y + 1) * w * 3); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ── field color (port of render.js fragment shader) ──
function fieldColor(l, m, h) {
  const t = l + m + h + 1e-4, pr = l / t, pg = m / t, pb = h / t;
  const hr = pr * 0.92 + pg * 0.27 + pb * 0.35, hg = pr * 0.71 + pg * 0.55 + pb * 0.69, hb = pr * 0.27 + pg * 0.85 + pb * 0.33;
  let sat = (Math.max(pr, pg, pb) - 1 / 3) / (2 / 3); sat = Math.max(0, Math.min(1, sat));
  const bright = Math.max(0.1, Math.min(1, 0.18 + 0.82 * Math.min(t, 1.5) / 1.5));
  return [(0.17 * (1 - sat) + hr * sat) * bright, (0.18 * (1 - sat) + hg * sat) * bright, (0.20 * (1 - sat) + hb * sat) * bright];
}

// ── scenario ──
const ticks = parseInt(process.argv[2] || '600', 10);
const name = process.argv[3] || 'world';
const sim = E.makeSim(7);
sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
sim.addGenerator({ x: 100, y: 52, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
sim.addGenerator({ x: 82, y: 28, el: E.HUM, rate: 5, proj: 'vein', angle: 0.5, length: 34 });
sim.dropPrimer(60, 50); sim.dropPrimer(100, 52);
for (let t = 0; t < ticks; t++) sim.tick();

const W = E.W, H = E.H, S = 6, IW = W * S, IH = H * S;
const rgb = new Uint8Array(IW * IH * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const ci = y * W + x, i = ci * E.NEL;
  let c = fieldColor(sim.field.el[i], sim.field.el[i + 1], sim.field.el[i + 2]);
  const st = Math.min((sim.field.soil ? sim.field.soil[ci] : 0) * 0.7, 0.55); // biogenic ground: earthy tint where life built soil
  if (st > 0) { const br = [0.24, 0.17, 0.10]; c = [c[0] * (1 - st) + br[0] * st, c[1] * (1 - st) + br[1] * st, c[2] * (1 - st) + br[2] * st]; }
  const R = Math.round(c[0] * 255), G = Math.round(c[1] * 255), B = Math.round(c[2] * 255);
  for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
    const o = (((y * S + dy) * IW) + (x * S + dx)) * 3; rgb[o] = R; rgb[o + 1] = G; rgb[o + 2] = B;
  }
}
const r = Math.floor(S * 0.9);
for (const e of sim.life.list) {
  if (!e.alive) continue;
  const c = E.Render.dietColor(e.diet);
  const R = Math.min(255, (c[0] * 255 | 0) + 25), G = Math.min(255, (c[1] * 255 | 0) + 30), B = Math.min(255, (c[2] * 255 | 0) + 25);
  const cx = Math.round((e.x + 0.5) * S), cy = Math.round((e.y + 0.5) * S);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d2 = dx * dx + dy * dy; if (d2 > r * r) continue;
    const px = cx + dx, py = cy + dy; if (px < 0 || py < 0 || px >= IW || py >= IH) continue;
    const o = (py * IW + px) * 3, edge = d2 > (r - 1) * (r - 1);
    rgb[o] = edge ? 10 : R; rgb[o + 1] = edge ? 11 : G; rgb[o + 2] = edge ? 12 : B;
  }
}
fs.mkdirSync(__dirname + '/../shots', { recursive: true });
const out = __dirname + '/../shots/' + name + '.png';
fs.writeFileSync(out, encodePNG(IW, IH, rgb));
const s = sim.stats();
console.log(`wrote ${out}  (${IW}x${IH}, ${ticks} ticks, ${s.alive} alive, ${s.speciesApprox} diets)`);
