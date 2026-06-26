'use strict';
// Generates a self-contained HTML executive report (images embedded as base64). node eddy/test/report-gen.js
const fs = require('fs');
const dir = __dirname + '/../shots/';
function img(name) {
  try { return 'data:image/png;base64,' + fs.readFileSync(dir + name).toString('base64'); }
  catch (e) { return ''; }
}
const timelapse = img('timelapse.png'), garden = img('play-garden-2000.png'), springs = img('springs.png'), rotshot = img('rot-firebreak.png');

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
<div class="date">status report · 2026-06-25 (continued) · built autonomously from the depth-redesign spec</div>

<div class="verdict">
<p class="lede" style="margin-top:0"><b>Verdict: it crossed from <i>toy</i> toward <i>game</i> this iteration — and it now has the receipts.</b></p>
<p>The thesis was never in doubt: you tend conditions and a living, evolving, self-extending food web computes itself — legibly, deterministically, thermodynamically honestly. What was in doubt was whether it's a <i>game</i>. Three new measurements answer yes. <b>Your choices move the score 3.8×</b> — a considered layout vastly out-flourishes a lazy one (it is not boring). <b>The world measures at the edge of chaos</b> — Wolfram Class&nbsp;4 with Bak self-organized-criticality cascades, on every seed. And <b>the hunter is now a keystone lever</b> (Paine 1966): cropping the dominant species <i>raises</i> diversity, so predation is strategy, not decoration. The newest, and the strongest "it's a game": an <b>antagonist that pushes back</b> — a rot that sweeps a monoculture end to end (89% culled) but <i>firebreaks</i> at the seams of a diverse world (39%), and now <b>strikes monocultures unbidden</b>. Played live, a uniform world lives a boom-bust life of rot and regrowth; a varied one is serene. Diversity is finally shield, immunity, and firewall — not just a number on a panel. A goal layer (three aspects + a flow economy) and a SimCity-style <b>advisor</b> read the world back to you. What still wants <i>you</i>: your eyes on the live WebGL build, and a depth that is <b>felt</b>, not only measured — to the naked eye the world is still three coloured clouds.</p>
</div>

<h2>The antagonist — diversity as a firebreak</h2>
<img src="${rotshot}" alt="the rot firebreaking at guild seams">
<p class="cap">A rot (the dark stain) lit in the gold lumen colony, mid-sweep: it has eaten that patch down to almost nothing — while the blue mineral colony (right) and green humus colony (top) sit pristine a few cells away. A fire of one guild's type can't cross into another, so a monoculture is swept end to end (89% culled) and a diverse world firebreaks it to a single patch (39%). Diversity, made into resilience you can see.</p>

