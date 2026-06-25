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
    btn.inspect   = mkBtn('◌ inspect',   () => { tool = 'inspect'; refresh(); });
    btn.lens      = mkBtn('◉ lens',      () => { E.Render.lens = (E.Render.lens === 'world' ? 'rawfield' : 'world'); refresh(); });
    btn.play      = mkBtn('❚❚ pause',    () => { main.setPlaying(!main.isPlaying()); refresh(); });

    function refresh() {
      ['generator', 'primer', 'inspect'].forEach(k => btn[k].classList.toggle('on', tool === k));
      btn.lens.classList.toggle('on', E.Render.lens === 'rawfield');
      btn.play.textContent = main.isPlaying() ? '❚❚ pause' : '▶ play';
      btn.element.textContent = ELN[element];
      btn.proj.textContent = proj;
      btn.element.style.opacity = btn.proj.style.opacity = (tool === 'generator' ? '1' : '0.4');
      if (hint) hint.textContent =
        tool === 'generator' ? `click to place a ${ELN[element]} ${proj} generator (finite source)` :
        tool === 'primer'    ? 'click a surplus patch to seed life — it latches to the local blend' :
        tool === 'inspect'   ? 'click near a creature to read what it is and why' : '';
    }

    canvas.addEventListener('click', function (ev) {
      const r = canvas.getBoundingClientRect();
      const cell = E.UI.cellFromPixel(ev.clientX - r.left, ev.clientY - r.top, r.width, r.height);
      const s = main.getSim ? main.getSim() : sim;
      if (tool === 'generator') {
        s.addGenerator({ x: cell.x, y: cell.y, el: element, rate: 8, proj: proj, radius: 16, angle: 0.5, length: 30 });
      } else if (tool === 'primer') {
        s.dropPrimer(cell.x, cell.y);
      } else if (tool === 'inspect' && E.UI.inspectAt) {
        E.UI.inspectAt(s, cell); // Task 14
      }
    });

    E.UI._refresh = refresh;
    refresh();
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
