;(function (root) {
  'use strict';
  const B = root.B = root.B || {};
  const R = B.Render = B.Render || {};
  const D = R.Dash = {};

  function cellFill(idx) { return idx === B.EMPTY ? '#0c0e12' : B.PAL[idx]; }
  function fitWord(f) { return f < 0.4 ? 'fumbling' : f < 0.6 ? 'learning the maze' : f < 0.78 ? 'specialising' : f < 0.92 ? 'a matched pair' : 'native'; }
  D.fitWord = fitWord;

  // the colony's consensus decoder — per cell, the value most bees read (the population's "key")
  D.consensusDecoder = function (sim) {
    const N = B.N, out = new Int8Array(N * N);
    let bees = [];
    for (let c = 0; c < sim.colonies.length; c++) bees = bees.concat(sim.colonies[c].bees);
    if (!bees.length) return out;
    for (let i = 0; i < N * N; i++) {
      const tally = new Int32Array(9);
      for (let b = 0; b < bees.length; b++) tally[bees[b].key.decoder[i]]++;
      let best = 0, bv = -1; for (let k = 0; k < 9; k++) if (tally[k] > bv) { bv = tally[k]; best = k; }
      out[i] = best;
    }
    return out;
  };

  // the flower the colony reads best — the pair that's merging
  D.representativeFlower = function (sim, consensus) {
    const fs = sim.allFlowers(); if (!fs.length) return null;
    let best = fs[0], bm = -1;
    for (let i = 0; i < fs.length; i++) { const m = B.match(consensus, fs[i].grid); if (m > bm) { bm = m; best = fs[i]; } }
    return best;
  };

  function gridSVG(grid, px, label) {
    const N = B.N; let s = '';
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
      s += `<rect x="${j * px}" y="${i * px}" width="${px}" height="${px}" fill="${cellFill(grid[i * N + j])}" stroke="rgba(0,0,0,.28)" stroke-width="0.5"/>`;
    const sz = N * px;
    return `<div class="gridwrap"><svg viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}">${s}</svg><div class="gl">${label}</div></div>`;
  }

  // The headline: the flower's maze and the colony's key, side by side, with the live fit. When the player
  // has a flower selected/locked, it becomes the headline so they watch THEIR intervention play out.
  D.lockKey = function (sim, focus) {
    const consensus = D.consensusDecoder(sim);
    const fl = (focus && focus.kind === 'flower') ? focus.ref : D.representativeFlower(sim, consensus);
    const grid = fl ? fl.grid : new Int8Array(B.N * B.N);
    const thisFit = fl ? B.match(consensus, grid) : sim.meanFit();
    const label = (focus && focus.kind === 'flower') ? (fl.locked ? 'this flower &middot; <b style="color:#ffd9a0">locked</b>' : 'this flower&rsquo;s maze') : 'the flower&rsquo;s maze';
    const px = 22;
    return `<div class="lk">
      <div class="lkrow">
        ${gridSVG(grid, px, label)}
        <div class="lkar">⇄</div>
        ${gridSVG(consensus, px, 'the colony&rsquo;s key')}
      </div>
      <div class="gauge"><div class="gfill" style="width:${(thisFit * 100).toFixed(0)}%"></div></div>
      <div class="gcap">fit · <b>${(thisFit * 100).toFixed(0)}%</b> · <span>${fitWord(thisFit)}</span></div>
    </div>`;
  };

  // a sparkline polyline from a history array of points → values via getter
  function spark(history, get, color, w, h) {
    if (!history.length) return '';
    let max = 1e-6, min = 1e9;
    for (let i = 0; i < history.length; i++) { const v = get(history[i]); if (v > max) max = v; if (v < min) min = v; }
    if (max - min < 1e-6) { max = min + 1; }
    const n = history.length, pts = [];
    for (let i = 0; i < n; i++) { const v = get(history[i]); pts.push(`${(i / Math.max(1, n - 1) * w).toFixed(1)},${(h - (v - min) / (max - min) * h).toFixed(1)}`); }
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
  }

  D.graphs = function (sim, history) {
    const w = 220, h = 40;
    const fitG = spark(history, p => p.fit, '#f0b870', w, h);
    const gmG = spark(history, p => p.gridMatch, '#9fd98f', w, h);
    const beeG = spark(history, p => p.bees, '#6fb0f0', w, h);
    const plG = spark(history, p => p.plants, '#9fd98f', w, h);
    const necG = spark(history, p => p.nectar, '#ebb446', w, h);
    const polG = spark(history, p => p.pollen, '#e8e0c8', w, h);
    function panel(title, body) { return `<div class="gph"><div class="gpt">${title}</div><svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${body}</svg></div>`; }
    return panel('lock-and-key fit · grid match', fitG + gmG) +
      panel('population · foragers / plants', beeG + plG) +
      panel('stores · nectar / pollen', necG + polG);
  };

  // The forms this garden passed through — a live filmstrip of its own evolution (lineage / codex of wonders).
  D.forms = function (forms) {
    if (!forms || !forms.length) return '<div class="empty">the shapes this garden passes through will gather here as it evolves.</div>';
    let s = '<div class="forms">';
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i], N = B.N, px = 7; let cells = '';
      for (let a = 0; a < N; a++) for (let b = 0; b < N; b++)
        cells += `<rect x="${b * px}" y="${a * px}" width="${px}" height="${px}" fill="${cellFill(f.grid[a * N + b])}"/>`;
      const now = (i === forms.length - 1);
      s += `<div class="formcell${now ? ' now' : ''}"><svg width="${N * px}" height="${N * px}">${cells}</svg><div class="fl">g${f.gen}</div></div>`;
      if (!now) s += '<div class="formarrow">›</div>';
    }
    return s + '</div>';
  };

  // Inspect-a-creature: the living machine — its recipe + grid/key + why it looks this way.
  D.inspect = function (sim, sel) {
    if (!sel) return '';
    const N = B.N, px = 16;
    if (sel.kind === 'flower') {
      const fl = sel.ref, g = fl.genome;
      const hue = (g.beaconHue * 360) | 0;
      const hon = fl.honesty == null ? 1 : fl.honesty;
      const honWord = hon > 0.8 ? '<b style="color:#9fd98f">honest</b>' : hon > 0.55 ? 'part-honest' : '<b style="color:#e08ac0">a deceiver</b> — advertises loud, pays little';
      const laceWord = (fl.lace || 0) > 0.45 ? ' · <b style="color:#e0604c">laced</b> (safe only if you read it well)' : '';
      // find its plant → the sugar-to-grow-a-niche meter + how much light it stands in
      let plant = null; for (let i = 0; i < sim.plants.length; i++) if (sim.plants[i].flowers.indexOf(fl) >= 0) { plant = sim.plants[i]; break; }
      let sugarRow = '';
      if (plant) {
        const cost = B.NICHE_COST || 8, pct = Math.min(100, plant.sugar / cost * 100);
        const light = sim.field.lightAt(plant.x, plant.y), lb = sim.field.lightBase || 0.72;
        const lw = light > lb + 0.15 ? '<b style="color:#ffd9a0">full sun</b>' : light < lb - 0.15 ? '<b style="color:#8fb0d8">shade</b>' : 'even light';
        const ready = plant.sugar >= cost;
        sugarRow = `<div class="idim" style="margin-top:2px">sugar to grow a niche
            <span class="sbar"><span class="sfill" style="width:${pct.toFixed(0)}%"></span></span>
            ${plant.sugar.toFixed(1)} / ${cost} · ${lw}</div>
          <div class="idim">${ready ? '<b style="color:#9fd98f">✓ ready — use the 🌿 tool here to grow a new niche</b>' : 'banking sugar from light — <b style="color:#ffd9a0">more sun</b> fills it faster (☀ tool)'}</div>`;
      }
      return `<div class="insp">
        <div class="ihead">a flower <span>· niche ${(fl.niche || 0) + 1} · ${fl.locked ? 'LOCKED' : 'drifting'}</span></div>
        <div class="irow">${gridSVG(fl.grid, px, 'its decode-grid (the maze)')}
          <div class="ibody">
            <div class=" recipe">eats <b>sugar</b> → packages <b style="color:#f0b870">nectar</b> + <b style="color:#e8e0c8">pollen</b></div>
            <div class="idim">beacon hue ${hue}° · ${g.symmetry} petals · nectar ${fl.nectar.toFixed(1)} · pollen ${fl.pollen.toFixed(1)}</div>
            <div class="idim">signal: ${honWord}${laceWord}</div>
            ${sugarRow}
          </div></div>
        <div class="iact"><button data-act="lock">${fl.locked ? 'release this flower' : 'lock this flower (make the bees chase it)'}</button></div>
      </div>`;
    }
    const b = sel.ref, k = b.key, hue = (k.preference * 360) | 0;
    const eff = (b.lastEff || 0);
    return `<div class="insp">
      <div class="ihead">a forager <span>· age ${b.age} · ${b.mode === 'home' ? 'heading home' : 'searching'}</span></div>
      <div class="irow">${gridSVG(k.decoder, px, 'its key (decoder)')}
        <div class="ibody">
          <div class="recipe">reads a flower → carries <b style="color:#f0b870">nectar</b> + <b style="color:#e8e0c8">pollen</b> + pollinates</div>
          <div class="idim">prefers hue ${hue}° · last read ${(eff * 100).toFixed(0)}% · ${b.trips} trips home</div>
          <div class="iwhy">its body reads ${eff > 0.7 ? 'like a native of' : eff > 0.4 ? 'passably' : 'badly'} the flower it visits. its offspring will read a little more like the flowers that fed it — that is the merge.</div>
        </div></div>
    </div>`;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof globalThis !== 'undefined' ? globalThis : this);
