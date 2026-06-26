'use strict';
// Shared headless rendering: paint a sim state to an RGB buffer (mirroring render.js's color math)
// and encode RGB → PNG via Node's zlib. Used by shot.js and timelapse.js. Requires the sim modules
// (globalThis.E) to be loaded before renderWorld is called.
const zlib = require('zlib');

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
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const stride = 1 + w * 3, raw = Buffer.alloc(h * stride);
  const src = Buffer.from(rgb.buffer, rgb.byteOffset, rgb.length);
  for (let y = 0; y < h; y++) { raw[y * stride] = 0; src.copy(raw, y * stride + 1, y * w * 3, (y + 1) * w * 3); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function fieldColor(l, m, h) {
  const t = l + m + h + 1e-4, pr = l / t, pg = m / t, pb = h / t;
  const hr = pr * 0.92 + pg * 0.27 + pb * 0.35, hg = pr * 0.71 + pg * 0.55 + pb * 0.69, hb = pr * 0.27 + pg * 0.85 + pb * 0.33;
  let sat = (Math.max(pr, pg, pb) - 1 / 3) / (2 / 3); sat = Math.max(0, Math.min(1, sat));
  const bright = Math.max(0.1, Math.min(1, 0.18 + 0.82 * Math.min(t, 1.5) / 1.5));
  return [(0.17 * (1 - sat) + hr * sat) * bright, (0.18 * (1 - sat) + hg * sat) * bright, (0.20 * (1 - sat) + hb * sat) * bright];
}
function genColor(el) { return [[242, 199, 82], [107, 168, 245], [128, 214, 118]][el] || [200, 200, 200]; }

// render one world into a fresh RGB buffer at scale S. returns { rgb, w, h }.
function renderWorld(E, sim, S) {
  const W = E.W, H = E.H, IW = W * S, IH = H * S, rgb = new Uint8Array(IW * IH * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ci = y * W + x, i = ci * E.NEL;
    let c = fieldColor(sim.field.el[i], sim.field.el[i + 1], sim.field.el[i + 2]);
    const st = Math.min((sim.field.soil ? sim.field.soil[ci] : 0) * 0.7, 0.55);
    if (st > 0) { const br = [0.24, 0.17, 0.10]; c = [c[0] * (1 - st) + br[0] * st, c[1] * (1 - st) + br[1] * st, c[2] * (1 - st) + br[2] * st]; }
    const rt = Math.min((sim.field.rot ? sim.field.rot[ci] : 0) / 1.5, 0.82); // the rot stain (mirrors the shader)
    if (rt > 0) { const rc = [0.14, 0.05, 0.06]; c = [c[0] * (1 - rt) + rc[0] * rt, c[1] * (1 - rt) + rc[1] * rt, c[2] * (1 - rt) + rc[2] * rt]; }
    if (sim.field.barrier && sim.field.barrier[ci]) c = [0.15, 0.14, 0.16]; // rock (terrain) — overrides
    const R = Math.round(c[0] * 255), G = Math.round(c[1] * 255), B = Math.round(c[2] * 255);
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) { const o = (((y * S + dy) * IW) + (x * S + dx)) * 3; rgb[o] = R; rgb[o + 1] = G; rgb[o + 2] = B; }
  }
  for (const e of sim.life.list) {
    if (!e.alive) continue;
    const r = Math.max(1, Math.round(S * 0.9 * (0.5 + Math.min(e.biomass, 2) / 2 * 0.95))); // size by vitality (mirrors render.js)
    const c = E.Render.dietColor(e.diet);
    const p = (e.pred || 0) * 0.85; // predators tint toward crimson — the drama, made visible
    const cr = c[0] * (1 - p) + 0.92 * p, cg = c[1] * (1 - p) + 0.16 * p, cb = c[2] * (1 - p) + 0.16 * p;
    const R = Math.min(255, (cr * 255 | 0) + 25), G = Math.min(255, (cg * 255 | 0) + 30), B = Math.min(255, (cb * 255 | 0) + 25);
    const cx = Math.round((e.x + 0.5) * S), cy = Math.round((e.y + 0.5) * S);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy; if (d2 > r * r) continue;
      const px = cx + dx, py = cy + dy; if (px < 0 || py < 0 || px >= IW || py >= IH) continue;
      const o = (py * IW + px) * 3, edge = d2 > (r - 1) * (r - 1);
      rgb[o] = edge ? 10 : R; rgb[o + 1] = edge ? 11 : G; rgb[o + 2] = edge ? 12 : B;
    }
  }
  for (const g of sim.gens) {
    const frac = (g.r0 && isFinite(g.r0)) ? Math.max(0, Math.min(1, g.reservoir / g.r0)) : 1;
    const gc = genColor(g.el), br = 0.28 + 0.72 * frac, cx = Math.round((g.x + 0.5) * S), cy = Math.round((g.y + 0.5) * S), R2 = Math.round(S * 1.4);
    for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) {
      const md = Math.abs(dx) + Math.abs(dy); if (md > R2) continue;
      const px = cx + dx, py = cy + dy; if (px < 0 || py < 0 || px >= IW || py >= IH) continue;
      const o = (py * IW + px) * 3, edge = md > R2 - 2;
      if (edge) { rgb[o] = 235; rgb[o + 1] = 236; rgb[o + 2] = 242; } else { rgb[o] = (gc[0] * br) | 0; rgb[o + 1] = (gc[1] * br) | 0; rgb[o + 2] = (gc[2] * br) | 0; }
    }
  }
  return { rgb, w: IW, h: IH };
}

// copy a frame's rgb into a wider strip buffer at pixel offset (ox, oy)
function blit(dst, dstW, src, srcW, srcH, ox, oy) {
  for (let y = 0; y < srcH; y++) {
    const so = y * srcW * 3, doo = ((oy + y) * dstW + ox) * 3;
    for (let x = 0; x < srcW * 3; x++) dst[doo + x] = src[so + x];
  }
}

module.exports = { encodePNG, renderWorld, blit };
