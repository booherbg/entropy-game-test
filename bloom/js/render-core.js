;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  const R = B.Render = B.Render || {};

  // The shared painter — pure JS, no canvas/document. Produces an upscaled RGB buffer from sim state.
  // Node encodes it to PNG (headless proof); the browser blits it to a canvas. One painter → headless
  // renders exactly what plays. The world is generative pixel art: dark loam ground, colour = life.

  function hueRGB(h, s, l) { // h,s,l in [0,1] → [r,g,b] 0..255
    const a = s * Math.min(l, 1 - l);
    const f = function (n) { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  R.hueRGB = hueRGB;

  const LOAM = [11, 13, 17], LIT = [34, 30, 24]; // ground: deep loam → faintly lit toward the canopy
  const FR = 2.7;                                 // flower draw radius, in world cells

  // paint the whole world at integer scale S → { rgb, w, h }
  R.paint = function (sim, S, opts) {
    opts = opts || {};
    const W = B.W, H = B.H, IW = W * S, IH = H * S, rgb = new Uint8Array(IW * IH * 3);
    const PAL = B.PAL_RGB, f = sim.field;

    // ── background: loam tinted by the canopy light, plus the recruitment trail as faint green breath ──
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ci = y * W + x, lt = f.light[ci];
      let r = LOAM[0] + (LIT[0] - LOAM[0]) * lt, g = LOAM[1] + (LIT[1] - LOAM[1]) * lt, b = LOAM[2] + (LIT[2] - LOAM[2]) * lt;
      const tr = f.trail[ci];
      if (tr > 0.02) { const a = Math.min(0.5, tr * 0.7); r = r * (1 - a) + 120 * a; g = g * (1 - a) + 200 * a; b = b * (1 - a) + 120 * a; }
      if (f.barrier[ci]) { r = 38; g = 36; b = 42; }
      const Rr = r | 0, Gg = g | 0, Bb = b | 0;
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) { const o = (((y * S + dy) * IW) + (x * S + dx)) * 3; rgb[o] = Rr; rgb[o + 1] = Gg; rgb[o + 2] = Bb; }
    }

    function addPx(px, py, cr, cg, cb, a) {
      if (px < 0 || py < 0 || px >= IW || py >= IH) return;
      const o = (py * IW + px) * 3;
      rgb[o] = Math.min(255, rgb[o] * (1 - a) + cr * a);
      rgb[o + 1] = Math.min(255, rgb[o + 1] * (1 - a) + cg * a);
      rgb[o + 2] = Math.min(255, rgb[o + 2] * (1 - a) + cb * a);
    }
    function glow(cx, cy, rad, cr, cg, cb, strength) {
      const r2 = rad * rad;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const d2 = dx * dx + dy * dy; if (d2 > r2) continue;
        const fall = 1 - Math.sqrt(d2) / rad; addPx(cx + dx, cy + dy, cr, cg, cb, fall * fall * strength);
      }
    }

    // ── plants: a short woody stem rising from the loam to each flower (so a flower reads as grown) ──
    const flowers = sim.allFlowers();
    for (let pi = 0; pi < sim.plants.length; pi++) {
      const p = sim.plants[pi], baseX = Math.round((p.x + 0.5) * S), baseY = Math.round((p.y + 0.9) * S + S * 2);
      for (let fi = 0; fi < p.flowers.length; fi++) {
        const fl = p.flowers[fi], fx = Math.round((fl.x + 0.5) * S), fy = Math.round((fl.y + 0.5) * S);
        const steps = Math.max(2, Math.abs(fy - baseY) >> 1);
        for (let s = 0; s <= steps; s++) { const t = s / steps; addPx(Math.round(baseX + (fx - baseX) * t), Math.round(baseY + (fy - baseY) * t), 70, 96, 52, 0.5); }
      }
    }

    // ── flowers: beacon glow + the generative bloom (the genome's polar expression, pixel art) ──
    for (let i = 0; i < flowers.length; i++) {
      const fl = flowers[i], cx = Math.round((fl.x + 0.5) * S), cy = Math.round((fl.y + 0.5) * S);
      const bc = hueRGB(fl.beaconHue, 0.85, 0.6);
      const stock = Math.min(1, (fl.nectar + fl.pollen) / (fl.cap * 1.4 + 0.01));
      glow(cx, cy, Math.round(FR * S * 2.0), bc[0], bc[1], bc[2], 0.10 + 0.22 * fl.beaconIntensity * (0.4 + 0.6 * stock));
      const RR = Math.round(FR * S);
      for (let dy = -RR; dy <= RR; dy++) for (let dx = -RR; dx <= RR; dx++) {
        const dn = Math.sqrt(dx * dx + dy * dy) / RR; if (dn > 1) continue;
        const idx = B.Genome.regionIndex(fl.genome, dn, Math.atan2(dy, dx));
        if (idx < 0) continue;
        const c = PAL[idx], sh = 1 - dn * 0.26;
        addPx(cx + dx, cy + dy, c[0] * sh, c[1] * sh, c[2] * sh, 0.96);
      }
      if (fl.locked) { // a small lock ring so the player sees their anchor
        const lr = RR + 2; for (let a = 0; a < 28; a++) { const th = a / 28 * B.TAU; addPx(cx + Math.round(Math.cos(th) * lr), cy + Math.round(Math.sin(th) * lr), 240, 230, 180, 0.8); }
      }
    }

    // ── pollinators: small animated dots, tinted toward the beacon they prefer (camouflage you can read) ──
    for (let c = 0; c < sim.colonies.length; c++) {
      const col = sim.colonies[c], bees = col.bees;
      for (let bi = 0; bi < bees.length; bi++) {
        const b = bees[bi], bx = Math.round((b.x + 0.5) * S), by = Math.round((b.y + 0.5) * S);
        const tint = hueRGB(b.key.preference, 0.6, b.nectar > 0 ? 0.72 : 0.55);
        const rr = Math.max(1, (S * 0.28) | 0);
        for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (dx * dx + dy * dy <= rr * rr) addPx(bx + dx, by + dy, tint[0], tint[1], tint[2], 0.92);
        // a faint wing flick (animation cue) — two specks offset by phase
        const ph = ((b.age + bi) % 6) < 3 ? 1 : -1;
        addPx(bx + ph * (rr + 1), by - 1, 235, 235, 240, 0.5);
      }
      // ── the colony: a ring brightening with its nectar store ──
      const cx = Math.round((col.x + 0.5) * S), cy = Math.round((col.y + 0.5) * S);
      const lit = 0.35 + 0.65 * Math.min(1, col.nectar / 20);
      const cr = Math.round(S * 1.7);
      for (let a = 0; a < 60; a++) { const th = a / 60 * B.TAU; for (let w = 0; w < 2; w++) addPx(cx + Math.round(Math.cos(th) * (cr - w)), cy + Math.round(Math.sin(th) * (cr - w)), 240, 184, 112, 0.4 + 0.5 * lit); }
      glow(cx, cy, cr + S, 240, 184, 112, 0.10 * lit);
    }

    return { rgb: rgb, w: IW, h: IH };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
