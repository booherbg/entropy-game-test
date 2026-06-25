'use strict';
// Headless screenshot of one sim state → eddy/shots/<name>.png. Usage: node eddy/test/shot.js [ticks] [name]
const fs = require('fs');
['rng', 'grid', 'field', 'generators', 'life', 'fertility', 'sim', 'render'].forEach(f => require('../js/' + f + '.js'));
const E = globalThis.E;
const { encodePNG, renderWorld } = require('./pngutil.js');

const ticks = parseInt(process.argv[2] || '600', 10);
const name = process.argv[3] || 'world';
const sim = E.makeSim(7);
sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16, reservoir: 12000, r0: 12000 });
sim.addGenerator({ x: 100, y: 52, el: E.MIN, rate: 8, proj: 'radial', radius: 16, reservoir: 9000, r0: 9000 });
sim.addGenerator({ x: 82, y: 28, el: E.HUM, rate: 5, proj: 'vein', angle: 0.5, length: 34, reservoir: 4000, r0: 4000 });
sim.dropPrimer(60, 50); sim.dropPrimer(100, 52);
for (let t = 0; t < ticks; t++) sim.tick();

const { rgb, w, h } = renderWorld(E, sim, 6);
fs.mkdirSync(__dirname + '/../shots', { recursive: true });
const out = __dirname + '/../shots/' + name + '.png';
fs.writeFileSync(out, encodePNG(w, h, rgb));
const s = sim.stats();
console.log(`wrote ${out}  (${w}x${h}, ${ticks} ticks, ${s.alive} alive, ${s.speciesApprox} diets)`);
