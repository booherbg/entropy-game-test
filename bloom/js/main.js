;(function () {
  'use strict';
  const B = globalThis.B;
  const S = 8;                              // render scale (world 96×64 → 768×512, CSS-scaled crisp)
  const SPEEDS = [{ n: 1, l: '▷ 1×' }, { n: 3, l: '▷▷ 3×' }, { n: 8, l: '▷▷▷ 8×' }];
  const $ = function (id) { return document.getElementById(id); };

  const G = {
    sim: null, seed: 1, paused: false, speedIdx: 0, tool: 'inspect',
    selected: null, history: [], miles: new Set(), tick0: 0, dashClock: 0, saveClock: 0,
    lastFit: 0, seasonFit: 0, forms: [], lastFormGen: -1, lightMode: 'sun', hedgeMode: 'build', painting: false, effects: [],
    imprint: null,
  };
  const PAINT_TOOLS = { light: 1, hedge: 1 };

  // ── milestone table: fit-thresholds + time, each unlocking a codex toast and/or a murmur ──
  const MILES = [
    { key: 'firstForage', test: () => anyTripped(), codex: 'firstForage' },
    { key: 'firstMatch', test: () => G.lastFit >= 0.40, codex: 'firstMatch', murmur: 'firstMatch' },
    { key: 'specialising', test: () => G.lastFit >= 0.55, murmur: 'specialising' },
    { key: 'tangledBank', test: () => G.lastFit >= 0.66, murmur: 'tangledBank' },
    { key: 'matchedPair', test: () => G.lastFit >= 0.78, codex: 'matchedPair', murmur: 'matchedPair' },
    { key: 'deception', test: () => minHonesty() < 0.42 && G.miles.has('firstMatch'), codex: 'deception', murmur: 'deception' },
    { key: 'native', test: () => G.lastFit >= 0.92, codex: 'native', murmur: 'native' },
    { key: 'niche', test: () => totalNiches() > G.sim.plants.length, codex: 'niche', murmur: 'niche' },
    { key: 'colony', test: () => colonyPop() >= 44, murmur: 'colony' },
    { key: 'tended', test: () => gen() >= 20, murmur: 'tended' },
    { key: 'deep', test: () => gen() >= 55, murmur: 'deep' },
    { key: 'imprint', test: () => G.miles.has('native') && gen() >= 30, murmur: 'imprint' },
  ];

  function gen() { return Math.floor((G.sim.tickCount - G.tick0) / 120); }
  function colonyPop() { let n = 0; for (const c of G.sim.colonies) n += c.bees.length; return n; }
  function totalNiches() { let n = 0; for (const p of G.sim.plants) n += p.niches; return n; }
  function anyTripped() { for (const c of G.sim.colonies) for (const b of c.bees) if (b.trips > 0) return true; return false; }
  function minHonesty() { let m = 1; for (const f of G.sim.allFlowers()) { const h = f.honesty == null ? 1 : f.honesty; if (h < m) m = h; } return m; }
  // snapshot the garden's representative glyph every dozen generations — its evolutionary filmstrip
  function snapshotForm() {
    const g = gen();
    if (g < G.lastFormGen + 12 || !G.sim.allFlowers().length) return;
    G.lastFormGen = g;
    const con = B.Render.Dash.consensusDecoder(G.sim);
    const fl = B.Render.Dash.representativeFlower(G.sim, con);
    if (fl) { G.forms.push({ gen: g, grid: Array.from(fl.grid), fit: G.lastFit }); if (G.forms.length > 9) G.forms.shift(); }
  }

  // ── boot ──
  function init() {
    const hashSeed = B.Persist.seedFromHash();
    const saved = (!hashSeed) ? B.Persist.load() : null;
    if (saved) { G.sim = saved.sim; G.seed = G.sim.seed; G.miles = new Set(saved.meta.miles || []); G.tick0 = saved.meta.tick0 || 0; G.forms = saved.meta.forms || []; }
    else { G.seed = hashSeed || ((Math.random() * 1e9) >>> 0); newGarden(G.seed, true); }
    G.miles.add('begin');
    // ?warp=N — fast-forward the sim at boot (a skip-ahead / demo hook; also drives headless screenshots)
    const wm = (location.search || '').match(/warp=(\d+)/);
    if (wm) { const n = Math.min(20000, parseInt(wm[1], 10)); for (let i = 0; i < n; i++) { G.sim.tick(); if ((G.sim.tickCount % 30) === 0) { recordHistory(); G.lastFit = G.sim.meanFit(); snapshotForm(); } } }
    B.Persist.setHashSeed(G.seed);
    wireUI();
    sizeCanvas();
    requestAnimationFrame(loop);
    // first-run intro (skippable with ?play for deep-links / screenshots)
    if (!saved && !/\bplay\b/.test(location.search)) setTimeout(() => $('menuOv').classList.add('show'), 400);
    if (/\bmurmurs\b/.test(location.search)) setTimeout(() => { renderMurmurs(); $('murmursOv').classList.add('show'); }, 200);
    renderMurmurs(); renderDash(true); updateSeedline();
  }

  function newGarden(seed, keepHash) {
    G.sim = B.makeSim(seed); G.sim.warmStart();
    G.seed = seed; G.history = []; G.miles = new Set(['begin']); G.selected = null; G.tick0 = 0; G.forms = []; G.lastFormGen = -1; G.effects = []; G.seasonFit = 0; G.imprint = null;
    if (!keepHash) B.Persist.setHashSeed(seed);
    B.Persist.clear();
    updateSeedline();
  }

  // ── the loop: the world breathes; pause to make weighed moves ──
  function loop() {
    if (!G.paused) {
      const n = SPEEDS[G.speedIdx].n;
      for (let i = 0; i < n; i++) {
        G.sim.tick();
        for (let e = 0; e < G.sim.events.length; e++) {
          const ev = G.sim.events[e];
          if (ev.t === 'read') G.effects.push({ t: 'read', x0: ev.x0, y0: ev.y0, x1: ev.x1, y1: ev.y1, hue: ev.hue, eff: ev.eff, age: 0 });
          else G.effects.push({ x: ev.x, y: ev.y, t: ev.t, age: 0 });
        }
        if ((G.sim.tickCount % 30) === 0) recordHistory();
      }
      if (G.effects.length > 80) G.effects.splice(0, G.effects.length - 80);
    }
    // age + retire the sprout/wilt effects (every frame, even paused, so they fade rather than freeze)
    for (let e = 0; e < G.effects.length; e++) G.effects[e].age++;
    if (G.effects.length) G.effects = G.effects.filter(ef => ef.age < 46);
    // age + retire the imprint overlay the same way (long-lived — long enough to read a full line)
    if (G.imprint) { G.imprint.age++; if (G.imprint.age > 260) G.imprint = null; }
    renderImprint();
    G.lastFit = G.sim.meanFit();
    // the world's WARMTH follows a slowly-decaying high-water mark, so a native garden stays golden through the
    // Red Queen wobble (it reads as alive, not backsliding). The gauge still shows the true live fit.
    G.seasonFit = Math.max(G.lastFit, G.seasonFit * 0.9997);
    snapshotForm();
    renderWorld();
    updateGauge();
    checkMilestones();
    if (++G.dashClock >= 14) { G.dashClock = 0; renderDash(); }
    if (++G.saveClock >= 220) { G.saveClock = 0; autosave(); }
    requestAnimationFrame(loop);
  }

  function recordHistory() {
    G.history.push({ fit: G.sim.meanFit(), gridMatch: G.sim.meanGridMatch(), bees: colonyPop(),
      plants: G.sim.plants.length, nectar: totColony('nectar'), pollen: totColony('pollen') });
    if (G.history.length > 240) G.history.shift();
  }
  function totColony(k) { let s = 0; for (const c of G.sim.colonies) s += c[k]; return s; }

  // ── render ──
  function renderWorld() { B.Render.world($('world'), G.sim, S, { fit: G.seasonFit, effects: G.effects }); }
  function updateGauge() {
    const f = G.lastFit;
    $('hgfill').style.width = (f * 100).toFixed(0) + '%';
    $('hgcap').innerHTML = 'lock-and-key fit · <b>' + (f * 100).toFixed(0) + '%</b> · <span>' + B.Render.Dash.fitWord(f) + '</span>';
    $('gen').textContent = 'gen ' + gen();
  }
  function renderImprint() {
    const el = $('imprint');
    if (!el) return;
    if (!G.imprint) { el.style.opacity = '0'; return; }
    const k = G.imprint.age / 260;
    const fade = k < 0.08 ? k / 0.08 : k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
    el.innerHTML = G.imprint.text + (G.imprint.who ? ' <span class="iw">— ' + G.imprint.who + '</span>' : '');
    el.style.opacity = (fade * 0.82).toFixed(2);
  }
  function renderDash(force) {
    const lk = B.Render.Dash.lockKey(G.sim, G.selected);
    $('lockkey').innerHTML = lk;
    if ($('lockkeyMobile')) $('lockkeyMobile').innerHTML = lk;
    $('graphs').innerHTML = B.Render.Dash.graphs(G.sim, G.history);
    if ($('forms')) $('forms').innerHTML = B.Render.Dash.forms(G.forms);
    if (G.selected) {
      // refresh the inspected ref still exists
      $('inspect').innerHTML = B.Render.Dash.inspect(G.sim, G.selected);
      const lb = $('inspect').querySelector('[data-act=lock]');
      if (lb) lb.onclick = function () { G.sim.lockFlower(G.selected.ref, !G.selected.ref.locked); toast((G.selected.ref.locked ? 'locked — ' : 'released — ') + (G.selected.ref.locked ? 'the bees must chase this pattern now.' : 'it can drift again.')); renderDash(); };
    } else if (force) {
      $('inspect').innerHTML = '<div class="empty">tap a flower or a forager in the garden to read it.</div>';
    }
  }

  // ── milestones → toasts + murmurs ──
  function checkMilestones() {
    for (const m of MILES) {
      if (G.miles.has(m.key)) continue;
      if (m.test()) {
        G.miles.add(m.key);
        if (m.codex && B.Content.codex[m.codex]) { const c = B.Content.codex[m.codex]; toast('<b>✦ ' + c.title + '</b> — ' + c.body); }
        else if (m.murmur) showImprint(m.murmur);
        renderMurmurs();
        // point at the second act: a finished merge is the START of the next loop (grow a niche)
        if (m.key === 'native' && !G.miles.has('niche')) {
          const nb = document.querySelector('.tool[data-tool=niche]'); if (nb) nb.classList.add('pulse');
          setTimeout(() => showHint('they read the garden like natives now. <b style="color:#ffd9a0">grow a niche</b> — a new flower, a new lock — and watch a fresh specialist appear.'), 1600);
        }
        if (m.key === 'niche') { const nb = document.querySelector('.tool[data-tool=niche]'); if (nb) nb.classList.remove('pulse'); }
      }
    }
  }

  // round-3: the murmur drifts into the world live, instead of a toast telling you to go read it later.
  function showImprint(key) {
    const m = B.Content.murmurs.find(function (x) { return x.key === key; });
    if (!m) return;
    G.imprint = { text: m.text, who: m.who, age: 0 };
    // best-effort tie-in to a light filament already in flight (Task 1) — not guaranteed, and that's fine.
    for (let e = 0; e < G.effects.length; e++) { const ef = G.effects[e]; if (ef.t === 'read' && ef.age < 10) ef.boost = 1.6; }
  }

  let toastT = null;
  function toast(html) {
    const el = $('toast'); el.innerHTML = html; el.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(() => { el.style.opacity = '0'; }, 5200);
  }

  function renderMurmurs() {
    // the living murmur — this garden, in the arranger's own words, read fresh from its real state
    let html = '<div class="murmur ai" style="margin-bottom:6px"><div class="mi">✦ now</div>' +
      '<div class="mt">' + B.Content.livingMurmur(G.sim, gen()) + '</div></div>';
    let idx = 0;
    for (const m of B.Content.murmurs) {
      idx++;
      const unlocked = G.miles.has(m.key);
      const roman = toRoman(idx);
      if (unlocked) {
        html += '<div class="murmur' + (m.ai ? ' ai' : '') + '"><div class="mi">' + roman + '</div>' +
          '<div class="mt">' + m.text + '</div><div class="mw">— ' + m.who + (m.year ? ' (' + (m.year < 0 ? (-m.year + ' bce') : m.year) + ')' : '') + '</div></div>';
      } else {
        html += '<div class="murmur locked"><div class="mi">' + roman + '</div><div class="mt">still in the soil. it surfaces as you play.</div></div>';
      }
    }
    $('murmursList').innerHTML = html;
  }
  function toRoman(n) { return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n - 1] || ('' + n); }

  // ── interaction ──
  function onWorldTap(clientX, clientY) {
    if (PAINT_TOOLS[G.tool]) return; // brush tools (light, hedge) paint via pointer drag, not click
    const c = B.Render.pickCell($('world'), clientX, clientY);
    if (G.tool === 'plant') { G.sim.plantAt(c.x, c.y); toast('a flower planted — give it light and it will bloom.'); return; }
    if (G.tool === 'colony') { G.sim.placeColony(c.x, c.y); toast('a colony placed — its foragers will fan out, fumbling at first.'); return; }
    if (G.tool === 'niche') {
      let best = null, bd = 1e9; for (const p of G.sim.plants) { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; best = p; } }
      if (best && G.sim.growNicheOn(best)) toast('a new niche — a flower of a different colour, a new lock awaiting a key.');
      else toast('that tree needs more sugar to grow a niche. give it more sun (☀) or thin its neighbours (✂).');
      return;
    }
    if (G.tool === 'cull') {
      const culled = G.sim.cullAt(c.x, c.y);
      if (culled) { if (G.selected && G.selected.ref === culled.ref) { G.selected = null; setWatched(null); }
        toast(culled.kind === 'plant' ? 'pulled — its neighbours now stand in more light.' : 'a colony removed.'); renderDash(); }
      else toast('nothing here to cull — tap a plant or a colony.');
      return;
    }
    if (G.tool === 'lock') { const fl = B.Render.pickFlower(G.sim, c.x, c.y); if (fl) { G.sim.lockFlower(fl, !fl.locked); G.selected = { kind: 'flower', ref: fl }; setWatched(fl); toast(fl.locked ? 'locked — the bees must chase this pattern now.' : 'released — it can drift again.'); renderDash(); } return; }
    // inspect
    const fl = B.Render.pickFlower(G.sim, c.x, c.y);
    const bee = fl ? null : B.Render.pickBee(G.sim, c.x, c.y);
    if (fl) G.selected = { kind: 'flower', ref: fl };
    else if (bee) G.selected = { kind: 'bee', ref: bee };
    else G.selected = null;
    setWatched(fl || null);
    renderDash();
  }

  // the observer is part of the system: the watched flower draws a gentle extra pull from foragers
  function setWatched(flower) {
    const fs = G.sim.allFlowers();
    for (let i = 0; i < fs.length; i++) fs[i].watched = (fs[i] === flower);
  }

  function setTool(t) {
    if (t === 'light' && G.tool === 'light') { G.lightMode = G.lightMode === 'sun' ? 'shade' : 'sun'; }
    if (t === 'hedge' && G.tool === 'hedge') { G.hedgeMode = G.hedgeMode === 'build' ? 'clear' : 'build'; }
    G.tool = t;
    updateLightIcon(); updateHedgeIcon();
    document.querySelectorAll('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
    const hints = { inspect: 'tap a flower or forager to read it — its pattern is its genome made visible.',
      lock: 'tap a flower to freeze its pattern — the bees must then chase it.',
      plant: 'tap to plant a flower.', colony: 'tap to place a colony of foragers (near flowers, or it starves).',
      niche: 'tap near a tree to spend its sugar on a new niche — a new lock to be matched.',
      light: 'drag to paint ' + (G.lightMode === 'sun' ? '<b style="color:#ffd9a0">sunlight</b>' : '<b style="color:#8fb0d8">shade</b>') + ' — design the land. tap the ☀ tool again to switch sun ⇄ shade.',
      cull: 'tap a plant to pull it — thinning a crowded patch floods the survivors with light. or cull a stray colony.',
      hedge: 'drag to draw a <b style="color:#cfc9bd">hedgerow</b> the bees can&rsquo;t cross. wall off two patches and, in time, they diverge into separate species. tap the 🧱 tool again to clear.' };
    showHint(hints[t]);
  }
  function updateLightIcon() {
    const ic = $('lightIcon'), la = $('lightLabel'), pip = $('lightPip');
    if (ic) ic.textContent = G.lightMode === 'sun' ? '☀' : '🌑';
    if (la) la.textContent = G.lightMode;
    if (pip) pip.classList.toggle('on', G.lightMode === 'shade');
  }
  function paintAt(clientX, clientY) {
    const c = B.Render.pickCell($('world'), clientX, clientY);
    if (G.tool === 'light') G.sim.field.paintLight(c.x, c.y, 6, G.lightMode === 'sun' ? 1.2 : 0.28, 0.5);
    else if (G.tool === 'hedge') G.sim.field.paintBarrier(c.x, c.y, 1.6, G.hedgeMode === 'build');
  }
  function updateHedgeIcon() {
    const ic = $('hedgeIcon'), la = $('hedgeLabel'), pip = $('hedgePip');
    if (ic) ic.textContent = G.hedgeMode === 'build' ? '🧱' : '🧹';
    if (la) la.textContent = G.hedgeMode === 'build' ? 'hedge' : 'clear';
    if (pip) pip.classList.toggle('on', G.hedgeMode === 'clear');
  }

  function updateToolbarScrollHint() {
    const tb = $('toolbar');
    if (tb) tb.classList.toggle('scrollable', tb.scrollWidth > tb.clientWidth + 4);
  }
  let hintT = null;
  function showHint(txt) { const h = $('hint'); h.innerHTML = txt; h.style.opacity = '1'; clearTimeout(hintT); hintT = setTimeout(() => h.style.opacity = '0', 4600); }

  function setSpeed() { G.speedIdx = (G.speedIdx + 1) % SPEEDS.length; $('btnSpeed').textContent = SPEEDS[G.speedIdx].l; }
  function setPaused(p) { G.paused = p; $('btnPause').textContent = p ? '▶' : '⏸'; }

  function autosave() { B.Persist.save(G.sim, { miles: Array.from(G.miles), tick0: G.tick0, forms: G.forms }); }

  function updateSeedline() { const el = $('seedline'); if (el) el.innerHTML = 'this garden&rsquo;s seed: <b style="color:#f0b870">' + G.seed + '</b> — the same seed always grows the same garden. it&rsquo;s in your address bar to share.'; }

  function sizeCanvas() { /* canvas internal size is set by paint(); CSS scales it. nothing to do. */ }

  // ── wire ──
  function wireUI() {
    const w = $('world');
    w.addEventListener('click', e => onWorldTap(e.clientX, e.clientY));
    w.addEventListener('touchstart', e => { if (!PAINT_TOOLS[G.tool] && e.touches[0]) { onWorldTap(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
    // brush tools (light, hedge): paint by dragging
    w.addEventListener('pointerdown', e => { if (PAINT_TOOLS[G.tool]) { G.painting = true; paintAt(e.clientX, e.clientY); e.preventDefault(); } });
    w.addEventListener('pointermove', e => { if (G.painting && PAINT_TOOLS[G.tool]) { paintAt(e.clientX, e.clientY); e.preventDefault(); } });
    window.addEventListener('pointerup', () => { G.painting = false; });
    document.querySelectorAll('.tool').forEach(b => b.onclick = () => setTool(b.dataset.tool));
    setTool('inspect');
    $('btnPause').onclick = () => setPaused(!G.paused);
    $('btnSpeed').onclick = setSpeed;
    $('btnMurmurs').onclick = () => { renderMurmurs(); $('murmursOv').classList.add('show'); };
    $('btnMenu').onclick = () => { updateSeedline(); $('menuOv').classList.add('show'); };
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { $('murmursOv').classList.remove('show'); $('menuOv').classList.remove('show'); });
    document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); }));
    $('btnNew').onclick = () => { newGarden((Math.random() * 1e9) >>> 0); $('menuOv').classList.remove('show'); renderMurmurs(); renderDash(true); toast('a new garden — a fresh, fumbling pair. coax them.'); };
    $('btnReset').onclick = () => { B.Persist.clear(); newGarden(G.seed); $('menuOv').classList.remove('show'); renderMurmurs(); renderDash(true); };
    document.addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); setPaused(!G.paused); }
      else if (e.key === 'f') setSpeed();
      else if (e.key === 'Escape') { $('murmursOv').classList.remove('show'); $('menuOv').classList.remove('show'); }
    });
    window.addEventListener('beforeunload', autosave);
    updateToolbarScrollHint();
    window.addEventListener('resize', updateToolbarScrollHint);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
