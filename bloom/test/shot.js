'use strict';
// Headless screenshot of one sim state → bloom/shots/<name>.png. Usage: node bloom/test/shot.js [ticks] [name] [seed] [scale]
const fs = require('fs');
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim', 'render-core'].forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B;
const { encodePNG } = require('./pngutil.js');

const ticks = parseInt(process.argv[2] || '600', 10);
const name = process.argv[3] || 'world';
const seed = parseInt(process.argv[4] || '7', 10);
const scale = parseInt(process.argv[5] || '9', 10);

const sim = B.makeSim(seed); sim.warmStart();
for (let t = 0; t < ticks; t++) sim.tick();

const { rgb, w, h } = B.Render.paint(sim, scale);
fs.mkdirSync(__dirname + '/../shots', { recursive: true });
const out = __dirname + '/../shots/' + name + '.png';
fs.writeFileSync(out, encodePNG(w, h, rgb));
const s = sim.stats();
console.log(`wrote ${out}  (${w}x${h}, ${ticks} ticks, seed ${seed})  fit ${s.meanFit.toFixed(2)}  plants ${s.plants}  bees ${s.pollinators}`);
