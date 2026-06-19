/* LOOPHOLE — renderer. Browser-only. Reads game state, draws everything;
   simulates nothing. Static board layer redrawn on change; fx layer every frame. */
(function () {
  'use strict';
  const LP = globalThis.LP;
  const { U, HEX, RNG } = LP;
  const SQ3 = Math.sqrt(3);

  const PAL = LP.PAL = {
    page: '#0d0a08',
    loam0: '#3b2e1f', loam1: '#463623', loam2: '#524230',
    gap: '#171210',
    grey: '#807d75', greyDark: '#54524d',
    mossDark: '#36492a', moss0: '#56743f', moss1: '#7c9e57', moss2: '#a7c47b', mossGlow: '#cfe6a4',
    fern0: '#4d8246', fern1: '#7cb35e', fern2: '#cfe89a',
    dew: '#d7ecde', dewBlue: '#9ed2c8', dewDeep: '#6fa89e',
    crys0: '#b8d8da', crys1: '#eef8f4', crysShadow: '#5c7d84',
    myc: '#cdbb8f', mycLight: '#ece0bb',
    sap: '#8fd66a', sapGlow: '#c4f0a0', sapStarve: '#d98a6a',
    antBody: '#241d15', nest0: '#5c4830', nest1: '#73593b',
    blooms: ['#e8a8c0', '#ecd985', '#f2efe2', '#aed4e6', '#e8b88a', '#d9a8e0'],
    heart0: '#6f5236', heart1: '#a8845a', heartGlow: '#d8b88a',
    storm: '#2e3338', stormShine: '#6a7480', stormBolt: '#d6e6f2',
    rot0: '#382b40', rot1: '#5a4562', rotVein: '#8a6a92', rotSpore: '#b89ad2', wisp: '#c2b884',
    gold: '#d8c068', text: '#e8e2d4',
    rare: { common: '#a9c47e', uncommon: '#9ed2c8', legendary: '#e6c86a' },
  };

  const TAU = Math.PI * 2;
  const rngOf = s => new RNG('vis|' + s);

  /* ─────────── reaction-diffusion substrate (Gray-Scott, computed once) ─────────── */
  function makeRDTexture(n, steps) {
    const A = new Float32Array(n * n).fill(1);
    const B = new Float32Array(n * n);
    const r = rngOf('rd');
    for (let i = 0; i < 14; i++) {
      const cx = 4 + r.i(n - 8), cy = 4 + r.i(n - 8);
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++)
        B[((cy + y + n) % n) * n + ((cx + x + n) % n)] = 1;
    }
    const f = 0.037, k = 0.062, dA = 1.0, dB = 0.5;
    const A2 = new Float32Array(n * n), B2 = new Float32Array(n * n);
    for (let s = 0; s < steps; s++) {
      for (let y = 0; y < n; y++) {
        const ym = ((y - 1 + n) % n) * n, yp = ((y + 1) % n) * n, y0 = y * n;
        for (let x = 0; x < n; x++) {
          const xm = (x - 1 + n) % n, xp = (x + 1) % n;
          const i = y0 + x;
          const lapA = A[ym + x] + A[yp + x] + A[y0 + xm] + A[y0 + xp]
            + 0.5 * (A[ym + xm] + A[ym + xp] + A[yp + xm] + A[yp + xp]) - 6 * A[i];
          const lapB = B[ym + x] + B[yp + x] + B[y0 + xm] + B[y0 + xp]
            + 0.5 * (B[ym + xm] + B[ym + xp] + B[yp + xm] + B[yp + xp]) - 6 * B[i];
          const abb = A[i] * B[i] * B[i];
          A2[i] = U.clamp(A[i] + dA * 0.2 * lapA - abb + f * (1 - A[i]), 0, 1);
          B2[i] = U.clamp(B[i] + dB * 0.2 * lapB + abb - (k + f) * B[i], 0, 1);
        }
      }
      A.set(A2); B.set(B2);
    }
    const cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const v = U.clamp(B[i] * 2.2, 0, 1);
      img.data[i * 4] = 90 + v * 110;
      img.data[i * 4 + 1] = 76 + v * 95;
      img.data[i * 4 + 2] = 54 + v * 60;
      img.data[i * 4 + 3] = v * 255;
    }
    cx.putImageData(img, 0, 0);
    return cv;
  }

  /* ─────────── grain tiles for entropy ─────────── */
  function makeGrainTile(seed) {
    const n = 96, cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const cx = cv.getContext('2d');
    const r = rngOf('grain' + seed);
    for (let i = 0; i < 720; i++) {
      const g = 95 + r.i(85);
      cx.fillStyle = `rgba(${g},${g},${g - 6},${0.16 + r.f() * 0.4})`;
      const w = 1 + r.f() * 1.7;
      cx.fillRect(r.f() * n, r.f() * n, w, w);
    }
    return cv;
  }

  /* color helpers */
  function hexToRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mix(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return `rgb(${Math.round(U.lerp(a[0], b[0], t))},${Math.round(U.lerp(a[1], b[1], t))},${Math.round(U.lerp(a[2], b[2], t))})`;
  }
  function rgba(h, a) {
    const c = hexToRgb(h);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  /* ─────────── the renderer ─────────── */
  class Renderer {
    constructor(boardCv, fxCv) {
      this.bc = boardCv; this.fc = fxCv;
      this.bx = boardCv.getContext('2d');
      this.fx = fxCv.getContext('2d');
      this.game = null;
      this.pos = new Map();       /* key -> {x,y} */
      this.shapes = new Map();    /* key -> Path2D (local coords) */
      this.s = 24; this.ox = 0; this.oy = 0;
      this.dirtyFlag = true;
      this.particles = [];
      this.pulses = [];
      this.agents = new Map();    /* nest key -> agent list */
      this.warned = [];           /* telegraphed storm cells */
      this.warnCenter = null;
      this.blightWarned = [];
      this.bolts = [];
      this.flashT = 0; this.shake = 0;
      this.view = { scale: 1, ox: 0, oy: 0 }; /* board pan/zoom (mobile) */
      this.hovered = null; this.mode = null;
      this.auraFor = null;
      this.valuesMode = false;
      this.spores = [];
      this.cinematic = null;
      this.expandT = 0;
      this.rd = makeRDTexture(140, 260);
      this.grains = [makeGrainTile(1), makeGrainTile(2), makeGrainTile(3)];
      this.t0 = performance.now();
      this._raf = null;
    }

    attach(game) {
      this.game = game;
      this.agents = new Map();
      this.particles = []; this.pulses = []; this.warned = [];
      this.cinematic = null;
      this.resetView();
      this.layout();
    }

    start() {
      if (this._raf) return;
      const loop = () => { this.frame((performance.now() - this.t0) / 1000); this._raf = requestAnimationFrame(loop); };
      this._raf = requestAnimationFrame(loop);
    }

    layout() {
      const wrap = this.bc.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = wrap.clientWidth, H = wrap.clientHeight;
      for (const cv of [this.bc, this.fc]) {
        cv.width = W * dpr; cv.height = H * dpr;
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
      }
      this.dpr = dpr;
      if (!this.game) return;
      const R = this.game.radius;
      this.s = Math.min(W / (SQ3 * (2 * R + 1.6)), H / (1.5 * (2 * R) + 2.6));
      this.ox = W / 2; this.oy = H / 2;
      this.pos.clear(); this.shapes.clear();
      for (const c of this.game.cells.values()) {
        const k = HEX.key(c.q, c.r);
        const x = this.ox + this.s * SQ3 * (c.q + c.r / 2);
        const y = this.oy + this.s * 1.5 * c.r;
        this.pos.set(k, { x, y });
        this.shapes.set(k, this._cellShape(k));
      }
      this.dirtyFlag = true;
    }

    _cellShape(k) {
      /* a hexagon with softened, slightly irregular corners — pebble, not circle */
      const r = rngOf('cell' + k);
      const p = new Path2D();
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = TAU * (i + 0.5) / 6 + (r.f() - 0.5) * 0.06;
        const rad = 0.96 + (r.f() - 0.5) * 0.09;
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      const along = (a, b, t) => [U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t)];
      let prev = pts[5], cur = pts[0];
      let q = along(prev, cur, 0.78);
      p.moveTo(q[0], q[1]);
      for (let i = 0; i < 6; i++) {
        cur = pts[i];
        const nxt = pts[(i + 1) % 6];
        const q1 = along(prev, cur, 0.78);
        const q2 = along(cur, nxt, 0.22);
        const q3 = along(cur, nxt, 0.78);
        p.lineTo(q1[0], q1[1]);
        p.quadraticCurveTo(cur[0], cur[1], q2[0], q2[1]);
        p.lineTo(q3[0], q3[1]);
        prev = cur;
      }
      p.closePath();
      return p;
    }

    cellAt(px, py) {
      /* invert the pan/zoom view, then the hex layout */
      px = (px - this.view.ox) / this.view.scale;
      py = (py - this.view.oy) / this.view.scale;
      const x = px - this.ox, y = py - this.oy;
      const qf = (SQ3 / 3 * x - y / 3) / this.s, rf = (2 / 3 * y) / this.s;
      /* cube round */
      let q = Math.round(qf), r = Math.round(rf), sc = Math.round(-qf - rf);
      const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(sc + qf + rf);
      if (dq > dr && dq > ds) q = -r - sc;
      else if (dr > ds) r = -q - sc;
      const k = HEX.key(q, r);
      return this.game && this.game.cells.has(k) ? k : null;
    }

    /* ── pan/zoom view (mobile gestures) ── */
    clampView() {
      const W = this.fc.width / this.dpr, H = this.fc.height / this.dpr;
      this.view.scale = U.clamp(this.view.scale, 1, 4);
      /* keep the board mostly on-screen: limit how far the (scaled) center can drift */
      const marginX = W * 0.42 * this.view.scale, marginY = H * 0.42 * this.view.scale;
      this.view.ox = U.clamp(this.view.ox, -marginX, marginX);
      this.view.oy = U.clamp(this.view.oy, -marginY, marginY);
    }
    zoomAt(cx0, cy0, factor) {
      const s0 = this.view.scale;
      const s1 = U.clamp(s0 * factor, 1, 4);
      const k = s1 / s0;
      /* zoom about the focal screen point */
      this.view.ox = cx0 - (cx0 - this.view.ox) * k;
      this.view.oy = cy0 - (cy0 - this.view.oy) * k;
      this.view.scale = s1;
      this.clampView();
    }
    panBy(dx, dy) { this.view.ox += dx; this.view.oy += dy; this.clampView(); }
    resetView() { this.view = { scale: 1, ox: 0, oy: 0 }; }

    dirty() { this.dirtyFlag = true; }

    /* ───── static board ───── */
    redraw() {
      const g = this.game, cx = this.bx;
      if (g && g.cells.size !== this.pos.size) this.layout(); /* world grew; self-heal */
      const W = this.bc.width / this.dpr, H = this.bc.height / this.dpr;
      cx.save();
      cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const bg = cx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.72);
      bg.addColorStop(0, '#181310');
      bg.addColorStop(1, PAL.page);
      cx.fillStyle = bg;
      cx.fillRect(0, 0, W, H);
      if (!g) { cx.restore(); return; }
      cx.translate(this.view.ox, this.view.oy); cx.scale(this.view.scale, this.view.scale); /* pan/zoom */
      /* the clearing: a warm ground disc beneath the whole board */
      const span0 = this.s * (2 * g.radius + 2.4) * 0.62;
      const gd = cx.createRadialGradient(this.ox, this.oy, span0 * 0.2, this.ox, this.oy, span0 * 1.18);
      gd.addColorStop(0, '#262017');
      gd.addColorStop(0.82, '#1d1812');
      gd.addColorStop(1, rgba('#1d1812', 0));
      cx.fillStyle = gd;
      cx.beginPath(); cx.arc(this.ox, this.oy, span0 * 1.2, 0, TAU); cx.fill();

      /* cells */
      for (const c of g.cells.values()) this._drawCellBase(cx, c);
      /* substrate texture across the living board */
      cx.save();
      cx.globalCompositeOperation = 'soft-light';
      cx.globalAlpha = 0.55;
      const span = this.s * (2 * g.radius + 2);
      cx.drawImage(this.rd, this.ox - span / 2, this.oy - span / 2, span, span);
      cx.restore();
      /* grey grain over entropy */
      for (const c of g.cells.values()) this._drawCellGrain(cx, c);
      /* mycelial links under patterns */
      this._drawLinks(cx);
      /* trails */
      this._drawTrails(cx);
      /* patterns */
      for (const c of g.cells.values()) if (c.pat) this._drawPattern(cx, c);
      /* megafauna roam over the meadow (a mobile overlay, drawn on top) */
      if (g.fauna && g.fauna.length) for (const f of g.fauna) this._drawFauna(cx, f, g.faunaSpecies && g.faunaSpecies.get(f.spId));
      /* blight gnaws over everything */
      if (g.blight) for (const [k, b] of g.blight) { const c = g.cells.get(k); if (c) this._drawBlight(cx, c, b); }
      /* per-cell role dots: a glance tells you producer / fed / starving / idle */
      for (const c of g.cells.values()) {
        const p = c.pat; if (!p || !p._s) continue;
        const s = p._s;
        let dot = null;
        if (s.role === 'producer') dot = s.prod > 0 ? PAL.sap : null;
        else if (s.role === 'consumer') dot = (p.fed != null && p.fed < 0.5) ? PAL.sapStarve : PAL.dewBlue;
        if (!dot) continue;
        const pos = this.pos.get(HEX.key(c.q, c.r));
        cx.fillStyle = rgba(dot, 0.92);
        cx.beginPath(); cx.arc(pos.x + this.s * 0.42, pos.y - this.s * 0.42, this.s * 0.1, 0, TAU); cx.fill();
        cx.strokeStyle = 'rgba(10,8,6,0.5)'; cx.lineWidth = 0.8; cx.stroke();
      }
      /* placement guide: with a plant tool held, ring every cell it can root in */
      if (this.mode && this.mode.type === 'plant') {
        for (const c of g.cells.values()) {
          if (c.pat) continue;
          const k = HEX.key(c.q, c.r), p = this.pos.get(k);
          if (!p || !g.canPlant(this.mode.pt, k).ok) continue;
          cx.save(); cx.translate(p.x, p.y); cx.scale(this.s, this.s);
          cx.strokeStyle = rgba(PAL.mossGlow, 0.5); cx.lineWidth = 2.4 / this.s;
          cx.stroke(this.shapes.get(k));
          cx.restore();
        }
      }
      cx.restore();
      this.dirtyFlag = false;
    }

    _drawBlight(cx, c, b) {
      const k = HEX.key(c.q, c.r), p = this.pos.get(k);
      if (!p) return;
      const r = rngOf('rot' + k);
      cx.save();
      cx.translate(p.x, p.y);
      cx.scale(this.s, this.s);
      cx.clip(this.shapes.get(k));
      if (b.kind === 'wisp') {
        const gl = cx.createRadialGradient(0, 0, 0.05, 0, 0, 0.7);
        gl.addColorStop(0, rgba(PAL.wisp, 0.7));
        gl.addColorStop(1, rgba(PAL.wisp, 0));
        cx.fillStyle = gl;
        cx.beginPath(); cx.arc(0, 0, 0.7, 0, TAU); cx.fill();
      } else {
        cx.fillStyle = rgba(PAL.rot0, 0.82);
        cx.beginPath(); cx.arc(0, 0, 0.96, 0, TAU); cx.fill();
        cx.strokeStyle = rgba(PAL.rotVein, 0.72); cx.lineWidth = 0.055; cx.lineCap = 'round';
        const arms = 4 + r.i(3);
        for (let i = 0; i < arms; i++) {
          let aa = r.f() * TAU, x = 0, y = 0;
          cx.beginPath(); cx.moveTo(0, 0);
          for (let s = 0; s < 3; s++) {
            aa += (r.f() - 0.5) * 1.3;
            const len = 0.28 + r.f() * 0.26;
            x += Math.cos(aa) * len; y += Math.sin(aa) * len;
            cx.lineTo(x, y);
          }
          cx.stroke();
        }
        cx.fillStyle = rgba(PAL.rot1, 0.92);
        cx.beginPath(); cx.arc(0, 0, 0.2, 0, TAU); cx.fill();
        cx.fillStyle = rgba(PAL.rotSpore, 0.8);
        cx.beginPath(); cx.arc(-0.05, -0.05, 0.07, 0, TAU); cx.fill();
      }
      cx.restore();
    }

    _drawCellBase(cx, c) {
      const k = HEX.key(c.q, c.r), p = this.pos.get(k);
      if (!p) return;
      const r = rngOf('soil' + k);
      const e = c.e;
      cx.save();
      cx.translate(p.x, p.y);
      cx.scale(this.s, this.s);
      let loam = [PAL.loam0, PAL.loam1, PAL.loam2][r.i(3)];
      /* soil tints the ground so the land can be read at a glance */
      const soilDef = (LP.CONTENT.SOILS && LP.CONTENT.SOILS[c.soil]) || null;
      const tint = soilDef ? soilDef.tint : null;
      if (tint && c.soil !== 'loam') loam = mix(loam, tint, 0.85);
      /* order = warm loam (greening as it deepens); entropy = cold light static */
      let base = loam;
      if (e < 0.45) base = mix(loam, '#4d5c38', (0.45 - e) * 1.2);
      /* even noise keeps a clear cast of the soil beneath it, so biomes stay legible */
      let noiseGrey = mix(PAL.greyDark, PAL.grey, e);
      if (tint && c.soil !== 'loam') noiseGrey = mix(noiseGrey, tint, 0.4);
      const fill = mix(base, noiseGrey, Math.pow(e, 0.95) * 0.92);
      cx.fillStyle = fill;
      cx.fill(this.shapes.get(k));
      /* deep order glows like dawn pooling in the hollows */
      if (e < 0.35) {
        const gl = cx.createRadialGradient(-0.15, -0.2, 0.05, 0, 0, 1.05);
        gl.addColorStop(0, rgba(PAL.dew, (0.35 - e) * 0.55));
        gl.addColorStop(0.7, rgba(PAL.dew, (0.35 - e) * 0.12));
        gl.addColorStop(1, rgba(PAL.dew, 0));
        cx.fillStyle = gl;
        cx.fill(this.shapes.get(k));
      }
      cx.restore();
    }

    _drawCellGrain(cx, c) {
      if (c.e < 0.12) return;
      const k = HEX.key(c.q, c.r), p = this.pos.get(k);
      const h = U.hash32(k);
      cx.save();
      cx.translate(p.x, p.y);
      cx.scale(this.s, this.s);
      cx.clip(this.shapes.get(k));
      cx.globalAlpha = Math.min(0.9, Math.max(0, c.e - 0.12) * 1.05);
      const tile = this.grains[h % 3];
      const offX = -1.4 + ((h >> 3) % 64) / 80, offY = -1.4 + ((h >> 9) % 64) / 80;
      cx.drawImage(tile, offX, offY, 2.8, 2.8);
      cx.globalAlpha = 1;
      cx.restore();
    }

    _linkPairs() {
      const out = [];
      const g = this.game;
      for (const c of g.cells.values()) {
        if (!c.pat || !(c.pat.t === 'myc' || c.pat.t === 'heart') || !c.pat.links) continue;
        const a = this.pos.get(HEX.key(c.q, c.r));
        for (const lk of c.pat.links) {
          const b = this.pos.get(lk);
          if (a && b) out.push([a, b, HEX.key(c.q, c.r) + '>' + lk]);
        }
      }
      return out;
    }

    _drawLinks(cx) {
      for (const [a, b, id] of this._linkPairs()) {
        const r = rngOf('link' + id);
        const mx = (a.x + b.x) / 2 + (r.f() - 0.5) * this.s * 0.9;
        const my = (a.y + b.y) / 2 + (r.f() - 0.5) * this.s * 0.9 + this.s * 0.22;
        cx.strokeStyle = rgba(PAL.mycLight, 0.62);
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.moveTo(a.x, a.y);
        cx.quadraticCurveTo(mx, my, b.x, b.y);
        cx.stroke();
        /* tiny hairs */
        cx.strokeStyle = rgba(PAL.myc, 0.25);
        cx.lineWidth = 0.7;
        for (let i = 0; i < 3; i++) {
          const t = 0.25 + r.f() * 0.5;
          const px = U.lerp(U.lerp(a.x, mx, t), U.lerp(mx, b.x, t), t);
          const py = U.lerp(U.lerp(a.y, my, t), U.lerp(my, b.y, t), t);
          cx.beginPath();
          cx.moveTo(px, py);
          cx.lineTo(px + (r.f() - 0.5) * 7, py + (r.f() - 0.5) * 7);
          cx.stroke();
        }
      }
    }

    _drawTrails(cx) {
      const g = this.game;
      for (const c of g.cells.values()) {
        if (!c.trail) continue;
        const p = this.pos.get(HEX.key(c.q, c.r));
        cx.fillStyle = rgba(PAL.gold, 0.05);
        cx.beginPath();
        cx.arc(p.x, p.y, this.s * 0.55, 0, TAU);
        cx.fill();
      }
    }

    /* mature moss earns only beside a gradient (a neighbor ≥30% entropy, or the rim) —
       mirrors the income rule, so spring-green moss = the moss actually paying you */
    _mossEarning(c) {
      if (c.pat.age < 3) return false;
      for (const nk of HEX.neighborsK(HEX.key(c.q, c.r))) {
        const nc = this.game.cells.get(nk);
        if (!nc || nc.e >= 0.3) return true;
      }
      return false;
    }
    _drawPattern(cx, c) {
      const k = HEX.key(c.q, c.r), p = this.pos.get(k);
      cx.save();
      cx.translate(p.x, p.y);
      const s = this.s;
      switch (c.pat.t) {
        case 'moss': this.drawMoss(cx, s, c.pat.age, k, this._mossEarning(c)); break;
        case 'frond': this.drawFrond(cx, s, c.pat.depth, k); break;
        case 'ant': this.drawNest(cx, s, c.pat.pop, k); break;
        case 'myc': this.drawMycKnot(cx, s, k); break;
        case 'crys': this.drawCrystal(cx, s, k); break;
        case 'bloom': this.drawBloom(cx, s, k, c.pat.age); break;
        case 'heart': this.drawHeart(cx, s, k, c.pat.age); break;
        case 'flora': this.drawFlora(cx, s, c.pat, this.game.species && this.game.species.get(c.pat.sp)); break;
      }
      cx.restore();
    }

    /* an emergent flower — coloured by the species' diet (the element it eats).
       established beds are full and bright; pioneers small and translucent. */
    drawFlora(cx, s, p, sp) {
      const col = (sp && sp.color) || '#9bd6a0';
      const bl = (sp && sp.blend) || [1, 0, 0];
      const r = rngOf('flora' + (sp ? sp.id : 0));
      /* the SILHOUETTE reads the diet too: a light-eater is spare & star-pointed, a rot-eater
         lush & many-petaled, a stone-eater somewhere between — form echoes colour echoes diet */
      const petals = 4 + Math.round(bl[2] * 5 + bl[1] * 2) + r.i(2);
      const plen = size => size * (0.46 - bl[2] * 0.10);  /* lumen → long pointed petals */
      const pwid = size => size * (0.17 + bl[2] * 0.15);  /* humus → wide full petals */
      const est = p.est;
      const size = s * (est ? 0.36 : 0.22) * (0.85 + Math.min(p.age || 0, 6) * 0.025);
      cx.save();
      /* an established bed glows faintly in its diet colour — emergent life reads as special,
         not lost amid the moss; pioneers stay quiet until they take */
      if (est) {
        const g = cx.createRadialGradient(0, 0, 0, 0, 0, size * 1.7);
        g.addColorStop(0, rgba(col, 0.26)); g.addColorStop(1, rgba(col, 0));
        cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, size * 1.7, 0, TAU); cx.fill();
      }
      cx.rotate(r.f() * TAU + (p.age || 0) * 0.025);
      for (let i = 0; i < petals; i++) {
        const a = TAU * i / petals;
        cx.fillStyle = rgba(col, est ? 0.92 : 0.5);
        cx.beginPath();
        cx.ellipse(Math.cos(a) * size * 0.5, Math.sin(a) * size * 0.5, plen(size), pwid(size), a, 0, TAU);
        cx.fill();
      }
      cx.fillStyle = rgba('#ffffff', est ? 0.7 : 0.32);
      cx.beginPath(); cx.arc(0, 0, size * 0.2, 0, TAU); cx.fill();
      cx.restore();
    }

    /* a grazing megafauna — a low, broad beast in its diet's colour, head dipped to the meadow.
       larger than any flower and softly haloed, so the eye finds the life moving over the field. */
    _drawFauna(cx, f, sp) {
      const k = HEX.key(f.q, f.r), p = this.pos.get(k); if (!p) return;
      const col = (sp && sp.color) || '#d8c0a8';
      const s = this.s * 1.25, dir = (f.q + f.r) % 2 ? 1 : -1; /* megafauna are LARGE — bigger than any flower */
      cx.save();
      cx.translate(p.x, p.y); cx.scale(dir, 1);
      const g = cx.createRadialGradient(0, 0, 0, 0, 0, s * 0.95);
      g.addColorStop(0, rgba(col, 0.30)); g.addColorStop(1, rgba(col, 0));
      cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, s * 0.95, 0, TAU); cx.fill();
      cx.strokeStyle = rgba('#1a140e', 0.7); cx.lineWidth = s * 0.10; cx.lineCap = 'round';
      for (const dx of [-0.28, -0.06, 0.18, 0.36]) { cx.beginPath(); cx.moveTo(s * dx, s * 0.16); cx.lineTo(s * dx, s * 0.46); cx.stroke(); } /* legs */
      cx.fillStyle = rgba(col, 0.96);
      cx.strokeStyle = rgba('#1a140e', 0.55); cx.lineWidth = s * 0.05;
      cx.beginPath(); cx.ellipse(-s * 0.02, -s * 0.06, s * 0.52, s * 0.30, 0, 0, TAU); cx.fill(); cx.stroke(); /* body, outlined to stand out */
      cx.beginPath(); cx.ellipse(s * 0.48, s * 0.18, s * 0.18, s * 0.15, 0.3, 0, TAU); cx.fill(); cx.stroke(); /* head, dipped to graze */
      cx.fillStyle = rgba('#fff', 0.5); cx.beginPath(); cx.arc(s * 0.52, s * 0.13, s * 0.03, 0, TAU); cx.fill(); /* eye */
      cx.restore();
    }

    /* ── pattern art (centered at 0,0; s = cell size) ── */
    drawMoss(cx, s, age, seed, earning) {
      /* ground-hugging patches with soil showing through — carpet, not broccoli.
         earning moss (on a gradient/frontier, paying order) glows spring-green;
         idle interior moss (cleaned out, no longer paying) sits dark-green. */
      if (earning == null) earning = true;
      const young = age < 3;
      /* young = pale grey-green (establishing) · producing = bright spring · idle = dark */
      const base = young ? ['#586049', '#6e7a56'] : (earning ? [PAL.moss1, PAL.moss2] : [PAL.mossDark, PAL.moss0]);
      const specks = young ? ['#6e7a56', '#838d68'] : (earning ? [PAL.moss2, PAL.mossGlow, PAL.moss2] : [PAL.mossDark, PAL.moss0, PAL.moss1]);
      const r = rngOf('moss' + seed);
      const grown = Math.min(age, 6) / 6;
      const patches = 2 + Math.round(grown * 2);
      const centers = [];
      for (let i = 0; i < patches; i++) {
        const a = r.f() * TAU, d = r.f() * s * 0.34;
        const px = Math.cos(a) * d, py = Math.sin(a) * d * 0.9;
        centers.push([px, py]);
        const rad = s * (0.22 + r.f() * 0.16 + grown * 0.12);
        cx.fillStyle = rgba(i % 2 ? base[0] : base[1], 0.5 + grown * 0.25);
        cx.beginPath();
        cx.ellipse(px, py, rad, rad * (0.7 + r.f() * 0.25), r.f() * TAU, 0, TAU);
        cx.fill();
      }
      const n = 7 + Math.round(grown * 14);
      for (let i = 0; i < n; i++) {
        const c0 = centers[r.i(centers.length)];
        const a = r.f() * TAU, d = Math.pow(r.f(), 1.4) * s * 0.3;
        cx.fillStyle = rgba(specks[r.i(specks.length)], 0.85);
        cx.beginPath();
        cx.arc(c0[0] + Math.cos(a) * d, c0[1] + Math.sin(a) * d * 0.9, s * (0.035 + r.f() * 0.05), 0, TAU);
        cx.fill();
      }
      if (age >= 3 && earning) {
        for (let i = 0; i < 4; i++) {
          const c0 = centers[r.i(centers.length)];
          cx.fillStyle = rgba(PAL.mossGlow, 0.95);
          cx.beginPath();
          cx.arc(c0[0] + (r.f() - 0.5) * s * 0.3, c0[1] + (r.f() - 0.5) * s * 0.3, s * 0.032, 0, TAU);
          cx.fill();
        }
      }
    }

    /* the showpiece: a recursive fern that grows past its cell */
    drawFrond(cx, s, depth, seed) {
      const r = rngOf('frond' + seed);
      const lean = (r.f() - 0.5) * 0.7;
      const d = Math.max(1, depth);
      const len = s * (0.62 + 0.24 * d);
      /* rooted shadow */
      cx.fillStyle = 'rgba(10,8,5,0.35)';
      cx.beginPath(); cx.ellipse(0, s * 0.42, s * 0.3, s * 0.1, 0, 0, TAU); cx.fill();
      cx.save();
      cx.translate(0, s * 0.45);
      cx.rotate(lean * 0.4);
      this._fern(cx, len, d, -Math.PI / 2 + lean * 0.25, r, 0);
      if (d >= 4) { /* a second, younger frond at the base */
        cx.rotate(lean > 0 ? -0.85 : 0.85);
        this._fern(cx, len * 0.45, Math.max(1, d - 3), -Math.PI / 2 + lean * 0.4, r, 0);
      }
      cx.restore();
      /* dew at the tip for deep fronds */
      if (depth >= 5) {
        cx.fillStyle = rgba(PAL.dew, 0.85);
        cx.beginPath();
        cx.arc(lean * s * 0.4, -len * 0.92 + s * 0.45, s * 0.05, 0, TAU);
        cx.fill();
      }
    }
    _fern(cx, len, depth, ang, r, level) {
      const nodes = 3 + depth;
      const curl = (r.f() - 0.5) * 0.16;
      let x = 0, y = 0, a = ang;
      const w0 = Math.max(0.8, 1 + depth * 0.45 - level * 1.2);
      for (let i = 0; i < nodes; i++) {
        const t = i / nodes;
        const seg = len / nodes;
        const nx = x + Math.cos(a) * seg, ny = y + Math.sin(a) * seg;
        cx.strokeStyle = mix(PAL.fern0, PAL.fern2, U.clamp(t + level * 0.3, 0, 1));
        cx.lineWidth = Math.max(0.5, w0 * (1 - t * 0.8));
        cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(x, y); cx.lineTo(nx, ny); cx.stroke();
        /* pinnae */
        if (i > 0 && level < 2) {
          const plen = len * 0.34 * (1 - t * 0.75);
          for (const side of [-1, 1]) {
            const pa = a + side * (1.05 + curl);
            if (depth >= 3 && level === 0) {
              cx.save(); cx.translate(nx, ny);
              this._fern(cx, plen, Math.max(1, depth - 2), pa, r, level + 1);
              cx.restore();
            } else {
              cx.strokeStyle = mix(PAL.fern1, PAL.fern2, t);
              cx.lineWidth = Math.max(0.4, w0 * 0.5 * (1 - t));
              cx.beginPath(); cx.moveTo(nx, ny);
              cx.quadraticCurveTo(
                nx + Math.cos(pa) * plen * 0.6, ny + Math.sin(pa) * plen * 0.6,
                nx + Math.cos(pa + curl * 2) * plen, ny + Math.sin(pa + curl * 2) * plen);
              cx.stroke();
            }
          }
        }
        x = nx; y = ny; a += curl * 0.5;
      }
    }

    drawNest(cx, s, pop, seed) {
      const r = rngOf('nest' + seed);
      cx.fillStyle = PAL.nest0;
      cx.beginPath(); cx.ellipse(0, s * 0.12, s * 0.42, s * 0.3, 0, 0, TAU); cx.fill();
      cx.fillStyle = PAL.nest1;
      cx.beginPath(); cx.ellipse(-s * 0.05, 0, s * 0.32, s * 0.22, -0.2, 0, TAU); cx.fill();
      cx.fillStyle = '#15100b';
      cx.beginPath(); cx.ellipse(0, -s * 0.02, s * 0.09, s * 0.065, 0, 0, TAU); cx.fill();
      /* crumbs */
      cx.fillStyle = rgba(PAL.nest1, 0.7);
      for (let i = 0; i < 7; i++) {
        const a = r.f() * TAU;
        cx.fillRect(Math.cos(a) * s * (0.4 + r.f() * 0.2), s * 0.1 + Math.sin(a) * s * 0.18, 1.4, 1.4);
      }
    }

    drawMycKnot(cx, s, seed) {
      const r = rngOf('knot' + seed);
      cx.strokeStyle = rgba(PAL.mycLight, 0.85);
      cx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        const a = TAU * i / 5 + r.f() * 0.5;
        cx.beginPath();
        cx.moveTo(0, 0);
        cx.quadraticCurveTo(
          Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2,
          Math.cos(a + 0.5) * s * 0.36, Math.sin(a + 0.5) * s * 0.36);
        cx.stroke();
      }
      cx.fillStyle = PAL.mycLight;
      cx.beginPath(); cx.arc(0, 0, s * 0.09, 0, TAU); cx.fill();
    }

    drawCrystal(cx, s, seed) {
      const r = rngOf('crys' + seed);
      const spikes = 2 + r.i(2);
      for (let i = 0; i < spikes; i++) {
        const bx = (r.f() - 0.5) * s * 0.5, by = s * 0.25 - r.f() * s * 0.1;
        const h = s * (0.55 + r.f() * 0.4), w = s * (0.16 + r.f() * 0.1);
        const tilt = (r.f() - 0.5) * 0.5;
        cx.save();
        cx.translate(bx, by); cx.rotate(tilt);
        cx.fillStyle = rgba(PAL.crysShadow, 0.5);
        cx.beginPath();
        cx.moveTo(-w, 0); cx.lineTo(0, -h); cx.lineTo(w, 0); cx.closePath(); cx.fill();
        cx.fillStyle = PAL.crys0;
        cx.beginPath();
        cx.moveTo(-w * 0.7, 0); cx.lineTo(0, -h); cx.lineTo(w * 0.4, 0); cx.closePath(); cx.fill();
        cx.strokeStyle = rgba(PAL.crys1, 0.9);
        cx.lineWidth = 0.8;
        cx.beginPath(); cx.moveTo(0, -h); cx.lineTo(0, 0); cx.stroke();
        cx.restore();
      }
      cx.fillStyle = rgba(PAL.crys1, 0.5);
      cx.beginPath(); cx.ellipse(0, s * 0.28, s * 0.4, s * 0.12, 0, 0, TAU); cx.fill();
    }

    drawBloom(cx, s, seed, age) {
      const r = rngOf('bloom' + seed);
      const col = PAL.blooms[r.i(PAL.blooms.length)];
      const petals = 5 + r.i(2);
      const size = s * (0.30 + Math.min(age, 3) * 0.03);
      cx.save();
      cx.rotate(r.f() * TAU);
      for (let i = 0; i < petals; i++) {
        const a = TAU * i / petals;
        cx.fillStyle = rgba(col, 0.92);
        cx.beginPath();
        cx.ellipse(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55,
          size * 0.42, size * 0.26, a, 0, TAU);
        cx.fill();
      }
      cx.fillStyle = PAL.gold;
      cx.beginPath(); cx.arc(0, 0, size * 0.22, 0, TAU); cx.fill();
      cx.fillStyle = rgba('#ffffff', 0.65);
      cx.beginPath(); cx.arc(-size * 0.07, -size * 0.07, size * 0.09, 0, TAU); cx.fill();
      cx.restore();
    }

    drawHeart(cx, s, seed, age) {
      const r = rngOf('heart' + seed);
      const rings = 5;
      for (let i = rings; i >= 1; i--) {
        const rad = s * 0.55 * i / rings;
        cx.fillStyle = i % 2 ? PAL.heart0 : PAL.heart1;
        cx.beginPath();
        cx.ellipse((r.f() - 0.5) * s * 0.04, (r.f() - 0.5) * s * 0.04, rad, rad * 0.92, 0.2, 0, TAU);
        cx.fill();
      }
      cx.fillStyle = PAL.heartGlow;
      cx.beginPath(); cx.arc(0, 0, s * 0.07, 0, TAU); cx.fill();
      const gl = cx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 1.1);
      gl.addColorStop(0, rgba(PAL.heartGlow, 0.22));
      gl.addColorStop(1, rgba(PAL.heartGlow, 0));
      cx.fillStyle = gl;
      cx.beginPath(); cx.arc(0, 0, s * 1.1, 0, TAU); cx.fill();
    }

    /* ───── per-frame fx ───── */
    frame(t) {
      if (this.dirtyFlag && !this.cinematic) this.redraw();
      const cx = this.fx;
      const W = this.fc.width / this.dpr, H = this.fc.height / this.dpr;
      cx.save();
      cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      cx.clearRect(0, 0, W, H);
      if (this.cinematic) { this._cinematicFrame(cx, t, W, H); cx.restore(); return; }
      if (!this.game) { cx.restore(); return; }

      cx.save();
      cx.translate(this.view.ox, this.view.oy); cx.scale(this.view.scale, this.view.scale); /* pan/zoom */
      const ff = this._ff = (this._ff || 0) + 1;
      this._sporeFrame(cx, t, W, H);
      if (ff % 2) this._grainTwinkle(cx, t); /* decorative; half-rate to spare the main thread */
      this._antFrame(cx, t);
      this._mycPips(cx, t);
      this._sapFrame(cx, t);
      this._blightFrame(cx, t);
      this._warnFrame(cx, t);
      this._pulseFrame(cx, t);
      this._particleFrame(cx, t);
      this._boltFrame(cx);
      this._hoverFrame(cx, t);
      if (this.valuesMode || this.game.flag('forecast')) this._valuesFrame(cx);
      cx.restore();
      if (this.flashT > 0) {
        cx.fillStyle = rgba('#e8e8e0', this.flashT * 0.22);
        cx.fillRect(0, 0, W, H);
        this.flashT = Math.max(0, this.flashT - 0.05);
      }
      cx.restore();
      /* squall shake — jolt both layers together, then settle */
      if (this.shake > 0) {
        const m = this.shake * 7;
        const ox = (Math.random() - 0.5) * m, oy = (Math.random() - 0.5) * m;
        this.bc.style.transform = `translate(${ox}px,${oy}px)`;
        this.fc.style.transform = `translate(${ox}px,${oy}px)`;
        this.shake = Math.max(0, this.shake - 0.05);
        if (this.shake <= 0) { this.bc.style.transform = ''; this.fc.style.transform = ''; }
      }
    }

    _sporeFrame(cx, t, W, H) {
      const g = this.game;
      if (this.spores.length < 36 && g) {
        const cells = [...g.cells.values()].filter(c => c.e < 0.4);
        if (cells.length) {
          const c = cells[(Math.random() * cells.length) | 0];
          const p = this.pos.get(HEX.key(c.q, c.r));
          this.spores.push({ x: p.x + (Math.random() - 0.5) * this.s, y: p.y, vx: 6 + Math.random() * 8, vy: -10 - Math.random() * 9, life: 0, max: 5 + Math.random() * 5, r: 0.7 + Math.random() * 1.1 });
        }
      }
      const dt = 1 / 60;
      for (const sp of this.spores) {
        sp.life += dt;
        sp.x += (sp.vx + Math.sin(t * 0.8 + sp.y * 0.02) * 6) * dt;
        sp.y += sp.vy * dt;
        const a = Math.sin(Math.min(1, sp.life / sp.max) * Math.PI) * 0.5;
        cx.fillStyle = rgba(PAL.dew, a);
        cx.beginPath(); cx.arc(sp.x, sp.y, sp.r, 0, TAU); cx.fill();
      }
      this.spores = this.spores.filter(sp => sp.life < sp.max);
    }

    _grainTwinkle(cx, t) {
      const g = this.game;
      const cells = [...g.cells.values()];
      for (let i = 0; i < 7; i++) {
        const c = cells[(Math.random() * cells.length) | 0];
        if (c.e < 0.45) continue;
        const p = this.pos.get(HEX.key(c.q, c.r));
        const gr = 120 + Math.random() * 70;
        cx.fillStyle = `rgba(${gr},${gr},${gr},${c.e * 0.25})`;
        cx.fillRect(p.x + (Math.random() - 0.5) * this.s, p.y + (Math.random() - 0.5) * this.s, 1.6, 1.6);
      }
    }

    _antFrame(cx, t) {
      const g = this.game;
      for (const c of g.cells.values()) {
        if (!c.pat || c.pat.t !== 'ant') continue;
        const nk = HEX.key(c.q, c.r);
        const np = this.pos.get(nk);
        const targets = (c.pat.lastTargets || []).map(k => this.pos.get(k)).filter(Boolean);
        if (!targets.length) continue;
        let ag = this.agents.get(nk);
        const want = Math.min(14, Math.max(4, Math.floor(c.pat.pop * 0.6)));
        if (!ag || ag.length !== want) {
          ag = [];
          for (let i = 0; i < want; i++) ag.push({ off: Math.random() * 2, ti: i % targets.length, sp: 0.32 + Math.random() * 0.25 });
          this.agents.set(nk, ag);
        }
        /* faint trails */
        for (const tp of targets) {
          cx.strokeStyle = rgba(PAL.gold, 0.045);
          cx.lineWidth = 3;
          cx.beginPath(); cx.moveTo(np.x, np.y); cx.lineTo(tp.x, tp.y); cx.stroke();
        }
        for (const a of ag) {
          const tp = targets[a.ti % targets.length];
          let u = (t * a.sp + a.off) % 2;
          const out = u <= 1;
          if (!out) u = 2 - u;
          const ex = U.lerp(np.x, tp.x, u), ey = U.lerp(np.y, tp.y, u);
          const dx = tp.x - np.x, dy = tp.y - np.y;
          const L = Math.hypot(dx, dy) || 1;
          const wob = Math.sin(t * 12 + a.off * 9) * 1.6;
          const x = ex + (-dy / L) * wob, y = ey + (dx / L) * wob;
          cx.fillStyle = PAL.antBody;
          cx.fillRect(x - 0.9, y - 0.9, 1.9, 1.9);
        }
      }
    }

    /* sap as luminous flow through the hyphae — bright & dense where it runs strong,
       dim and sickly where a network is starving. additive glow = bioluminescent. */
    _mycPips(cx, t) {
      const g = this.game;
      const pairs = this._linkPairs();
      if (!pairs.length) return;
      cx.save();
      cx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < pairs.length; i++) {
        const a = pairs[i][0], b = pairs[i][1], id = pairs[i][2];
        const srcK = id.slice(0, id.indexOf('>'));
        const n = g.netOf && g.netOf.get(srcK);
        const fed = n && n.fedRatio != null ? n.fedRatio : 1;
        const flow = n ? Math.min(1, (n.prod || 0) / 12) : 0.25;
        const starving = fed < 0.5;
        const col = starving ? PAL.sapStarve : PAL.sap;
        const dens = 2 + Math.round(flow * 4);
        for (let j = 0; j < dens; j++) {
          const u = (t * (0.28 + flow * 0.5) + i * 0.37 + j / dens) % 1;
          const x = U.lerp(a.x, b.x, u), y = U.lerp(a.y, b.y, u) + Math.sin(u * Math.PI) * this.s * 0.16;
          const env = Math.sin(u * Math.PI);
          const al = (0.45 + flow * 0.55) * env * (starving ? 0.6 : 1);
          const rad = (1.4 + flow * 1.8) * (0.6 + 0.4 * env);
          /* soft halo + bright core */
          cx.fillStyle = rgba(col, al * 0.4);
          cx.beginPath(); cx.arc(x, y, rad * 2.2, 0, TAU); cx.fill();
          cx.fillStyle = rgba(starving ? PAL.sapStarve : PAL.sapGlow, al);
          cx.beginPath(); cx.arc(x, y, rad, 0, TAU); cx.fill();
        }
      }
      cx.restore();
    }

    /* producing patterns breathe a soft green; starving consumers ask to be fed */
    _sapFrame(cx, t) {
      const g = this.game;
      cx.save();
      cx.globalCompositeOperation = 'lighter';
      for (const c of g.cells.values()) {
        const p = c.pat;
        if (!p || !p._s || p._s.role !== 'producer' || p._s.prod <= 0) continue;
        const pos = this.pos.get(HEX.key(c.q, c.r));
        if (!pos) continue;
        const a = 0.05 + 0.05 * Math.sin(t * 2 + U.hash32(HEX.key(c.q, c.r)) % 6);
        cx.fillStyle = rgba(PAL.sap, a);
        cx.beginPath(); cx.arc(pos.x, pos.y, this.s * 0.42, 0, TAU); cx.fill();
      }
      cx.restore();
      for (const c of g.cells.values()) {
        const p = c.pat;
        if (!p || !p._s || p._s.role !== 'consumer') continue;
        if (p.fed == null || p.fed >= 0.5) continue;
        const pos = this.pos.get(HEX.key(c.q, c.r));
        if (!pos) continue;
        const pulse = 0.5 + 0.5 * Math.sin(t * 5 + U.hash32(HEX.key(c.q, c.r)) % 5);
        /* a sickly halo + dashed ring — unmistakable "feed me" */
        const gl = cx.createRadialGradient(pos.x, pos.y, this.s * 0.1, pos.x, pos.y, this.s * 0.62);
        gl.addColorStop(0, rgba(PAL.sapStarve, 0.10 + 0.12 * pulse));
        gl.addColorStop(1, rgba(PAL.sapStarve, 0));
        cx.fillStyle = gl;
        cx.beginPath(); cx.arc(pos.x, pos.y, this.s * 0.62, 0, TAU); cx.fill();
        cx.strokeStyle = rgba(PAL.sapStarve, 0.45 + 0.3 * pulse);
        cx.lineWidth = 1.6; cx.setLineDash([4, 3]);
        cx.beginPath(); cx.arc(pos.x, pos.y, this.s * 0.5, 0, TAU); cx.stroke();
        cx.setLineDash([]);
      }
    }

    _warnFrame(cx, t) {
      /* a squall gathers: a darkening over the doomed cells, and a slow vortex at the eye */
      for (const k of this.warned) {
        const p = this.pos.get(k);
        if (!p) continue;
        const a = 0.14 + 0.08 * Math.sin(t * 2.2 + U.hash32(k) % 7);
        cx.fillStyle = rgba(PAL.storm, a);
        cx.beginPath(); cx.arc(p.x, p.y, this.s * 0.82, 0, TAU); cx.fill();
      }
      const cp = this.warnCenter && this.pos.get(this.warnCenter);
      if (cp) {
        const R = this.s * 1.5;
        for (let i = 0; i < 3; i++) {
          const a0 = t * (1.1 + i * 0.4) + i * 2.1;
          cx.strokeStyle = rgba(PAL.stormShine, 0.20 + 0.06 * i);
          cx.lineWidth = 1.4 - i * 0.3;
          cx.beginPath();
          for (let s = 0; s <= 24; s++) {
            const u = s / 24;
            const ang = a0 + u * 5.0;
            const rr = R * (1 - u * 0.72);
            const x = cp.x + Math.cos(ang) * rr, y = cp.y + Math.sin(ang) * rr;
            s ? cx.lineTo(x, y) : cx.moveTo(x, y);
          }
          cx.stroke();
        }
        /* debris drawn inward */
        if (Math.random() < 0.5) {
          const ang = Math.random() * TAU;
          this.particles.push({
            x: cp.x + Math.cos(ang) * R, y: cp.y + Math.sin(ang) * R,
            vx: -Math.cos(ang) * 22, vy: -Math.sin(ang) * 22,
            life: 0, max: 0.7, r: 0.9, a: 0.5, col: PAL.stormShine, grav: 0,
          });
        }
      }
    }

    _blightFrame(cx, t) {
      const g = this.game;
      if (g.blight) for (const [k, b] of g.blight) {
        const p = this.pos.get(k);
        if (!p) continue;
        const a = 0.10 + 0.07 * Math.sin(t * 3 + U.hash32(k) % 6);
        cx.fillStyle = rgba(b.kind === 'wisp' ? PAL.wisp : PAL.rotSpore, a);
        cx.beginPath(); cx.arc(p.x, p.y, this.s * 0.45, 0, TAU); cx.fill();
      }
      for (const k of this.blightWarned) {
        const p = this.pos.get(k);
        if (!p) continue;
        const a = 0.2 + 0.14 * Math.sin(t * 4 + U.hash32(k) % 5);
        cx.strokeStyle = rgba(PAL.rotVein, a); cx.lineWidth = 1.5;
        cx.setLineDash([3, 3]);
        cx.beginPath(); cx.arc(p.x, p.y, this.s * 0.62, 0, TAU); cx.stroke();
        cx.setLineDash([]);
      }
    }

    _boltFrame(cx) {
      const dt = 1 / 60;
      for (const b of this.bolts) {
        b.life += dt;
        const u = b.life / b.max;
        const flick = 0.5 + 0.5 * Math.sin(b.life * 80);
        cx.strokeStyle = rgba(PAL.stormBolt, (1 - u) * flick);
        cx.lineWidth = 2.2 * (1 - u);
        cx.beginPath();
        b.pts.forEach((pt, i) => i ? cx.lineTo(pt[0], pt[1]) : cx.moveTo(pt[0], pt[1]));
        cx.stroke();
        cx.strokeStyle = rgba('#ffffff', (1 - u) * flick * 0.6);
        cx.lineWidth = 0.9 * (1 - u);
        cx.stroke();
      }
      this.bolts = this.bolts.filter(b => b.life < b.max);
    }
    _mkBolt(tx, ty) {
      const sy = ty - this.s * 14; /* strike from above, in board space */
      const sx = tx + (Math.random() - 0.5) * 60;
      const pts = [[sx, sy]];
      const n = 9;
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        pts.push([U.lerp(sx, tx, u) + (Math.random() - 0.5) * 30 * (1 - u), U.lerp(sy, ty, u)]);
      }
      return { pts, life: 0, max: 0.34 };
    }

    _pulseFrame(cx, t) {
      for (const p of this.pulses) {
        p.r += p.v;
        p.a *= 0.94;
        cx.strokeStyle = rgba(p.col, Math.max(0, p.a));
        cx.lineWidth = p.w;
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, TAU); cx.stroke();
      }
      this.pulses = this.pulses.filter(p => p.a > 0.02);
    }

    _particleFrame(cx, t) {
      const dt = 1 / 60;
      for (const p of this.particles) {
        p.life += dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.grav || 0) * dt;
        const u = p.life / p.max;
        cx.fillStyle = rgba(p.col, Math.max(0, (1 - u) * p.a));
        cx.beginPath(); cx.arc(p.x, p.y, p.r * (1 - u * 0.5), 0, TAU); cx.fill();
      }
      this.particles = this.particles.filter(p => p.life < p.max);
    }

    _hoverFrame(cx, t) {
      const g = this.game;
      if (this.auraFor) {
        const [q, r] = HEX.parse(this.auraFor);
        const R = Math.round(g.mod('crysRadius', 2));
        for (const k of HEX.disk(q, r, R)) {
          const p = this.pos.get(k);
          if (!p) continue;
          cx.fillStyle = rgba(PAL.dewBlue, 0.09);
          cx.save(); cx.translate(p.x, p.y); cx.scale(this.s, this.s);
          cx.fill(this.shapes.get(k) || new Path2D());
          cx.restore();
        }
      }
      if (!this.hovered) return;
      const p = this.pos.get(this.hovered);
      if (!p) return;
      const k = this.hovered;
      let col = PAL.dew, bad = false;
      if (this.mode && this.mode.type === 'plant') {
        bad = !g.canPlant(this.mode.pt, k).ok;
        col = bad ? '#c97b6a' : PAL.mossGlow;
      } else if (this.mode && this.mode.type === 'tend') col = PAL.dewBlue;
      else if (this.mode && this.mode.type === 'art') {
        bad = this.mode.can ? !this.mode.can(k) : false;
        col = bad ? '#c97b6a' : PAL.gold;
      }
      cx.save();
      cx.translate(p.x, p.y); cx.scale(this.s, this.s);
      cx.strokeStyle = rgba(col, 0.55 + 0.2 * Math.sin(t * 4));
      cx.lineWidth = 2 / this.s;
      cx.stroke(this.shapes.get(k));
      cx.restore();
      if (this.mode && this.mode.type === 'plant' && !bad) {
        cx.save();
        cx.translate(p.x, p.y);
        cx.globalAlpha = 0.55;
        const fake = 'ghost';
        switch (this.mode.pt) {
          case 'moss': this.drawMoss(cx, this.s, 3, fake); break;
          case 'frond': this.drawFrond(cx, this.s, 4, fake); break;
          case 'ant': this.drawNest(cx, this.s, 8, fake); break;
          case 'myc': this.drawMycKnot(cx, this.s, fake); break;
          case 'crys': this.drawCrystal(cx, this.s, fake); break;
          case 'bloom': this.drawBloom(cx, this.s, fake, 2); break;
          case 'heart': this.drawHeart(cx, this.s, fake, 1); break;
        }
        cx.restore();
      }
    }

    _valuesFrame(cx) {
      const g = this.game;
      const lens = g.flag('forecast');
      cx.font = `${Math.max(8, this.s * 0.34)}px ui-monospace, monospace`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      for (const c of g.cells.values()) {
        const k = HEX.key(c.q, c.r);
        const p = this.pos.get(k);
        if (!p) continue;
        let col = c.e > 0.55 ? 'rgba(230,225,212,0.75)' : 'rgba(24,20,14,0.7)';
        if (lens) {
          const d = g.predictE(k) - c.e;
          if (d > 0.015) col = 'rgba(222,135,110,0.9)';        /* tomorrow: worse */
          else if (d < -0.015) col = 'rgba(158,210,200,0.9)';  /* tomorrow: calmer */
        }
        cx.fillStyle = col;
        cx.fillText(Math.round(c.e * 100), p.x, p.y + (c.pat ? this.s * 0.55 : 0));
      }
    }

    /* ───── event fx ───── */
    onTurnEvents(evs) {
      this.warned = [];
      this.warnCenter = null;
      this.blightWarned = [];
      for (const e of evs) {
        switch (e.t) {
          case 'storm': {
            this.flashT = 1; this.shake = 1;
            const cp = this.pos.get(e.center);
            if (cp) {
              this.pulses.push({ x: cp.x, y: cp.y, r: this.s * 0.5, v: this.s * 0.55, a: 0.95, w: 4.5, col: PAL.stormBolt });
              this.pulses.push({ x: cp.x, y: cp.y, r: this.s * 0.3, v: this.s * 0.38, a: 0.7, w: 2, col: PAL.stormShine });
              for (let i = 0; i < 3; i++) this.bolts.push(this._mkBolt(cp.x, cp.y));
            }
            for (const k of e.cells) this.burst(k, PAL.stormShine, 8, 1.7);
            break;
          }
          case 'stormWarn': this.warned = e.cells; this.warnCenter = e.center; break;
          case 'blightSpawn': this.burst(e.k, PAL.rotSpore, 8, 1.1); this.ring(e.k, PAL.rotVein, 0.7); break;
          case 'blightSpread': case 'blightMove': this.burst(e.to, PAL.rotVein, 4, 0.7); break;
          case 'blightClear': this.burst(e.k, PAL.dew, 9, 1.2); this.ring(e.k, PAL.mossGlow, 0.6); break;
          case 'blightWarn': this.blightWarned.push(e.k); break;
          case 'birth': this.burst(e.k, PAL.blooms[U.hash32(e.k) % PAL.blooms.length], 10, 1.5); this.ring(e.k, PAL.gold, 0.5); break;
          case 'spore': this.burst(e.k, PAL.fern2, 7, 1.1); this.ring(e.k, PAL.fern2, 0.4); break;
          case 'spread': this.burst(e.to, PAL.moss2, 5, 0.8); break;
          case 'pulse': {
            const p = this.pos.get(e.center);
            if (p) this.pulses.push({ x: p.x, y: p.y, r: this.s * 0.4, v: this.s * 0.16, a: 0.7, w: 2.5, col: PAL.heartGlow });
            for (const k of e.cells) this.burst(k, PAL.heartGlow, 2, 0.7);
            break;
          }
          case 'death': this.burst(e.k, PAL.greyDark, 8, 1.1); break;
          /* emergent life — draw the eye to where a flower arrives, spreads, or is cleared */
          case 'species': if (e.k) { this.burst(e.k, e.color, 12, 1.6); this.ring(e.k, e.color, 0.7); } break;
          case 'floraGrow': if (e.k) this.burst(e.k, e.color, 4, 0.7); break;
          /* megafauna: a grand burst when a beast arrives, a little puff where it grazes/breeds */
          case 'fauna': if (e.k) { this.burst(e.k, e.color, 16, 2.1); this.ring(e.k, e.color, 0.9); } break;
          case 'graze': if (e.k) this.burst(e.k, e.color, 3, 0.55); break;
          case 'faunaBreed': if (e.k) this.burst(e.k, e.color, 5, 0.8); break;
          case 'cull': if (e.k) this.burst(e.k, PAL.greyDark, 6, 0.9); break;
          case 'demon': this.ring(e.k, PAL.gold, 0.9); this.burst(e.k, PAL.gold, 6, 1); break;
          case 'hand': for (const k of e.cells) this.ring(k, PAL.dew, 0.5); break;
          case 'gaia': case 'recur': {
            this.pulses.push({ x: this.ox, y: this.oy, r: 10, v: 7, a: 0.5, w: 3, col: PAL.dewBlue });
            break;
          }
          case 'morphogen': for (const k of e.cells) if (U.hash32(k) % 3 === 0) this.burst(k, PAL.dewBlue, 2, 0.6); break;
          case 'eat': for (const k of e.targets) this.burst(k, PAL.nest1, 2, 0.5); break;
          case 'link': this.ring(e.to, PAL.mycLight, 0.35); break;
          case 'stageUp': this.expandFx(); break;
          case 'rite': {
            this.flashT = 0.8;
            this.pulses.push({ x: this.ox, y: this.oy, r: this.s, v: this.s * 0.6, a: 0.7, w: 4, col: PAL.sapGlow });
            this.pulses.push({ x: this.ox, y: this.oy, r: this.s * 0.5, v: this.s * 0.45, a: 0.5, w: 2.5, col: PAL.gold });
            break;
          }
        }
      }
      this.dirty();
    }

    burst(k, col, n, spd) {
      const p = this.pos.get(k);
      if (!p) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = (12 + Math.random() * 26) * spd;
        this.particles.push({
          x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 8,
          life: 0, max: 0.6 + Math.random() * 0.7, r: 1 + Math.random() * 1.8, a: 0.85, col, grav: 26,
        });
      }
    }
    ring(k, col, a) {
      const p = this.pos.get(k);
      if (!p) return;
      this.pulses.push({ x: p.x, y: p.y, r: this.s * 0.2, v: this.s * 0.09, a, w: 1.6, col });
    }
    expandFx() {
      this.pulses.push({ x: this.ox, y: this.oy, r: this.s * this.game.radius, v: 5, a: 0.6, w: 4, col: PAL.gold });
      this.layout();
    }

    /* ───── sigils & icons ───── */
    sigilCanvas(seed, size, rarity) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = size * 2;
      const cx = cv.getContext('2d');
      cx.scale(2, 2);
      const r = new RNG('sigil' + seed);
      const col = PAL.rare[rarity] || PAL.gold;
      const c = size / 2, rad = size * 0.38;
      cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = 1.1;
      cx.lineCap = 'round';
      /* outer circle, sometimes broken */
      const gapA = r.f() * TAU, gapW = r.chance(0.5) ? 0.5 + r.f() : 0;
      cx.beginPath(); cx.arc(c, c, rad, gapA + gapW, gapA + TAU - gapW); cx.stroke();
      /* spokes */
      const spokes = 2 + r.i(5);
      const a0 = r.f() * TAU;
      for (let i = 0; i < spokes; i++) {
        const a = a0 + TAU * i / spokes;
        const r1 = rad * (0.2 + r.f() * 0.25), r2 = rad * (0.75 + r.f() * 0.25);
        cx.beginPath();
        cx.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
        cx.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2);
        cx.stroke();
        if (r.chance(0.6)) {
          cx.beginPath();
          cx.arc(c + Math.cos(a) * (r2 + 2), c + Math.sin(a) * (r2 + 2), 1.3, 0, TAU);
          r.chance(0.5) ? cx.fill() : cx.stroke();
        }
      }
      /* inner arc or polygon */
      if (r.chance(0.6)) {
        cx.beginPath(); cx.arc(c, c, rad * (0.35 + r.f() * 0.2), r.f() * TAU, r.f() * TAU + 2 + r.f() * 3); cx.stroke();
      } else {
        const n = 3 + r.i(3), ra = rad * 0.3, aa = r.f() * TAU;
        cx.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = aa + TAU * i / n;
          i ? cx.lineTo(c + Math.cos(a) * ra, c + Math.sin(a) * ra) : cx.moveTo(c + Math.cos(a) * ra, c + Math.sin(a) * ra);
        }
        cx.stroke();
      }
      cx.beginPath(); cx.arc(c, c, 1.2, 0, TAU); cx.fill();
      return cv;
    }

    iconCanvas(pt, size) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = size * 2;
      const cx = cv.getContext('2d');
      cx.scale(2, 2);
      cx.translate(size / 2, size / 2);
      const s = size * 0.46;
      switch (pt) {
        case 'moss': this.drawMoss(cx, s, 4, 'icon'); break;
        case 'frond': cx.translate(0, size * 0.1), this.drawFrond(cx, s * 1.1, 5, 'icon'); break;
        case 'ant': this.drawNest(cx, s * 1.1, 10, 'icon'); break;
        case 'myc': this.drawMycKnot(cx, s * 1.3, 'icon'); break;
        case 'crys': cx.translate(0, size * 0.08), this.drawCrystal(cx, s * 1.15, 'icon'); break;
        case 'bloom': this.drawBloom(cx, s * 1.5, 'icon', 3); break;
        case 'heart': this.drawHeart(cx, s * 1.05, 'icon', 1); break;
        case 'tend': {
          cx.strokeStyle = PAL.dew; cx.lineWidth = 2; cx.lineCap = 'round';
          cx.beginPath(); cx.arc(0, size * 0.06, s * 0.55, Math.PI * 0.15, Math.PI * 0.85); cx.stroke();
          cx.fillStyle = PAL.dew;
          cx.beginPath(); cx.arc(0, -size * 0.12, s * 0.22, 0, TAU); cx.fill();
          cx.beginPath(); cx.moveTo(0, -size * 0.34); cx.quadraticCurveTo(s * 0.16, -size * 0.16, 0, -size * 0.05);
          cx.quadraticCurveTo(-s * 0.16, -size * 0.16, 0, -size * 0.34); cx.fill();
          break;
        }
        case 'prune': {
          cx.strokeStyle = '#c9a06a'; cx.lineWidth = 2; cx.lineCap = 'round';
          cx.beginPath(); cx.moveTo(-s * 0.5, s * 0.5); cx.lineTo(s * 0.45, -s * 0.45); cx.stroke();
          cx.beginPath(); cx.moveTo(-s * 0.5, -s * 0.45); cx.lineTo(s * 0.45, s * 0.5); cx.stroke();
          cx.beginPath(); cx.arc(-s * 0.55, s * 0.55, s * 0.18, 0, TAU); cx.stroke();
          cx.beginPath(); cx.arc(-s * 0.55, -s * 0.5, s * 0.18, 0, TAU); cx.stroke();
          break;
        }
      }
      return cv;
    }

    /* ───── the awakening ─────
       phases: drain → convergence → mandala → the eye (with the garden in its pupil) */
    awakening(game, onDone) {
      const counts = { moss: 0, frond: 0, ant: 0, myc: 0, crys: 0, bloom: 0, heart: 0 };
      for (const c of game.cells.values()) if (c.pat) counts[c.pat.t]++;
      /* snapshot the board for the pupil before we start washing it */
      this.redraw();
      const snap = document.createElement('canvas');
      snap.width = this.bc.width; snap.height = this.bc.height;
      snap.getContext('2d').drawImage(this.bc, 0, 0);
      this.cinematic = {
        t0: performance.now() / 1000, counts, snap, onDone, done: false,
        stars: [], fed: 0,
      };
    }
    skipCinematic() {
      const c = this.cinematic;
      if (c && !c.done) {
        const el = performance.now() / 1000 - c.t0;
        if (el > 2.5) { c.done = true; this.cinematic = null; c.onDone(); }
      }
    }
    _cinematicFrame(cx, t, W, H) {
      const c = this.cinematic;
      const el = performance.now() / 1000 - c.t0;
      const g = this.game;
      const cxm = W / 2, cym = H / 2;
      const boardR = this.s * (g.radius + 1.2) * 1.8;

      /* 1. wash of order: redraw board with entropy visually draining (ring wave) */
      const drain = U.clamp(el / 4.5, 0, 1);
      this.bx.save();
      this.bx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.bx.fillStyle = PAL.page;
      this.bx.fillRect(0, 0, W, H);
      for (const cell of g.cells.values()) {
        const k = HEX.key(cell.q, cell.r);
        const d = HEX.dist(cell.q, cell.r) / (g.radius + 0.001);
        const w = U.clamp((drain * 1.4 - d) * 3, 0, 1);
        const eVis = cell.e * (1 - w);
        const fake = { q: cell.q, r: cell.r, e: eVis, pat: cell.pat };
        this._drawCellBase(this.bx, fake);
        if (eVis > 0.1) this._drawCellGrain(this.bx, fake);
        /* dawn breaks over the washed cells */
        if (w > 0.01) {
          const p = this.pos.get(k);
          this.bx.save();
          this.bx.translate(p.x, p.y); this.bx.scale(this.s, this.s);
          this.bx.fillStyle = rgba(PAL.dew, w * 0.20);
          this.bx.fill(this.shapes.get(k));
          this.bx.restore();
        }
      }
      this._drawLinks(this.bx);
      for (const cell of g.cells.values()) if (cell.pat) this._drawPattern(this.bx, cell);
      this.bx.restore();

      /* 2. convergence: every pattern offers itself to the center */
      if (el > 2 && el < 9 && Math.random() < 0.9) {
        const pats = [...g.cells.values()].filter(cc => cc.pat);
        for (let i = 0; i < 3; i++) {
          const cell = pats[(Math.random() * pats.length) | 0];
          if (!cell) break;
          const p = this.pos.get(HEX.key(cell.q, cell.r));
          const colMap = { moss: PAL.moss2, frond: PAL.fern2, ant: PAL.nest1, myc: PAL.mycLight, crys: PAL.crys0, bloom: PAL.blooms[i % PAL.blooms.length], heart: PAL.heartGlow };
          c.stars.push({ x: p.x, y: p.y, u: 0, sp: 0.25 + Math.random() * 0.3, swirl: (Math.random() - 0.5) * 2.2, col: colMap[cell.pat.t], r: 1 + Math.random() * 1.6 });
        }
      }
      for (const st of c.stars) {
        st.u = Math.min(1, st.u + st.sp / 60);
        const ang = Math.atan2(st.y - cym, st.x - cxm) + st.swirl * st.u * (1 - st.u) * 2;
        const dist = Math.hypot(st.x - cxm, st.y - cym) * (1 - U.clamp((st.u - 0.04), 0, 1));
        const x = cxm + Math.cos(ang) * dist, y = cym + Math.sin(ang) * dist;
        cx.fillStyle = rgba(st.col, 0.8 * (1 - st.u * 0.4));
        cx.beginPath(); cx.arc(x, y, st.r, 0, TAU); cx.fill();
        if (st.u >= 1) c.fed++;
      }
      c.stars = c.stars.filter(st => st.u < 1);

      /* center glow grows with feeding */
      const glow = Math.min(1, el / 8);
      const gl = cx.createRadialGradient(cxm, cym, 2, cxm, cym, boardR * 0.55);
      gl.addColorStop(0, rgba(PAL.dew, 0.42 * glow));
      gl.addColorStop(0.5, rgba(PAL.dew, 0.14 * glow));
      gl.addColorStop(1, rgba(PAL.dew, 0));
      cx.fillStyle = gl;
      cx.fillRect(0, 0, W, H);

      /* 3. mandala assembles from what the garden was */
      if (el > 5) {
        const mp = U.clamp((el - 5) / 4, 0, 1);
        const MR = boardR * 0.30 * (0.6 + 0.4 * mp);
        cx.save();
        cx.translate(cxm, cym);
        cx.globalAlpha = mp;
        /* moss ring: dots */
        const mossN = Math.min(48, 10 + c.counts.moss);
        for (let i = 0; i < mossN; i++) {
          const a = TAU * i / mossN + t * 0.05;
          cx.fillStyle = rgba(PAL.moss2, 0.95);
          cx.beginPath(); cx.arc(Math.cos(a) * MR, Math.sin(a) * MR, 3.2, 0, TAU); cx.fill();
        }
        /* frond arcs */
        const fN = Math.min(12, 3 + c.counts.frond);
        cx.strokeStyle = rgba(PAL.fern2, 0.8); cx.lineWidth = 1.4;
        for (let i = 0; i < fN; i++) {
          const a = TAU * i / fN - t * 0.04;
          cx.beginPath();
          cx.arc(0, 0, MR * 0.82, a, a + TAU / fN * 0.55);
          cx.stroke();
        }
        /* ant orbiters */
        const aN = Math.min(18, c.counts.ant * 6);
        for (let i = 0; i < aN; i++) {
          const a = TAU * i / aN + t * 0.55;
          cx.fillStyle = rgba(PAL.nest1, 0.9);
          cx.beginPath(); cx.arc(Math.cos(a) * MR * 0.68, Math.sin(a) * MR * 0.68, 1.4, 0, TAU); cx.fill();
        }
        /* myc web */
        const wN = Math.min(9, 3 + c.counts.myc);
        cx.strokeStyle = rgba(PAL.mycLight, 0.5); cx.lineWidth = 0.8;
        for (let i = 0; i < wN; i++) {
          for (let j = i + 1; j < wN; j++) {
            const a1 = TAU * i / wN + t * 0.03, a2 = TAU * j / wN + t * 0.03;
            cx.beginPath();
            cx.moveTo(Math.cos(a1) * MR * 0.55, Math.sin(a1) * MR * 0.55);
            cx.lineTo(Math.cos(a2) * MR * 0.55, Math.sin(a2) * MR * 0.55);
            cx.stroke();
          }
        }
        /* crystal facets */
        for (let i = 0; i < Math.min(8, c.counts.crys); i++) {
          const a = TAU * i / Math.min(8, Math.max(1, c.counts.crys)) - t * 0.06;
          cx.strokeStyle = rgba(PAL.crys1, 0.85);
          cx.beginPath();
          cx.moveTo(Math.cos(a) * MR * 1.06, Math.sin(a) * MR * 1.06);
          cx.lineTo(Math.cos(a + 0.18) * MR * 1.18, Math.sin(a + 0.18) * MR * 1.18);
          cx.lineTo(Math.cos(a + 0.36) * MR * 1.06, Math.sin(a + 0.36) * MR * 1.06);
          cx.stroke();
        }
        /* petal ring */
        const pN = Math.min(16, 4 + Math.floor(c.counts.bloom / 2));
        for (let i = 0; i < pN; i++) {
          const a = TAU * i / pN + t * 0.08;
          cx.fillStyle = rgba(PAL.blooms[i % PAL.blooms.length], 0.75);
          cx.beginPath();
          cx.ellipse(Math.cos(a) * MR * 1.32, Math.sin(a) * MR * 1.32, 4.5, 2.4, a, 0, TAU);
          cx.fill();
        }
        cx.restore();
      }

      /* 4. the eye opens; the garden rests in its pupil */
      if (el > 8.5) {
        const eo = U.clamp((el - 8.5) / 3.2, 0, 1);
        const ease = eo * eo * (3 - 2 * eo);
        const ER = boardR * 0.38;
        cx.save();
        cx.translate(cxm, cym);
        /* iris */
        const iris = cx.createRadialGradient(0, 0, ER * 0.12, 0, 0, ER * 0.5);
        iris.addColorStop(0, '#1a1410');
        iris.addColorStop(0.45, mix(PAL.moss0, PAL.dewDeep, 0.4));
        iris.addColorStop(1, PAL.loam1);
        cx.fillStyle = iris;
        cx.beginPath();
        cx.ellipse(0, 0, ER * 0.5, ER * 0.5 * ease, 0, 0, TAU);
        cx.fill();
        /* iris striations */
        cx.save();
        cx.clip();
        cx.globalAlpha = 0.8 * ease;
        for (let i = 0; i < 26; i++) {
          const a = TAU * i / 26 + t * 0.01;
          cx.strokeStyle = i % 2 ? rgba(PAL.moss2, 0.5) : rgba(PAL.dewBlue, 0.4);
          cx.lineWidth = 1;
          cx.beginPath();
          cx.moveTo(Math.cos(a) * ER * 0.16, Math.sin(a) * ER * 0.16 * ease);
          cx.lineTo(Math.cos(a) * ER * 0.48, Math.sin(a) * ER * 0.48 * ease);
          cx.stroke();
        }
        cx.restore();
        /* pupil: the garden itself, looking back */
        if (ease > 0.25) {
          const PR = ER * 0.21 * Math.min(1, ease * 1.4);
          cx.save();
          cx.beginPath();
          cx.ellipse(0, 0, PR, PR * ease, 0, 0, TAU);
          cx.clip();
          cx.fillStyle = '#0a0806';
          cx.fillRect(-PR, -PR, PR * 2, PR * 2);
          cx.globalAlpha = 0.85;
          const sw = c.snap.width / this.dpr, sh = c.snap.height / this.dpr;
          const sc = (PR * 2.6) / Math.min(sw, sh);
          cx.drawImage(c.snap, -sw * sc / 2, -sh * sc / 2, sw * sc, sh * sc);
          cx.restore();
          /* catchlight */
          cx.fillStyle = rgba('#ffffff', 0.7 * ease);
          cx.beginPath(); cx.arc(-PR * 0.4, -PR * 0.45 * ease, PR * 0.16, 0, TAU); cx.fill();
        }
        /* lids */
        cx.strokeStyle = rgba(PAL.heartGlow, 0.8);
        cx.lineWidth = 1.6;
        cx.beginPath();
        cx.ellipse(0, 0, ER * 0.52, ER * 0.52 * ease, 0, 0, TAU);
        cx.stroke();
        cx.restore();
      }

      if (el > 13 && !c.hinted) {
        c.hinted = true;
      }
      if (el > 13) {
        cx.fillStyle = rgba(PAL.text, 0.45 + 0.2 * Math.sin(t * 2));
        cx.font = '13px Georgia, serif';
        cx.textAlign = 'center';
        cx.fillText('( linger, or touch the garden to continue )', cxm, H - 28);
      }
    }
  }

  LP.Renderer = Renderer;
})();
