/* PROBE: does the APEX drive a predator-prey cycle in the herd, or is the herd just noisy?
   core.js:142 intends "predator & prey cycle"; the 'steady state' discovery measured BIOMASS (stable) and
   labelled the design "never-Lotka-Volterra". But biomass is dominated by stable flora — it can mask a
   fauna-level cycle. CONTROL: run each meadow twice, apex ON vs apex OFF (predator speciation disabled).
   If the apex drives a cycle, apex-ON herds should oscillate MORE (more reversals, higher amplitude, lower
   mean) than apex-OFF herds. PRED.REFUGE=2 ("never the last of the herd") should keep it bounded, not collapsing. */
'use strict';
const path = require('path');
const LP = require(path.join(__dirname, '..', 'js', 'core.js'));
require(path.join(__dirname, '..', 'js', 'content.js'));
const { Game } = LP;

function run(seed, turns, noApex) {
  const g = new Game(seed);
  g.mode = 'longgame';
  if (noApex) g._speciatePredator = () => {}; /* the meadow & herd are identical; only predation is removed */
  const hd = c => (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.q + c.r)) / 2;
  [...g.cells.values()].filter(c => hd(c) <= 8).sort((c, d) => (c.q - d.q) || (c.r - d.r))
    .forEach((c, i) => { if (i % 7 === 0) c.pat = g._mkPat('moss'); else if (i % 7 === 3) c.pat = g._mkPat('ant'); else if (i % 13 === 5) c.pat = g._mkPat('crys'); });
  g._recompute();
  const grazerN = [], apexAppeared = [], grazSpecies = new Set();
  for (let t = 0; t < turns && !g.over; t++) {
    g.order += 14; g.endTurn();
    let grazer = 0, apex = 0;
    for (const f of g.fauna) { const s = g.faunaSpecies.get(f.spId); if (!s) continue; if (s.role === 'grazer') { grazer++; grazSpecies.add(f.spId); } else if (s.role === 'predator') apex++; }
    grazerN.push(grazer); apexAppeared.push(apex);
  }
  return { grazerN, apexAppeared, distinctHerds: grazSpecies.size };
}

function stats(vals) {
  let rev = 0, lastDir = 0, zeros = 0;
  for (let i = 1; i < vals.length; i++) { const d = Math.sign(vals[i] - vals[i - 1]); if (d !== 0 && lastDir !== 0 && d !== lastDir) rev++; if (d !== 0) lastDir = d; }
  for (const v of vals) if (v === 0) zeros++;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length, max = Math.max(...vals);
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  return { mean: +mean.toFixed(2), max, rev, zeros, sd: +Math.sqrt(variance).toFixed(2) };
}

const SEEDS = [1, 7, 42, 99, 123, 256, 512, 1000];
let onRev = 0, offRev = 0, onMean = 0, offMean = 0, onZero = 0, offZero = 0, n = 0;
for (const seed of SEEDS) {
  const on = run(seed, 140, false), off = run(seed, 140, true);
  // align the comparison window to where the apex regime begins (apex on)
  const start = on.apexAppeared.findIndex(x => x > 0);
  if (start < 0) { console.log(`seed ${seed}: no apex ever — skipped`); continue; }
  const onG = stats(on.grazerN.slice(start)), offG = stats(off.grazerN.slice(start));
  console.log(`seed ${String(seed).padStart(4)}: apex-ON  graz mean=${onG.mean} sd=${onG.sd} max=${onG.max} reversals=${onG.rev} zeros=${onG.zeros} distinctHerds=${on.distinctHerds}`);
  console.log(`           apex-OFF graz mean=${offG.mean} sd=${offG.sd} max=${offG.max} reversals=${offG.rev} zeros=${offG.zeros}`);
  onRev += onG.rev; offRev += offG.rev; onMean += onG.mean; offMean += offG.mean; onZero += onG.zeros; offZero += offG.zeros; n++;
}
console.log(`\n=== AGGREGATE over ${n} seeds (post-apex window) ===`);
console.log(`apex-ON : mean grazers=${(onMean / n).toFixed(2)}  mean reversals=${(onRev / n).toFixed(1)}  mean zero-turns=${(onZero / n).toFixed(1)}`);
console.log(`apex-OFF: mean grazers=${(offMean / n).toFixed(2)}  mean reversals=${(offRev / n).toFixed(1)}  mean zero-turns=${(offZero / n).toFixed(1)}`);
console.log(`\nverdict: apex ${onMean < offMean ? 'LOWERS' : 'raises'} herd mean (${(onMean / n).toFixed(2)} vs ${(offMean / n).toFixed(2)}), ` +
  `${onRev > offRev ? 'ADDS' : 'removes'} oscillation (${(onRev / n).toFixed(1)} vs ${(offRev / n).toFixed(1)} reversals)`);
