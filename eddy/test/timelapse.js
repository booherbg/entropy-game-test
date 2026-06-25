'use strict';
// A time-lapse strip: one world rendered at several ages, side by side — chaos organizing over time,
// visible at a glance. Usage: node eddy/test/timelapse.js
const fs = require('fs');
['rng', 'grid', 'field', 'generators', 'life', 'fertility', 'sim', 'render'].forEach(f => require('../js/' + f + '.js'));
const E = globalThis.E;
const { encodePNG, renderWorld, blit } = require('./pngutil.js');

const sim = E.makeSim(7);
sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16, reservoir: 9000, r0: 9000 });
sim.addGenerator({ x: 100, y: 52, el: E.MIN, rate: 8, proj: 'radial', radius: 16, reservoir: 9000, r0: 9000 });
sim.addGenerator({ x: 82, y: 28, el: E.HUM, rate: 5, proj: 'vein', angle: 0.5, length: 34, reservoir: 3500, r0: 3500 });
sim.dropPrimer(60, 50); sim.dropPrimer(100, 52);

const marks = [120, 450, 1000, 1800]; // ages to capture: establish → grow → mature → springs draining
const S = 4;
const frames = [];
let t = 0;
for (const m of marks) { while (t < m) { sim.tick(); t++; } frames.push(renderWorld(E, sim, S)); }

const gap = 8, fw = frames[0].w, fh = frames[0].h;
const W = frames.length * fw + (frames.length - 1) * gap, H = fh;
const strip = new Uint8Array(W * H * 3);
for (let i = 0; i < strip.length; i += 3) { strip[i] = 14; strip[i + 1] = 16; strip[i + 2] = 20; } // dark gaps
frames.forEach((f, k) => blit(strip, W, f.rgb, f.w, f.h, k * (fw + gap), 0));

fs.mkdirSync(__dirname + '/../shots', { recursive: true });
const out = __dirname + '/../shots/timelapse.png';
fs.writeFileSync(out, encodePNG(W, H, strip));
console.log(`wrote ${out}  (${W}x${H}, frames at ticks ${marks.join(', ')})`);