<h2>The world, alive (a world's whole arc)</h2>
<img src="${timelapse}" alt="time-lapse">
<p class="cap">One world at ticks 120 → 450 → 1000 → 1800: birth (springs placed, gradients bloom) → flourishing (life fills the lumen/mineral/humus niches) → maturity (dense, diverse, the ground tinting with soil life built) → senescence (finite springs drain, blooms fade to gray, life thins). The dissipative thesis, visible: <i>without renewal, entropy reclaims.</i></p>

<h2>What's built &amp; proven</h2>
<p>A complete standalone game — vanilla JS + WebGL2, zero deps, deterministic — with a pure-JS sim core (Node-tested) and a browser render/UI layer. <b>59 headless assertions</b> green; everything on <code>main</code>.</p>
<ul>
<li><b>Finite material field</b> (lumen/mineral/humus) with conserved diffusion; entropy is visible (concentrated = vivid, diffuse = gray).</li>
<li><b>One primitive</b> — a tagged consume→produce node. Springs emit; life latches, metabolizes (Mode-1), excretes; decomposers mineralize.</li>
<li><b>The dissipative model</b> — upkeep dissipates, so the world is bounded by <i>flow not stock</i>; stays diverse indefinitely instead of collapsing to a monoculture. Confirmed steady to 6,000 ticks (soil overshoots a founder bloom, then settles to a plateau — not a slow death).</li>
<li><b>The food web self-extends</b> (decomposers arise from waste, unscripted); <b>combinatorial niches</b> (a blend species between two springs); <b>life builds its own ground</b> (soil accretes — niche construction).</li>
<li><b>Life eats life</b> — a heritable <code>pred</code> trait + a predation primitive; hunters roam down a prey-gradient, and <b>keystone predation</b> (Paine 1966) makes them crop the dominant species, lifting diversity <b>+15%</b> under sustained pressure.</li>
<li><b>A game layer</b> — three aspects to pursue (Weaver/diversity, Stiller/order, Burning/throughput) and a <b>flow economy</b> (springs cost; a flourishing world pays a dividend), so stewardship has a budget and a goal.</li>
<li><b>The antagonist — the rot</b> — a typed fire on the field that sweeps a monoculture (89% culled) but firebreaks at the seams between guilds (a diverse world loses one patch, 39%), and ignites in monocultures unbidden. Conserved, self-gating, a ☣ player tool; diversity becomes literal resilience.</li>
<li><b>The advisor</b> — a counsellor that reads the world and surfaces the single best move (tend a drying spring · drop a hunter to crop a crowd · overlap springs for a blend · or reads a thriving web back to you).</li>
<li><b>The soul, measured</b> — a criticality harness confirms Class-4 + self-organized criticality across seeds; a strategy bake-off confirms choices move flourish 3.8×.</li>
<li>Finite springs that run dry (legible markers that dim); localStorage persistence, an inspector, the chronicle (a narrated codex of species born/lost), the murmurs (real attributed words), a headless renderer + time-lapse. Scale validated: a 9×-larger map ticks in 7 ms.</li>
</ul>

<h2>What I found playing it</h2>
<p>I ran three sessions and actually watched them — rendered the worlds, read the species, traced the food web.</p>
<table><tr><th>session</th><th>what happened</th><th>read</th></tr>
<tr><td><b>garden</b><br>(3 springs)</td><td class="metric">slow start (2 alive for ~150 ticks) → rich mid-game (190 alive, all 3 guilds, ~25 generations deep, a real producers→decomposers→balance succession)</td><td>the good case — genuinely alive</td></tr>
<tr><td><b>minimal</b><br>(1 spring)</td><td class="metric">died to 0 early, recovered via fertility → a lumen monoculture (~70), decomposers flicker but don't hold</td><td>monotone — one element, one story</td></tr>
<tr><td><b>neglect</b><br>(walk away)</td><td class="metric">same early die-off → a stable 2-guild world (~109), no further change</td><td>self-sustaining but static</td></tr></table>
<img src="${garden}" alt="mature garden">
<p class="cap">The mature garden (≈140 alive, ~84 diet-variants, 3 guilds). It reads as <b>three colored clouds</b> in their niches — legible, atmospheric. But the 84 "species" and 25 generations of evolution are subtle shading, not felt: the depth is in the data, not the eye.</p>
<p><b>Boring? Neat? Novel?</b> &nbsp;<b>Novel — yes:</b> a truly emergent, conservation-honest, evolving, self-extending food web from an indirect lever is uncommon (most ecosystem games fake it). <b>Neat — yes, quietly:</b> placing conditions and watching life arrive, adapt, and balance is satisfying to contemplate. <b>Boring — less than it first looked:</b> a head-to-head bake-off of six strategies on the game's own score settles it — <b>a considered hand out-flourishes a lazy one 3.8×, and the diversity ceiling spans 6.4×</b> (one spring tops out at ~2 niches; three elements plus a humus vein reach ~15). The layout you draw sets the world's ceiling; overlap pays; the humus vein is a big unlock. The remaining boredom risk isn't <i>absence of consequence</i> — it's the post-setup lull and the invisibility of the cleverest moments (evolution, the web extending), which the next moves target.</p>

<p><b>And the soul is now a number.</b> A criticality sweep (5 seeds × 4,000 ticks) finds the world sitting at the edge of chaos: diversity persists (~13 niches, never frozen, never collapsing) <i>with</i> live turnover (~24 extinctions/run beneath the steady count), and the extinctions arrive in <b>Bak self-organized-criticality cascades</b> — heavy-tailed, ~2× concentrated over uniform, on every seed. Wolfram Class 4, measured, not vibed. (An honesty note worth keeping: the first pass over-counted species by their procedural <i>names</i> and read a flattering 87 niches / 3.4× — re-measured by real niche it is ~13 / 2.0×; the verdict survived the stricter metric, the magnitude didn't.)</p>

<div class="cols">
<div class="card good"><h3>What works</h3><ul>
<li>Indirect stewardship is real — you place conditions, life self-organizes into niches.</li>
<li>Decisions matter <b>measurably</b> — a considered layout out-flourishes a lazy one <b>3.8×</b> (bake-off).</li>
<li>The food web genuinely <b>self-extends</b> and runs a producers→decomposers succession.</li>
<li><b>Predation is a keystone lever</b> — a hunter cropping the dominant raises diversity (Paine); the ⚔ tool is strategy, not flavour.</li>
<li>The edge of chaos is <b>measured</b> — Class 4 + self-organized-criticality cascades, every seed.</li>
<li>It's honest — conserved, deterministic, reproducible surprise; the advisor reads it back to you.</li>
</ul></div>
<div class="card weak"><h3>What's weak</h3><ul>
<li><b>Unverified by a human eye</b> — none of the live UI (the advisor, the chronicle + cascades, the rot stain + ☣ tool, the score/economy panels) has run in a real browser; the headless renderer mirrors the shader, but the WebGL itself wants confirming.</li>
<li><b>Depth still mostly unseen</b> — the chronicle narrates births/extinctions, but there's no <b>food-web view</b>, and evolution is subtle shading, not a watchable form.</li>
<li><b>Creatures are interchangeable dots</b> — named diversity and ~25 generations of drift aren't legible as shape or behaviour.</li>
<li><b>A thriving world may be too serene</b> — the antagonist hunts the careless (monocultures), but a well-tended diverse world is now largely undisturbed; the accomplished player may want a pressure of their own.</li>
<li><b>The dramatic predator still needs a hand</b> — keystone hunting works, but a self-sustaining obligate predator (crash-and-recovery drama) wants a bigger, faster prey base.</li>
</ul></div>
</div>

<h2>Shipped this iteration</h2>
<p>Several of the last report's backlog items are now done, each with a finding in the lab notebook and tests in the harness:</p>
<ul>
<li><b>Life eats life</b> — predation primitive + a heritable <code>pred</code> trait + roaming hunters, then <b>keystone predation</b> (Paine) so it <i>raises</i> diversity. <span class="tag t-now" style="margin:0">was #1</span></li>
<li><b>A game layer</b> — three aspects to pursue + a flow economy + the <b>advisor</b>. <span class="tag t-soon" style="margin:0">was #3</span></li>
<li><b>The emergence, narrated</b> — the chronicle (events + a species codex) and the inspector. <span class="tag t-now" style="margin:0">part of #2</span></li>
<li><b>Edge of chaos, measured</b> — Class-4 + SOC, swept across seeds; and a strategy bake-off proving choices matter 3.8×. <span class="tag t-later" style="margin:0">was #6</span></li>
<li><b>The fragile start, fixed</b> — the opening pre-builds its gradient so the first seed takes; long-run stability confirmed to 6,000 ticks.</li>
<li><b>The antagonist — the rot</b> — a typed fire that sweeps monocultures, firebreaks at guild seams, and strikes the careless unbidden. <span class="tag t-now" style="margin:0">was #1</span></li>
</ul>

<h2>Backlog — research-grounded next moves</h2>
<p>Drawn from the project's own foundations (Holland's Echo, Kauffman's NK, Wolfram/Langton's edge of chaos, Bak's self-organized criticality, Ray's Tierra) and the playtest gaps. Re-prioritized.</p>

<h3>1 · Make the depth <i>felt</i>, not just measured <span class="tag t-now">biggest lever</span></h3>
<p>Now the biggest remaining lever. The richness is real and even <i>measured</i>, but the eye still sees three coloured clouds. Render species as distinct <b>forms</b> that visibly <b>move / graze / interact</b> (Wolfram Class-4 made watchable), add a <b>food-web view</b> (who eats whom), and surface the live criticality + the rot's spread. Emergence must be <i>seen</i> or it reads as noise. (Needs the browser — so it pairs with your visual pass.)</p>

<h3>2 · A pressure for the accomplished, &amp; the self-sustaining predator <span class="tag t-soon">felt tension</span></h3>
<p>The rot hunts the careless (monocultures), but a well-tended diverse world is now serene — perhaps too serene. Give the accomplished player a pressure of their own (a drought that wanders, a slow gradient decay, Bak <b>cascades</b> made felt). And finish the food web: an <b>obligate predator that sustains its own guild</b> (real crash-and-recovery, no re-seeding) — which still wants a bigger, faster prey base.</p>

<h3>3 · Compounds &amp; co-evolution <span class="tag t-later">depth</span></h3>
<p>Recalcitrant resources that lock up where blends concentrate and only a "cracker" species can crack open (lignin × white-rot). Weird emergent resource chains — designed, awaiting your steer on keeping principal simplicity.</p>

<h3>4 · Terrain &amp; the full biogenic legacy <span class="tag t-later">depth</span></h3>
<p>Give the field <b>topology</b> (channels, barriers, slopes) so <i>where</i> matters (chokepoints, structured space); and make accreted <b>soil</b> revive a dead patch, not just feed the matter-guilds (energy-aware release).</p>

<h2>What needs you</h2>
<ul>
<li><b>Your eyes on the live game</b> — open <code>eddy/index.html</code>. I can verify the design headlessly (and the renderer mirrors the shader), but not that the WebGL itself runs, nor the feel. This is the one thing I genuinely cannot do.</li>
<li><b>A steer on priority</b> — I'd start with #1 (an antagonist) as the biggest remaining lever for felt tension, then #2 (make it watchable). Compounds (#3) await your call on simplicity.</li>
</ul>

<p class="foot">eddy is a successor to LOOPHOLE — it does not depict its themes, it is them, entropy and dissipation and the loophole, in code. Built across many autonomous iterations; the lab notebook (<code>eddy/DISCOVERIES.md</code>) holds the findings — now including the soul, measured — and the genesis doc the dialogue that made it.</p>
</div></body></html>`;

fs.writeFileSync(__dirname + '/../report.html', html);
console.log('wrote eddy/report.html (' + (html.length / 1024 | 0) + ' KB, self-contained)');
