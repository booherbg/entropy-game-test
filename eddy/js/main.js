;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  E.Main = {};

  let gl = null, sim = null, playing = true, stepOnce = false, last = 0, acc = 0, simTicks = 0, chronicle = null, aspect = 0;
  const TICK_MS = 60; // sim cadence; render runs every frame

  function resize() {
    const c = E.Main.canvas; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(c.clientWidth * dpr));
    const h = Math.max(1, Math.floor(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; if (gl) gl.viewport(0, 0, w, h); }
  }

  function frame(ts) {
    if (!last) last = ts;
    const dt = ts - last; last = ts;
    if (playing) acc += dt;
    let ticks = 0;
    while (((playing && acc >= TICK_MS) || stepOnce)) {
      sim.tick(); simTicks++; acc -= TICK_MS; stepOnce = false;
      if (chronicle && simTicks % 20 === 0) chronicle.observe(sim, simTicks);
      if (++ticks > 8) { acc = 0; break; } // don't spiral after a tab-away
    }
    resize();
    if (E.Render && E.Render.draw) E.Render.draw(sim, gl);
    const ro = document.getElementById('readout');
    if (ro) { const s = sim.stats(); ro.textContent = `${playing ? '▶' : '❚❚'}  alive ${s.alive} · diets ${s.speciesApprox}` + (chronicle ? ` · witnessed ${chronicle.codex.size}` : ''); }
    if (chronicle) renderChronicle();
    if (E.score) renderScore();
    requestAnimationFrame(frame);
  }

  function freshSim() {
    const s = E.makeSim(((typeof Date !== 'undefined' && Date.now) ? Date.now() : 1) >>> 0);
    const gx = (E.W * 0.4) | 0, gy = (E.H * 0.5) | 0;   // a gentle opening: one lumen spring + a primer
    s.addGenerator({ x: gx, y: gy, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    // pre-build the gradient so the opening seed lands in real surplus and takes immediately
    // (otherwise a fresh world sits dead for hundreds of ticks while the spring slowly pools)
    for (let k = 0; k < 40; k++) { s.field.diffuse(); E.depositGenerators(s.field, s.gens); }
    s.dropPrimer(gx, gy);
    return s;
  }

  function renderChronicle() {
    const el = document.getElementById('chronicle'); if (!el) return;
    const ms = chronicle.milestones.map(e => `<div class="ev milestone">★ ${e.text}</div>`).join('');
    const rec = chronicle.recent(5).filter(e => e.kind !== 'milestone').map(e => `<div class="ev ${e.kind}">${e.text}</div>`).join('');
    el.innerHTML = ms + rec;
  }

  function renderScore() {
    const el = document.getElementById('score'); if (!el || !E.score || !E.ASPECTS) return;
    const s = E.score(sim), a = E.ASPECTS[aspect % E.ASPECTS.length];
    el.innerHTML = `<div class="aspect">pursuing · the ${a.name}</div>`
      + `<div class="big">${s[a.of]}</div>`
      + `<div class="m">div <b>${s.diversity}</b> · order <b>${s.order}</b> · burn <b>${s.throughput}</b> · flourish <b>${s.flourish}</b></div>`;
  }

  function boot() {
    const c = document.getElementById('gl');
    E.Main.canvas = c;
    gl = c.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) {
      document.body.innerHTML = '<p style="padding:24px;font-family:Georgia,serif">this loophole needs WebGL2 — try a current browser.</p>';
      return;
    }
    resize();
    sim = (E.Persist && E.Persist.load) ? E.Persist.load() : null;
    if (!sim) sim = freshSim();
    E.Main.sim = sim;
    chronicle = (E.makeChronicle ? E.makeChronicle() : null);
    if (E.Render && E.Render.init) E.Render.init(gl);
    if (E.UI && E.UI.init) E.UI.init(c, sim, E.Main);

    window.addEventListener('keydown', function (e) {
      if (e.key === ' ') { playing = !playing; e.preventDefault(); }
      else if (e.key === 's' && !playing) { stepOnce = true; }
    });
    window.addEventListener('resize', resize);
    setInterval(function () { if (E.Persist) E.Persist.save(sim); }, 5000);
    window.addEventListener('beforeunload', function () { if (E.Persist) E.Persist.save(sim); });
    requestAnimationFrame(frame);
  }

  E.Main.isPlaying = () => playing;
  E.Main.setPlaying = (v) => { playing = !!v; };
  E.Main.getSim = () => sim;
  E.Main.replaceSim = (s) => { sim = s; E.Main.sim = s; acc = 0; simTicks = 0; chronicle = (E.makeChronicle ? E.makeChronicle() : null); };
  E.Main.newWorld = () => { if (E.Persist) E.Persist.clear(); E.Main.replaceSim(freshSim()); if (E.UI && E.UI._refresh) E.UI._refresh(); };
  E.Main.cycleAspect = () => { aspect = (aspect + 1) % ((E.ASPECTS && E.ASPECTS.length) || 1); };
  E.Main.aspectName = () => (E.ASPECTS ? E.ASPECTS[aspect % E.ASPECTS.length].name : '');

  // browser-only boot; load-safe under Node (require defines E.Main without booting)
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
