;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  E.UI = E.UI || {};

  // pure: map a canvas-relative pixel to a grid cell (clamped). node-testable.
  E.UI.cellFromPixel = function (px, py, cw, ch) {
    const x = Math.min(E.W - 1, Math.max(0, Math.floor(px / cw * E.W)));
    const y = Math.min(E.H - 1, Math.max(0, Math.floor(py / ch * E.H)));
    return { x: x, y: y };
  };

  E.UI.init = function (canvas, sim, main) {
    let tool = 'generator', element = E.LUM, proj = 'radial';
    const bar = document.getElementById('toolbar');
    const hint = document.getElementById('hint');
    const spacer = bar.querySelector('.spacer');
    const ELN = ['lumen', 'mineral', 'humus'];

    function mkBtn(label, onClick) {
      const b = document.createElement('span'); b.className = 'tool'; b.textContent = label; b.onclick = onClick;
      bar.insertBefore(b, spacer); return b;
    }
    const btn = {};
    btn.generator = mkBtn('◈ generator', () => { tool = 'generator'; refresh(); });
    btn.element   = mkBtn('lumen',       () => { element = (element + 1) % 3; refresh(); });
    btn.proj      = mkBtn('radial',      () => { proj = (proj === 'radial' ? 'vein' : 'radial'); refresh(); });
    btn.primer    = mkBtn('✦ primer',    () => { tool = 'primer'; refresh(); });
    btn.hunter    = mkBtn('⚔ hunter',    () => { tool = 'hunter'; refresh(); });
    btn.rot       = mkBtn('☣ rot',       () => { tool = 'rot'; refresh(); });
    btn.inspect   = mkBtn('◌ inspect',   () => { tool = 'inspect'; refresh(); });
    btn.lens      = mkBtn('◉ lens',      () => { E.Render.lens = (E.Render.lens === 'world' ? 'rawfield' : 'world'); refresh(); });
    btn.play      = mkBtn('❚❚ pause',    () => { main.setPlaying(!main.isPlaying()); refresh(); });
    btn.fresh     = mkBtn('✛ new',       () => { if (main.newWorld) main.newWorld(); });
    btn.aspect    = mkBtn('◎ aspect',    () => { if (main.cycleAspect) main.cycleAspect(); refresh(); });

    function refresh() {
      ['generator', 'primer', 'hunter', 'rot', 'inspect'].forEach(k => btn[k].classList.toggle('on', tool === k));
      btn.lens.classList.toggle('on', E.Render.lens === 'rawfield');
      btn.play.textContent = main.isPlaying() ? '❚❚ pause' : '▶ play';
      if (main.aspectName) btn.aspect.textContent = '◎ ' + main.aspectName();
      btn.element.textContent = ELN[element];
      btn.proj.textContent = proj;
      btn.element.style.opacity = btn.proj.style.opacity = (tool === 'generator' ? '1' : '0.4');
      if (hint) hint.textContent =
        tool === 'generator' ? `click to place a ${ELN[element]} ${proj} spring — finite, it runs dry; tend the flow` :
        tool === 'primer'    ? 'click a surplus patch to seed life — it latches to the local blend' :
        tool === 'hunter'    ? 'click inside a living colony to seed a hunter — it eats other life (crimson)' :
        tool === 'rot'       ? 'loose a rot — it sweeps a monoculture but stalls at the seams between guilds; diversity is your firebreak' :
        tool === 'inspect'   ? 'click near a creature to read what it is and why' : '';
    }

    canvas.addEventListener('click', function (ev) {
      const r = canvas.getBoundingClientRect();
      const cell = E.UI.cellFromPixel(ev.clientX - r.left, ev.clientY - r.top, r.width, r.height);
      const s = main.getSim ? main.getSim() : sim;
      if (tool === 'generator') {
        if (main.afford && !main.afford('spring')) { if (hint) hint.textContent = `not enough flow for a spring (costs ${main.cost('spring')})`; return; }
        // a finite spring: it runs dry, so where & when you place it is a real decision (steward the flow)
        s.addGenerator({ x: cell.x, y: cell.y, el: element, rate: 8, proj: proj, radius: 16, angle: 0.5, length: 30, reservoir: 4000, r0: 4000 });
      } else if (tool === 'primer') {
        if (main.afford && !main.afford('primer')) { if (hint) hint.textContent = 'not enough flow to seed'; return; }
        s.dropPrimer(cell.x, cell.y);
      } else if (tool === 'hunter') {
        if (main.afford && !main.afford('hunter')) { if (hint) hint.textContent = `not enough flow for a hunter (costs ${main.cost('hunter')})`; return; }
        s.dropPredator(cell.x, cell.y);
      } else if (tool === 'rot') {
        s.dropRot(cell.x, cell.y); // a controlled burn — free, but it mostly hurts unless you wield it against a monoculture
      } else if (tool === 'inspect' && E.UI.inspectAt) {
        E.UI.inspectAt(s, cell); // Task 14
      }
    });

    E.UI._refresh = refresh;
    refresh();
  };

  // inspector: read the nearest living thing to a clicked cell — what it is, eats, makes, why.
  let murmurN = 0;
  E.UI.inspectAt = function (sim, cell) {
    const box = document.getElementById('inspector'); if (!box) return;
    let best = null, bestD = 16; // within ~4 cells
    for (const e of sim.life.list) {
      if (!e.alive) continue;
      const d = (e.x - cell.x) * (e.x - cell.x) + (e.y - cell.y) * (e.y - cell.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) { box.classList.remove('show'); return; }
    const e = best;
    const elName = ['lumen', 'mineral', 'humus'], cls = ['lum', 'min', 'hum'], col = ['gold', 'blue', 'green'];
    const order = [0, 1, 2].sort((a, b) => e.diet[b] - e.diet[a]);
    const dom = order[0];
    const eats = order.filter(k => e.diet[k] > 0.15)
      .map(k => `<span class="chip ${cls[k]}">${elName[k]}</span>`).join('');
    const state = e.biomass > 1.2 ? 'thriving' : (e.biomass > 0.4 ? 'holding' : 'starving');
    box.innerHTML =
      `<h3>${E.Content.nameFor(e.diet)}</h3>` +
      `<div class="meta">gen ${e.gen} · ${state}${(e.pred || 0) > 0.3 ? ' · a hunter (eats other life)' : ''}</div>` +
      `<div class="row"><span class="k">eats</span>${eats || '—'}</div>` +
      `<div class="row"><span class="k">makes</span><span class="chip hum">humus</span> + motion</div>` +
      `<div class="why">it adapted to the ${elName[dom]} you fed here — that is why it reads ${col[dom]}. ` +
      `starve that source and it pales, shrinks, and dies back into the soil.</div>`;
    box.classList.add('show');
    surfaceMurmur();
  };

  function surfaceMurmur() {
    const m = document.getElementById('murmur'); if (!m || !E.Content || !E.Content.murmur) return;
    const q = E.Content.murmur(murmurN++);
    m.innerHTML = q.q + (q.by ? `<span class="by">— ${q.by}</span>` : '<span class="by">— the voice that gathered them</span>');
    m.style.opacity = '0.62';
    clearTimeout(surfaceMurmur._t);
    surfaceMurmur._t = setTimeout(() => { m.style.opacity = '0.18'; }, 9000);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
