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

  const FR = 2.7;                                 // flower draw radius, in world cells

  // paint the whole world at integer scale S → { rgb, w, h }
  R.paint = function (sim, S, opts) {
    opts = opts || {};
    const W = B.W, H = B.H, IW = W * S, IH = H * S, rgb = new Uint8Array(IW * IH * 3);
    const PAL = B.PAL_RGB, f = sim.field;
    const fit = opts.fit || 0;
    // THE SEASONAL ARC — the whole screen reports the merge. season 0 = a cold, grey, desaturated dawn
    // (entropy); season 1 = a warm, saturated, golden noon (order). colour = order against grey entropy,
    // made literal. eased so the warming is felt across the climb.
    const warm = Math.max(0, Math.min(1, fit));
    const season = warm * warm * (3 - 2 * warm);   // smoothstep
    // ground palette: cold blue-grey → warm loam; canopy: cold pewter → golden
    const gLo = [15 + season * 8, 17 + season * 2, 24 - season * 10];       // deep ground
    const gHi = [28 + season * 34, 32 + season * 14, 42 - season * 12];     // lit canopy top

    // ── background: seasoned loam lit by the (now-designable) light field. Sunlit zones glow warm; shaded
    //    zones sink dark — so you can SEE the lightscape you paint. Plus the recruitment trail as green breath. ──
    const lb = f.lightBase || 0.72;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ci = y * W + x, lt = f.light[ci], ltc = Math.min(1, lt);
      let r = gLo[0] + (gHi[0] - gLo[0]) * ltc, g = gLo[1] + (gHi[1] - gLo[1]) * ltc, b = gLo[2] + (gHi[2] - gLo[2]) * ltc;
      const dl = lt - lb;                                     // deviation from the even baseline
      if (dl > 0.02) { const w = Math.min(1, dl * 1.6); r += 42 * w; g += 32 * w; b += 10 * w; }        // sunlit lift
      else if (dl < -0.02) { const w = Math.min(1, -dl * 1.3); r *= (1 - 0.55 * w); g *= (1 - 0.5 * w); b *= (1 - 0.4 * w); } // shade
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

    function fillDot(cx, cy, rad, cr, cg, cb, a) {
      const r = Math.max(0, rad | 0); for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) addPx(cx + dx, cy + dy, cr, cg, cb, a);
    }
    // a tapering woody limb along a quadratic bezier (base→tip), thick→thin, with a couple of leaf specks
    function limb(x0, y0, x1, y1, cxp, cyp, w0, w1, seed) {
      const steps = Math.max(4, (Math.hypot(x1 - x0, y1 - y0) / 2) | 0);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cxp + t * t * x1, y = u * u * y0 + 2 * u * t * cyp + t * t * y1;
        const w = w0 + (w1 - w0) * t, sh = 0.78 - t * 0.15;
        fillDot(x | 0, y | 0, w, 96 * sh, 68 * sh, 42 * sh, 0.85);
        if (s > steps * 0.4 && ((s + seed) % 5 === 0)) { // foliage tuft along the limb
          const lx = (x + (((s * 7 + seed) % 5) - 2)) | 0, ly = (y - 1 - ((s * 3 + seed) % 3)) | 0, g = 90 + (seed % 40);
          fillDot(lx, ly, Math.max(1, (S * 0.22) | 0), 70, g, 55, 0.5);
        }
      }
    }

    // ── plants: each a small tree grown from the loam — a tapering trunk, limbs forking up to each
    //    flower (borne at the tips), a leaf crown. the garden is grown, not placed; the void fills with form. ──
    const flowers = sim.allFlowers();
    const tcT = sim.tickCount;
    for (let pi = 0; pi < sim.plants.length; pi++) {
      const p = sim.plants[pi];
      const crownX = Math.round((p.x + 0.5) * S), crownY = Math.round((p.y + 0.5) * S);
      const rootY = crownY + Math.round((2 + p.biomass * 2.2) * S);         // roots deeper as it grows
      const trunkW = Math.max(1.2, S * 0.16 * (0.6 + Math.min(p.biomass, 2) / 2));
      const sway = Math.sin(tcT * 0.03 + p.x) * S * 0.25;
      limb(crownX, rootY, crownX + sway, crownY, crownX + sway * 0.5, (rootY + crownY) / 2, trunkW, trunkW * 0.5, pi);
      // a soft leaf crown + a pair of low leaves so the plant has a body, not just sticks (flowers pop over it)
      fillDot(crownX + (sway | 0), crownY, Math.max(2, (S * 0.62) | 0), 60, 98, 54, 0.4);
      const ly = (rootY + crownY) / 2 | 0, lw = Math.max(1, (S * 0.32) | 0);
      fillDot((crownX - S * 0.6) | 0, ly, lw, 66, 104, 58, 0.42); fillDot((crownX + S * 0.6) | 0, ly - S * 0.4, lw, 66, 104, 58, 0.42);
      for (let fi = 0; fi < p.flowers.length; fi++) {
        const fl = p.flowers[fi];
        const bob = Math.round(Math.sin(tcT * 0.04 + fl.x * 0.7 + fl.y * 0.3) * S * 0.4);
        const fx = Math.round((fl.x + 0.5) * S), fy = Math.round((fl.y + 0.5) * S) + bob;
        const midx = (crownX + fx) / 2 + (fx - crownX) * 0.15, midy = Math.min(crownY, fy) - S * 0.8; // arch upward
        limb(crownX + sway, crownY, fx, fy, midx, midy, trunkW * 0.55, 1, pi + fi + 3);
      }
    }

    // ── flowers: beacon glow + the generative bloom (the genome's polar expression, pixel art) ──
    const tcF = sim.tickCount;
    for (let i = 0; i < flowers.length; i++) {
      const fl = flowers[i], cx = Math.round((fl.x + 0.5) * S);
      const bob = Math.round(Math.sin(tcF * 0.04 + fl.x * 0.7 + fl.y * 0.3) * S * 0.4); // a gentle breathing sway
      const cy = Math.round((fl.y + 0.5) * S) + bob;
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
      // ── pollination sparkle: a flower being set with seed twinkles (the core event made visible) ──
      if (fl.seedProgress > 1.2) {
        const sp = Math.min(1, (fl.seedProgress - 1.2) / 1.8);
        for (let k = 0; k < 5; k++) {
          const a = (tcF * 0.15 + k * 1.257), r = RR * (0.7 + 0.5 * ((tcF * 0.08 + k) % 1));
          const tw = (Math.sin(tcF * 0.4 + k * 2) * 0.5 + 0.5);
          addPx(cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r), 255, 248, 210, sp * tw * 0.85);
        }
      }
      if (fl.locked) { // a small lock ring so the player sees their anchor
        const lr = RR + 2; for (let a = 0; a < 28; a++) { const th = a / 28 * B.TAU; addPx(cx + Math.round(Math.cos(th) * lr), cy + Math.round(Math.sin(th) * lr), 240, 230, 180, 0.8); }
      }
    }

    // ── pollinators: tiny animated foragers, tinted toward the beacon they prefer (camouflage you can read);
    //    they carry a warm glow when laden, and flick wings as they fly (a few frames = "actuation") ──
    const tcB = sim.tickCount;
    for (let c = 0; c < sim.colonies.length; c++) {
      const col = sim.colonies[c], bees = col.bees;
      for (let bi = 0; bi < bees.length; bi++) {
        const b = bees[bi], bx = Math.round((b.x + 0.5) * S), by = Math.round((b.y + 0.5) * S);
        const laden = b.nectar > 0 || b.pollen > 0;
        const tint = hueRGB(b.key.preference, 0.62, laden ? 0.74 : 0.54);
        if (laden) glow(bx, by, Math.max(2, (S * 0.6) | 0), 250, 220, 150, 0.22); // a forager carrying reward glows
        const rr = Math.max(1, (S * 0.26) | 0);
        for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (dx * dx + dy * dy <= rr * rr + 1) addPx(bx + dx, by + dy, tint[0], tint[1], tint[2], 0.94);
        // wings: two pale specks flicking open/closed by phase (animation)
        const open = ((tcB + bi * 3) % 4) < 2 ? rr + 1 : rr;
        addPx(bx - open, by - 1, 240, 240, 248, 0.55); addPx(bx + open, by - 1, 240, 240, 248, 0.55);
        // a dark head dot toward travel — reads as a creature, not a blob
        addPx(bx, by - rr, 30, 26, 22, 0.6);
      }
      // ── the colony: a ring that warms with its nectar store and goes COLD when starving (so a colony that
      //    can't reach flowers reads as dying, not silently vanishing). fed = amber, starving = cold blue-grey. ──
      const cx = Math.round((col.x + 0.5) * S), cy = Math.round((col.y + 0.5) * S);
      const health = Math.min(1, col.nectar / 6);
      const rr = 90 + 150 * health, rg = 110 + 74 * health, rb = 140 - 28 * health;
      const lit = 0.35 + 0.65 * Math.min(1, col.nectar / 20);
      // when critically low, pulse (a distress heartbeat)
      const pulse = health < 0.34 ? (0.6 + 0.4 * Math.sin(tcB * 0.25)) : 1;
      const cr = Math.round(S * 1.7);
      for (let a = 0; a < 60; a++) { const th = a / 60 * B.TAU; for (let w = 0; w < 2; w++) addPx(cx + Math.round(Math.cos(th) * (cr - w)), cy + Math.round(Math.sin(th) * (cr - w)), rr, rg, rb, (0.4 + 0.5 * lit) * pulse); }
      glow(cx, cy, cr + S, rr, rg, rb, 0.10 * lit * pulse);
    }

    // ── ambient motes: pollen + light drifting up on the air (sparse in the cold, thick in high summer) ──
    const MOTES = 10 + Math.round(season * 28), tc = sim.tickCount;
    for (let k = 0; k < MOTES; k++) {
      const hx = (k * 53 % W) + Math.sin(tc * 0.018 + k * 1.7) * 3;
      const hy = H - ((tc * 0.05 + k * (H / MOTES) + (k * 29 % H)) % (H + 6));
      const px = Math.round(hx * S), py = Math.round(hy * S);
      const warmK = 0.18 + 0.32 * warm, tw = (k % 3 === 0);
      glow(px, py, Math.max(1, (S * 0.5) | 0), tw ? 250 : 200, tw ? 220 : 230, tw ? 150 : 170, warmK * 0.5);
      addPx(px, py, 255, 240, 200, warmK);
    }

    // ── the entropy wash: pull the whole frame toward grey when the pair is fumbling, release to full colour
    //    as they match. colour = order; grey = the second law. the screen itself measures the merge. ──
    const desat = (1 - season) * 0.6;
    if (desat > 0.01) {
      for (let i = 0; i < rgb.length; i += 3) {
        const lum = rgb[i] * 0.3 + rgb[i + 1] * 0.59 + rgb[i + 2] * 0.11;
        rgb[i] = rgb[i] + (lum - rgb[i]) * desat;
        rgb[i + 1] = rgb[i + 1] + (lum - rgb[i + 1]) * desat;
        rgb[i + 2] = rgb[i + 2] + (lum - rgb[i + 2]) * desat;
      }
    }

    return { rgb: rgb, w: IW, h: IH };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
