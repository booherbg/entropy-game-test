'use strict';
// Builds the Daisyworld "money shot" as an inline SVG: the clime held near the habitable optimum BY LIFE,
// against the runaway it would follow with no life feedback. Exported for report-gen; runnable for a preview.
['rng', 'grid', 'field', 'generators', 'life', 'fertility', 'sim'].forEach(f => require('../js/' + f + '.js'));
const E = globalThis.E;

// run a Gaian world under steady warming and sample the regulated clime over time
function trace(forcing, ticks) {
  const s = E.makeSim(7);
  s.setGaia(true); s.setClimeForcing(forcing);
  s.addGenerator({ x: 70, y: 50, el: E.LUM, rate: 9, proj: 'radial', radius: 20, reservoir: 1e9, r0: 1e9 });
  s.addGenerator({ x: 90, y: 50, el: E.MIN, rate: 9, proj: 'radial', radius: 20, reservoir: 1e9, r0: 1e9 });
  s.dropPrimer(70, 50); s.dropPrimer(90, 50);
  const reg = [];
  for (let t = 1; t <= ticks; t++) { s.tick(); if (t % 40 === 0) reg.push([t, s.clime()]); }
  return reg;
}

function buildSVG() {
  const forcing = 0.0004, ticks = 4000;
  const reg = trace(forcing, ticks);
  const W = 880, H = 360, mL = 56, mR = 16, mT = 30, mB = 40;
  const pw = W - mL - mR, ph = H - mT - mB;
  const xmax = ticks, ymax = 2.2;
  const X = t => mL + (t / xmax) * pw;
  const Y = c => mT + (1 - Math.min(c, ymax) / ymax) * ph;
  const regPts = reg.map(([t, c]) => `${X(t).toFixed(1)},${Y(c).toFixed(1)}`).join(' ');
  // unregulated reference: the clime with no life feedback, capped at the model's clamp (2.0)
  const unreg = [];
  for (let t = 0; t <= ticks; t += 40) unreg.push(`${X(t).toFixed(1)},${Y(Math.min(2.0, 0.5 + forcing * t)).toFixed(1)}`);
  // habitable band (where metabolism stays healthy): |clime-0.5| within ~0.4 ⇒ clime in [0.1, 0.9]
  const bandTop = Y(0.9), bandBot = Y(0.1);
  const gy = c => Y(c).toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:#12151b;border:1px solid #2c2f36;border-radius:7px">
  <rect x="${mL}" y="${bandTop.toFixed(1)}" width="${pw}" height="${(bandBot - bandTop).toFixed(1)}" fill="#3a6" opacity="0.07"/>
  <line x1="${mL}" y1="${gy(0.5)}" x2="${W - mR}" y2="${gy(0.5)}" stroke="#6fbf8a" stroke-width="1" stroke-dasharray="2 3" opacity="0.6"/>
  <text x="${W - mR}" y="${(Y(0.5) - 5).toFixed(1)}" fill="#6fbf8a" font-size="11" text-anchor="end" font-family="Georgia,serif" opacity="0.8">habitable optimum</text>
  ${[0, 0.5, 1.0, 1.5, 2.0].map(c => `<text x="${mL - 8}" y="${(Y(c) + 4).toFixed(1)}" fill="#8a8f98" font-size="10" text-anchor="end" font-family="Georgia,serif">${c.toFixed(1)}</text>`).join('')}
  <line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT + ph}" stroke="#2c2f36"/>
  <line x1="${mL}" y1="${mT + ph}" x2="${W - mR}" y2="${mT + ph}" stroke="#2c2f36"/>
  <text x="${mL}" y="${H - 8}" fill="#8a8f98" font-size="10" font-family="Georgia,serif">tick 0</text>
  <text x="${W - mR}" y="${H - 8}" fill="#8a8f98" font-size="10" text-anchor="end" font-family="Georgia,serif">${ticks}</text>
  <text x="14" y="${(mT + ph / 2).toFixed(1)}" fill="#8a8f98" font-size="11" font-family="Georgia,serif" transform="rotate(-90 14 ${(mT + ph / 2).toFixed(1)})" text-anchor="middle">clime (temperature)</text>
  <polyline points="${unreg.join(' ')}" fill="none" stroke="#d98a8a" stroke-width="2" stroke-dasharray="5 4"/>
  <polyline points="${regPts}" fill="none" stroke="#7fd0ff" stroke-width="2.5"/>
  <g font-family="Georgia,serif" font-size="12">
    <rect x="${mL + 12}" y="${mT + 8}" width="22" height="3" fill="#7fd0ff"/>
    <text x="${mL + 40}" y="${mT + 13}" fill="#cdd2da">with life — the clime, regulated</text>
    <rect x="${mL + 12}" y="${mT + 26}" width="22" height="3" fill="#d98a8a"/>
    <text x="${mL + 40}" y="${mT + 31}" fill="#cdd2da">without life — the same forcing, runaway</text>
  </g>
</svg>`;
}

module.exports = { buildSVG, trace };

if (require.main === module) {
  const fs = require('fs');
  const svg = buildSVG();
  fs.writeFileSync(__dirname + '/../shots/gaia-regulation.svg', svg);
  const reg = trace(0.0004, 4000);
  console.log(`wrote shots/gaia-regulation.svg (${(svg.length / 1024).toFixed(1)} KB) — final regulated clime ${reg[reg.length - 1][1].toFixed(3)} vs unregulated ${(0.5 + 0.0004 * 4000).toFixed(2)}`);
}
