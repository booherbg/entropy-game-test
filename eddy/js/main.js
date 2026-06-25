;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  E.Main = {};

  let gl = null, sim = null, playing = true, stepOnce = false, last = 0, acc = 0;
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
      sim.tick(); acc -= TICK_MS; stepOnce = false;
      if (++ticks > 8) { acc = 0; break; } // don't spiral after a tab-away
    }
    resize();
    if (E.Render && E.Render.draw) E.Render.draw(sim, gl);
    const ro = document.getElementById('readout');
    if (ro) { const s = sim.stats(); ro.textContent = `${playing ? '▶' : '❚❚'}  alive ${s.alive} · diets ${s.speciesApprox}`; }
    requestAnimationFrame(frame);
  }

  function freshSim() {
    const s = E.makeSim(((typeof Date !== 'undefined' && Date.now) ? Date.now() : 1) >>> 0);
    const gx = (E.W * 0.4) | 0, gy = (E.H * 0.5) | 0;   // a gentle opening: one lumen spring + a primer
    s.addGenerator({ x: gx, y: gy, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    s.dropPrimer(gx, gy);
    return s;
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
  E.Main.replaceSim = (s) => { sim = s; E.Main.sim = s; acc = 0; };
  E.Main.newWorld = () => { if (E.Persist) E.Persist.clear(); E.Main.replaceSim(freshSim()); if (E.UI && E.UI._refresh) E.UI._refresh(); };

  // browser-only boot; load-safe under Node (require defines E.Main without booting)
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
