'use strict';
// Renders a visual sheet of drawn artifacts (sigil + name + rarity + flavor) to an HTML file, for the
// cold-read: do the relics look like they GREW in bloom's world? Run: node bloom/test/artifact-sheet.js
// then screenshot the printed file:// path with headless Chrome.
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim', 'artifact']
  .forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B, A = B.Artifacts;
const fs = require('fs'), path = require('path');

// one of every archetype (so the sheet shows the whole catalog), plus a couple of real 2-relic draws.
const cards = [];
A.CATALOG.forEach((c, i) => cards.push(A.make(c.id, 100 + i * 7)));
[7, 42, 1312].forEach(s => A.draw(s, 2).forEach(a => cards.push(a)));

const RC = { common: '#9fd98f', uncommon: '#6fb0f0', rare: '#9a7bd0', mythic: '#ecd24a' };
const cardHTML = a => `
  <div class="card ${a.rarity}">
    <div class="sig">${A.sigilSVG(a, 132)}</div>
    <div class="name">${a.name}</div>
    <div class="rar" style="color:${RC[a.rarity]}">${a.rarity} · ${a.archetype}</div>
    <div class="flav">${a.flavor}</div>
  </div>`;

const html = `<!doctype html><meta charset="utf-8"><title>bloom — artifacts</title>
<style>
  body{margin:0;background:#0c0b0a;color:#e8e2d6;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;padding:34px}
  h1{font-weight:500;letter-spacing:.04em;color:#ecd24a;margin:0 0 4px}
  .sub{color:#8a8575;margin:0 0 26px;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;max-width:1180px}
  .card{background:#16140f;border:1px solid #2a2620;border-radius:12px;padding:16px;display:flex;flex-direction:column;align-items:center;text-align:center}
  .card.mythic{border-color:#6b5a1e;box-shadow:0 0 24px rgba(236,210,74,.14) inset}
  .card.rare{border-color:#3c3350}
  .sig{border-radius:9px;overflow:hidden;line-height:0;box-shadow:0 4px 14px rgba(0,0,0,.5)}
  .name{margin-top:13px;font-size:16px;font-weight:600;color:#f2ecdf}
  .rar{margin-top:3px;font-size:11px;letter-spacing:.09em;text-transform:uppercase}
  .flav{margin-top:9px;font-size:12.5px;color:#b8b1a2;font-style:italic}
</style>
<h1>the draw</h1>
<p class="sub">a hand of relics, each a genome rendered in the world's own glyph. names, sigils, and flavor are procedural and deterministic — same seed, same hand.</p>
<div class="grid">${cards.map(cardHTML).join('')}</div>`;

const out = path.join(__dirname, '..', 'shots', 'round4-artifacts-sheet.html');
fs.writeFileSync(out, html);
console.log('wrote ' + out);
console.log('file://' + path.resolve(out));
