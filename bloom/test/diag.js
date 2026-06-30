'use strict';
// Diagnostic: warm-start a sim and print the co-evolution curve. Usage: node bloom/test/diag.js [seed] [ticks]
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim'].forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B;
const seed = parseInt(process.argv[2] || '7', 10);
const ticks = parseInt(process.argv[3] || '4000', 10);
const sim = B.makeSim(seed); sim.warmStart();
console.log(`seed ${seed}  · tick  plants  bees  meanFit  gridMatch  nectar  pollen  born  starved`);
function row() {
  const s = sim.stats(), c = sim.colonies[0];
  console.log(`  ${String(sim.tickCount).padStart(5)}  ${String(s.plants).padStart(6)}  ${String(s.pollinators).padStart(4)}  ` +
    `${s.meanFit.toFixed(3).padStart(6)}  ${s.gridMatch.toFixed(3).padStart(8)}  ${c.nectar.toFixed(1).padStart(6)}  ${c.pollen.toFixed(1).padStart(6)}  ` +
    `${String(c.born).padStart(4)}  ${String(c.starved).padStart(6)}`);
}
row();
for (let t = 0; t < ticks; t++) { sim.tick(); if (sim.tickCount % Math.max(1, (ticks / 20) | 0) === 0) row(); }
