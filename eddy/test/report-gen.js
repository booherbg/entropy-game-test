'use strict';
// Generates a self-contained HTML executive report (images embedded as base64). node eddy/test/report-gen.js
const fs = require('fs');
const dir = __dirname + '/../shots/';
function img(name) {
  try { return 'data:image/png;base64,' + fs.readFileSync(dir + name).toString('base64'); }
  catch (e) { return ''; }
}
const timelapse = img('timelapse.png'), garden = img('play-garden-2000.png'), springs = img('springs.png');

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>eddy — status report</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;background:#0f1115;color:#e8e4da;font-family:Georgia,'Times New Roman',serif;line-height:1.6}
.wrap{max-width:860px;margin:0 auto;padding:34px 22px 70px}
h1{font-weight:normal;font-size:27px;margin:0 0 2px}.date{opacity:.5;font-size:13px;font-style:italic;margin-bottom:22px}
h2{font-weight:normal;font-size:19px;margin:34px 0 8px;border-bottom:1px solid #2c2f36;padding-bottom:5px}
h3{font-size:14px;margin:16px 0 4px;color:#c9772b;font-weight:normal;letter-spacing:.3px}
p{margin:9px 0}.lede{font-size:15px}
.verdict{border:1px solid #c9772b;background:rgba(201,119,43,.09);border-radius:9px;padding:16px 18px;margin:8px 0 6px}
.verdict b{color:#f0b870}
img{width:100%;border:1px solid #2c2f36;border-radius:7px;margin:10px 0 4px;display:block}
.cap{font-size:12px;opacity:.6;font-style:italic;margin:0 0 8px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{border:1px solid #2c2f36;border-radius:8px;background:#181b20;padding:12px 14px}
.card.good{border-color:#3a6}.card.weak{border-color:#a55}
.card h3{margin-top:2px;color:inherit}.card.good h3{color:#6fbf8a}.card.weak h3{color:#d98a8a}
ul{margin:6px 0;padding-left:20px}li{margin:5px 0}
.tag{display:inline-block;font-size:10px;text-transform:uppercase;letter-spacing:.5px;border-radius:10px;padding:1px 8px;margin-left:6px;vertical-align:middle}
.t-now{background:#c9772b;color:#10131a}.t-soon{background:#4a8;color:#10131a}.t-later{background:#3a4150;color:#cdd}
table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}th,td{text-align:left;padding:4px 8px;border-bottom:1px solid #23272e}th{opacity:.6;font-weight:normal;font-size:11px;text-transform:uppercase}
.metric{font-variant-numeric:tabular-nums}
code{background:#1c2027;padding:1px 5px;border-radius:4px;font-size:12px}
.foot{margin-top:30px;font-size:12px;opacity:.55;font-style:italic;border-top:1px solid #2c2f36;padding-top:12px}
</style></head><body><div class="wrap">

<h1>LOOPHOLE · the successor <span style="opacity:.5">(working name: eddy)</span></h1>
<div class="date">status report · 2026-06-25 · built autonomously from the depth-redesign spec</div>

<div class="verdict">
<p class="lede" style="margin-top:0"><b>Verdict: novel and genuinely neat — but right now a contemplative <i>toy</i> more than an engaging <i>game</i>.</b></p>
<p>The prototype proves the thesis it set out to prove: you tend conditions (springs) and a living, evolving, self-extending food web computes itself — legibly, deterministically, and thermodynamically honestly. The bones are far better than the parent's. But playing it surfaces the same shape of gap that started this whole redesign: <b>the depth is real but submerged</b> (it lives in the numbers, not the felt experience), and there is <b>no game layer yet</b> — no goals, tension, or visible drama. It's a beautiful living system you watch, not yet a game you play <i>against</i> something.</p>
</div>

<h2>The world, alive (a world's whole arc)</h2>
<img src="${timelapse}" alt="time-lapse">
<p class="cap">One world at ticks 120 → 450 → 1000 → 1800: birth (springs placed, gradients bloom) → flourishing (life fills the lumen/mineral/humus niches) → maturity (dense, diverse, the ground tinting with soil life built) → senescence (finite springs drain, blooms fade to gray, life thins). The dissipative thesis, visible: <i>without renewal, entropy reclaims.</i></p>

<h2>What's built &amp; proven</h2>
<p>A complete standalone game — vanilla JS + WebGL2, zero deps, deterministic — with a pure-JS sim core (Node-tested) and a browser render/UI layer. <b>36 headless assertions</b> green; everything on <code>main</code>.</p>
<ul>
<li><b>Finite material field</b> (lumen/mineral/humus) with conserved diffusion; entropy is visible (concentrated = vivid, diffuse = gray).</li>
<li><b>One primitive</b> — a tagged consume→produce node. Springs emit; life latches, metabolizes (Mode-1), excretes; decomposers mineralize.</li>
<li><b>The dissipative model</b> — upkeep dissipates, so the world is bounded by <i>flow not stock</i>; stays diverse indefinitely instead of collapsing to a monoculture.</li>
<li><b>The food web self-extends</b> (decomposers arise from waste, unscripted); <b>combinatorial niches</b> (a blend species between two springs); <b>life builds its own ground</b> (soil accretes — niche construction).</li>
<li><b>Finite springs</b> that run dry (stewardship stakes) and are now <b>legible</b> (markers that dim as they drain).</li>
<li>localStorage persistence, an inspector, the murmurs (real attributed words), a headless renderer + time-lapse. Scale validated: a 9×-larger map ticks in 7 ms.</li>
</ul>

<h2>What I found playing it</h2>
<p>I ran three sessions and actually watched them — rendered the worlds, read the species, traced the food web.</p>
<table><tr><th>session</th><th>what happened</th><th>read</th></tr>
<tr><td><b>garden</b><br>(3 springs)</td><td class="metric">slow start (2 alive for ~150 ticks) → rich mid-game (190 alive, all 3 guilds, ~25 generations deep, a real producers→decomposers→balance succession)</td><td>the good case — genuinely alive</td></tr>
<tr><td><b>minimal</b><br>(1 spring)</td><td class="metric">died to 0 early, recovered via fertility → a lumen monoculture (~70), decomposers flicker but don't hold</td><td>monotone — one element, one story</td></tr>
<tr><td><b>neglect</b><br>(walk away)</td><td class="metric">same early die-off → a stable 2-guild world (~109), no further change</td><td>self-sustaining but static</td></tr></table>
<img src="${garden}" alt="mature garden">
<p class="cap">The mature garden (≈140 alive, ~84 diet-variants, 3 guilds). It reads as <b>three colored clouds</b> in their niches — legible, atmospheric. But the 84 "species" and 25 generations of evolution are subtle shading, not felt: the depth is in the data, not the eye.</p>
<p><b>Boring? Neat? Novel?</b> &nbsp;<b>Novel — yes:</b> a truly emergent, conservation-honest, evolving, self-extending food web from an indirect lever is uncommon (most ecosystem games fake it). <b>Neat — yes, quietly:</b> placing conditions and watching life arrive, adapt, and balance is satisfying to contemplate. <b>Boring — also yes, as a <i>game</i>:</b> after setup there's little to do, nothing to push against, and the cleverest things (evolution, the food web extending) happen invisibly.</p>

<div class="cols">
<div class="card good"><h3>What works</h3><ul>
<li>Indirect stewardship is real — you place conditions, life self-organizes into niches.</li>
<li>Clear cause→effect at the guild level (spring → bloom → colony).</li>
<li>The food web genuinely <b>self-extends</b> and runs a succession.</li>
<li>Decisions matter: diverse springs → rich web; one spring → monotony.</li>
<li>The dissipative arc gives real stakes (tend the flow or entropy wins).</li>
<li>It's honest — conserved, deterministic, reproducible surprise.</li>
</ul></div>
<div class="card weak"><h3>What's weak</h3><ul>
<li><b>Slow, fragile start</b> — early seeds often die before taking; the first minute can read as dead.</li>
<li><b>Depth is submerged</b> — evolution &amp; the food web are invisible; no events, no journal, no food-web view.</li>
<li><b>No game layer</b> — no goals, tension, or things to do after setup. A screensaver, not a game.</li>
<li><b>Creatures are interchangeable dots</b> — the named diversity isn't visible; no forms, no behavior to watch.</li>
<li><b>Life never interacts with life</b> — it only eats the field, so there's no drama <i>between</i> creatures.</li>
</ul></div>
</div>

<h2>Backlog — research-grounded next moves</h2>
<p>Drawn from the project's own foundations (Holland's Echo, Kauffman's NK, Wolfram/Langton's edge of chaos, Bak's self-organized criticality, Ray's Tierra) and the playtest gaps. Roughly prioritized.</p>

<h3>1 · Life eats life — emergent relationships <span class="tag t-now">biggest lever</span></h3>
<p>The single highest-impact change. Today life only consumes the field. Give organisms <b>tags</b> (offers / needs / offense / defense) and one <b>tag-matched-exchange</b> primitive, and predation, parasitism, mutualism, and competition <i>emerge unprompted</i> — the same line of code with a different sign (Holland's Echo; Ray's Tierra evolved parasites no one designed). This is where the drama, the visible web, and "the wonder" come from — and the spec already calls for it.</p>

<h3>2 · Surface the emergence — make depth felt <span class="tag t-now">make it legible</span></h3>
<p>The richness exists but is invisible. Add <b>events</b> ("a decomposer arose," "extinction," "generation 20"), a <b>journal/codex</b> of species witnessed (the parent had one), and a <b>food-web view</b> (who eats whom). The titan critique's lesson: emergence must be <i>seen and attributed</i> or it reads as noise.</p>

<h3>3 · A game layer — goals &amp; a feedback clock <span class="tag t-soon">make it a game</span></h3>
<p>Give the player something to pursue and something to push against. <b>Aspects/lenses</b> (chase diversity, or order, or throughput — the parent's Weaver/Stiller/Burning), and a <b>pressure</b> (a blight that hunts your most-ordered cells; or self-organized-criticality <b>cascades</b> — Bak — so extinctions/blooms come in avalanches of all sizes, guaranteeing rare dramatic events).</p>

<h3>4 · Distinct creatures &amp; motion <span class="tag t-soon">legibility</span></h3>
<p>Render species as distinct <b>forms</b> (not just colored dots) and let them visibly <b>move/graze/interact</b> (Wolfram Class-4: persistent, mobile, interacting structures). Then the diversity and the web are watchable.</p>

<h3>5 · Compounds &amp; co-evolution <span class="tag t-later">depth</span></h3>
<p>Recalcitrant resources that lock up where blends concentrate and only a "cracker" species can crack open (lignin × white-rot). Weird emergent resource chains — already designed; was holding for your input.</p>

<h3>6 · Edge-of-chaos as a measured dial <span class="tag t-later">tooling</span></h3>
<p>Make coupling <b>K</b> a real dial and have the harness <i>measure</i> the edge of chaos — sweep for the band where diversity persists, loops close, and cascades go power-law. The game's soul as a measurable target, not a vibe.</p>

<h3>7 · Terrain &amp; the full biogenic legacy <span class="tag t-later">depth</span></h3>
<p>Give the field <b>topology</b> (channels, barriers, slopes) so <i>where</i> matters (chokepoints, the titan principle of structured space); and make accreted <b>soil</b> revive a patch, not just feed the matter-guilds (energy-aware release).</p>

<h2>What needs you</h2>
<ul>
<li><b>Your eyes on the live game</b> — open <code>eddy/index.html</code>; I can verify the design headlessly but not that the WebGL itself runs, nor the feel.</li>
<li><b>A steer on priority</b> — I'd start with #1 (life-eats-life) as the biggest lever for "is it a game," unless you want compounds or the game-layer first.</li>
</ul>

<p class="foot">eddy is a successor to LOOPHOLE — it does not depict its themes, it is them, entropy and dissipation and the loophole, in code. Built across ~12 autonomous iterations; the lab notebook (<code>eddy/DISCOVERIES.md</code>) holds the findings, the genesis doc the dialogue that made it.</p>
</div></body></html>`;

fs.writeFileSync(__dirname + '/../report.html', html);
console.log('wrote eddy/report.html (' + (html.length / 1024 | 0) + ' KB, self-contained)');
