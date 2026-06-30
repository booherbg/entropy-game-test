'use strict';
// THE SOUL TEST. The whole project is earned here: starting from a random, fumbling, barely-surviving pair,
// does selection co-adapt the flower grids and the pollinator keys into an exquisitely-matched lock-and-key —
// measurably, across seeds? And does the lock lever make the keys chase a frozen grid (one-sided)?
// Run: node bloom/test/soul.js
['rng', 'const', 'field', 'genome', 'flower', 'plant', 'pollinator', 'colony', 'sim'].forEach(m => require('../js/' + m + '.js'));
const B = globalThis.B;

let fails = 0;
function ok(cond, msg) { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (!cond) fails++; }

// ── 1. The merge: fumbling → native, across seeds ──
console.log('\n· the merge — random fumbling pair co-adapts into a matched lock-and-key');
const SEEDS = [7, 13, 21, 42, 99];
const TICKS = 4000, WINDOW = 1000;
const summary = [];
for (const seed of SEEDS) {
  const sim = B.makeSim(seed); sim.warmStart();
  const initial = sim.stats().meanFit;
  let peak = initial; const tail = [];
  for (let t = 0; t < TICKS; t++) {
    sim.tick();
    const f = sim.stats().meanFit;
    if (f > peak) peak = f;
    if (t >= TICKS - WINDOW) tail.push(f);
  }
  const tailMean = tail.reduce((a, b) => a + b, 0) / tail.length;
  summary.push({ seed, initial, peak, tailMean });
  console.log(`  seed ${String(seed).padStart(3)}:  initial ${initial.toFixed(3)}  →  peak ${peak.toFixed(3)}  ·  sustained(last ${WINDOW}) ${tailMean.toFixed(3)}`);
}
const avgInitial = summary.reduce((a, s) => a + s.initial, 0) / summary.length;
const avgPeak = summary.reduce((a, s) => a + s.peak, 0) / summary.length;
const avgTail = summary.reduce((a, s) => a + s.tailMean, 0) / summary.length;
console.log(`  mean over ${SEEDS.length} seeds:  initial ${avgInitial.toFixed(3)}  ·  peak ${avgPeak.toFixed(3)}  ·  sustained ${avgTail.toFixed(3)}`);

ok(avgInitial < 0.25, `starts fumbling (mean initial fit ${avgInitial.toFixed(3)} < 0.25)`);
ok(summary.every(s => s.peak > 0.75), 'every seed reaches a native lock-and-key (peak fit > 0.75)');
ok(avgTail > avgInitial + 0.3, `the merge is large and sustained (+${(avgTail - avgInitial).toFixed(3)} over the start)`);
ok(avgTail > 0.5, `sustained well above fumbling (mean sustained ${avgTail.toFixed(3)} > 0.5)`);

// ── 2. The lever: lock a grid → the keys chase it (one-sided convergence) ──
console.log('\n· the lever — freeze the flower grids and the colony decoders converge toward them');
{
  const sim = B.makeSim(7); sim.warmStart();
  sim.allFlowers().forEach(fl => sim.lockFlower(fl, true)); // freeze every grid
  const initial = sim.meanGridMatch();
  let tail = [];
  for (let t = 0; t < 3000; t++) { sim.tick(); if (t >= 2000) tail.push(sim.meanGridMatch()); }
  const tailMean = tail.reduce((a, b) => a + b, 0) / tail.length;
  console.log(`  locked grids:  initial gridMatch ${initial.toFixed(3)}  →  sustained ${tailMean.toFixed(3)}`);
  ok(tailMean > initial + 0.3, `keys converge toward the frozen grids (+${(tailMean - initial).toFixed(3)})`);
  ok(tailMean > 0.7, `keys reach the locked grids (sustained ${tailMean.toFixed(3)} > 0.7)`);
}

console.log(`\n${fails === 0 ? 'SOUL TEST PASSED — the merge is real, measured, and steerable.' : fails + ' SOUL CHECK(S) FAILED'}`);
process.exit(fails ? 1 : 0);
