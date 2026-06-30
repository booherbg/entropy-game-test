# bloom — Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, overnight autonomous run) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the bloom prototype — a pixel-art garden where you coax a flowering mother tree and a pollinator colony into a co-evolving symbiosis and *watch* a random, fumbling lock-and-key drift into an exquisitely-matched pair, legibly and gorgeously, with levers you can grab.

**Architecture:** Vanilla HTML/Canvas/JS, zero deps, no build step. A deterministic, seeded, CPU-authoritative sim lives in `bloom/js/*.js` modules using the eddy browser+node pattern (IIFE attaching to a global `B`, plus `module.exports = B`), so the *same files* run under Node for the assertion harness and in the browser for play. The pixel world renders to an offscreen low-res buffer scaled up crisp (nearest-neighbour); dashboards are SVG. A pure-Node PNG renderer (ported from `eddy/test/pngutil.js`) verifies the visible merge headless.

**Tech Stack:** HTML5 Canvas 2D, inline SVG, localStorage, Node (test harness only, no npm deps), mulberry32 RNG.

## Global Constraints

- **Zero dependencies. No build step. No server.** Vanilla HTML/Canvas/JS only. (spec §5)
- **Deterministic + seeded.** Same seed → same world; serialize→load identical. All randomness flows from `B.makeRng(seed)` (mulberry32). Never call `Math.random()` in sim code. (spec §7)
- **Browser+Node module pattern** for every `js/*.js` sim module: `;(function(root){ 'use strict'; const B = root.B = root.B || {}; /* ... */ if (typeof module !== 'undefined' && module.exports) module.exports = B; })(typeof globalThis !== 'undefined' ? globalThis : this);`
- **Sim logic and render are separate.** Sim modules never touch `document`/`canvas`. Render modules are thin views over sim state.
- **Two currencies only: nectar (energy) + pollen (material).** Embodied as colour/light. Do NOT reintroduce eddy's lumen/mineral/humus abstractions. (spec §3.4)
- **The shared palette** (pixel-art, 8 indices): `['#e0604c','#f0b870','#ecd24a','#9fd98f','#5fc0a8','#6fb0f0','#9a7bd0','#e08ac0']`. Colour = energy = life against the dark loam ground. (mechanisms HTML)
- **Legibility is king.** Every number the player sees must be explainable on screen. Warm-start the opening (a fumbling pair already alive). Never a fight for survival — gentle upkeep only. (spec §1, eddy critique)
- **Leave `loophole/` and `eddy/` intact.** Build only in `bloom/`.
- **Loop discipline:** finding/feature-per-commit; harness green before each commit; headless PNG for visual checks.

**Reference code already exists and is proven** in `docs/bloom-mechanisms.html`: `regionIndex(r,θ)` polar expression (Mechanism 1·b), lock-and-key co-evolution (Mechanism 2), beacon foraging + stigmergy (Mechanism 3), and the SVG dashboards (Mechanisms 4–5). Port and harden it; don't reinvent it.

**Namespace map:** `B` is the global. Keys: `B.makeRng`, `B.PAL`, `B.W/H` (world cells), `B.makeField`, `B.Genome`, `B.makePlant`, `B.makeFlower`, `B.makePollinator`, `B.makeColony`, `B.makeSim`, `B.match`, `B.Render` (browser), plus test-only PNG util in `bloom/test/pngutil.js`.

---

## Task 1: Scaffold + RNG + palette + harness skeleton

**Files:**
- Create: `bloom/index.html` (minimal stub for now), `bloom/js/rng.js`, `bloom/js/const.js`, `bloom/test/harness.js`, `bloom/README.md`

**Interfaces:**
- Produces: `B.makeRng(seed) → ()=>[0,1)`; `B.PAL` (8 hex strings); `B.W`, `B.H` (ints, world cell dims — start 96×64); `B.TAU`.

- [ ] **Step 1: Write failing test** in `bloom/test/harness.js`: require `../js/rng.js`; assert same seed → identical 3-value stream, values in [0,1), different seed differs. Assert `B.PAL.length === 8` and `B.W>0 && B.H>0` after requiring `../js/const.js`.
- [ ] **Step 2: Run** `node bloom/test/harness.js` → FAIL (modules missing).
- [ ] **Step 3: Implement** `rng.js` (port mulberry32 from `eddy/js/rng.js`, namespace `B`) and `const.js` (`B.TAU=Math.PI*2`, `B.W=96`, `B.H=64`, `B.PAL=[...]`).
- [ ] **Step 4: Run** `node bloom/test/harness.js` → PASS.
- [ ] **Step 5: Commit** `feat(bloom): scaffold — seeded rng, palette, harness`.

## Task 2: The field — pixel resource grid (light, sugar, nectar, pollen, trail)

**Files:**
- Create: `bloom/js/field.js`; Modify: `bloom/test/harness.js`

**Interfaces:**
- Produces: `B.makeField(rng) → field` with typed-array channels `light, sugar, nectar, pollen, trail` (each `Float32Array(W*H)`), and methods `idx(x,y)`, `get(ch,x,y)`, `add(ch,x,y,v)`, `diffuse(ch,rate)`, `decay(ch,rate)`, `total(ch)`, `lightAt(x,y)`. Light is a static gradient (brighter up/top = canopy sun) seeded at construction; trail diffuses+decays (stigmergy); nectar/pollen are local pools.

- [ ] **Step 1: Write failing tests:** (a) `diffuse('trail',r)` conserves total trail to 1e-3; (b) `decay` lowers total monotonically; (c) light gradient: `lightAt(x,0) > lightAt(x,H-1)`; (d) determinism: two fields same seed identical after 10 diffuse steps.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `field.js` (5-point diffusion like `eddy/js/field.js`, but per-named-channel; light precomputed gradient with mild seeded noise).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(bloom): the field — light/sugar/nectar/pollen/trail channels`.

## Task 3: The genome + the keystone expression (genome → bloom + decode-grid)

**Files:**
- Create: `bloom/js/genome.js`; Modify: `bloom/test/harness.js`

**Interfaces:**
- Produces:
  - `B.Genome.randomPlant(rng) → g` with genes `{ symmetry(3..8 int), petalLength(0.45..0.98), petalSharp(1..6), coreSize(0.10..0.36), petalColor(0..7 int), guideColor(0..7 int), coreColor(0..7 int), guidePattern(0..7 int), beaconHue(0..1), nectarRate, pollenRate, sugarCost }`.
  - `B.Genome.randomKey(rng) → k` with `{ preference(0..1 beacon hue), decoder(Int8Array(N*N) of palette indices, N=6), forageRange, speed, dietBias }`.
  - `B.Genome.mutate(g, rng, rate) → g'` (clone + nudge one or few genes; ints step by ±1 wrapped/clamped; floats by small gaussian-ish; decoder flips a few cells).
  - `B.Genome.regionIndex(g, r, theta) → palette index or -1` (the polar expression, ported verbatim from mechanisms HTML Mechanism 1·b).
  - `B.Genome.decodeGrid(g, N=6) → Int8Array(N*N)` — the flower's fingerprint: for each (i,j), sample `regionIndex` at `r=(i+0.5)/N*petalLength`, `theta=-π/sym+(j+0.5)/N*(2π/sym)`; map -1→a fixed EMPTY sentinel (8).
  - `B.match(decoder, grid, N=6) → [0..1]` — fraction of cells equal (exact palette-index match), the lock-and-key fit.

- [ ] **Step 1: Write failing tests:**
  - `regionIndex` determinism + range: returns ints in [-1,7] for a grid of (r,θ) samples; core region (r<coreSize) returns `coreColor`.
  - `decodeGrid(g)` deterministic for fixed g; length N*N.
  - `mutate` changes ≥1 gene but keeps it in-range; `mutate` of a plant genome shifts its `decodeGrid` by a *small* number of cells (locality: a single-gene nudge changes ≤ ~1/3 of the grid, not all of it) — this is "smooth visible drift."
  - `match(decoder, decoder) === 1`; `match` of two random keys ≈ 1/9 ± slack (genuinely "fumbling").
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `genome.js` porting `regionIndex` exactly (the `petalWave=(cos(θ·sym)+1)/2`, `reach=coreSize+(petalLength−coreSize)·wave^petalSharp`, banded guide via `(guidePattern>>band)&1`). EMPTY index = 8 so empty cells can still match empty cells.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(bloom): the genome — polar expression, decode-grid, match (the keystone)`.

## Task 4: The plant — grows from genome, photosynthesizes, builds flowers

**Files:**
- Create: `bloom/js/plant.js`; Modify: `bloom/test/harness.js`

**Interfaces:**
- Produces: `B.makePlant(genome, x, y, rng) → plant` with state `{ genome, x, y, sugar, biomass, flowers:[], age, niches:1 }` and methods:
  - `tick(field)` — photosynthesis: `sugar += k * field.lightAt(x,y) * canopy`; spends sugar on growth (biomass up to a cap) and on building/maintaining flowers; each flower restocks `nectar`/`pollen` pools from sugar per its genome rates; respiration leaks a little sugar (2nd law).
  - `flowers()` — array of flower objects (see Task 5).
  - `growNiche(rng)` — if `sugar > NICHE_COST`, spend it, push a second flower with a mutated genome (different beaconHue/grid) at a different offset; `niches++`. (Proves §3.7's 1→2.)
  - `setSeed(flower)` — called by pollination; accumulates toward a seed; on threshold, `reproduce()` yields a child genome (parent mutated).
  - `reproduce(rng) → childGenome | null`.

- [ ] **Step 1: Write failing tests:** (a) a plant in light gains sugar over 50 ticks; (b) with zero light sugar does not grow unbounded (bounded, respiration caps it); (c) plant builds ≥1 flower within N ticks given sugar; (d) `growNiche` adds a 2nd flower and costs sugar; (e) determinism: two plants same seed/genome identical after 100 ticks.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `plant.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(bloom): the plant — photosynthesis, flowers, niche growth`.

## Task 5: The flower / signal — beacon + grid + nectar/pollen pools + visit

**Files:**
- Create: `bloom/js/flower.js`; Modify: `bloom/test/harness.js`

**Interfaces:**
- Produces: `B.makeFlower(genome, x, y) → flower` with `{ genome, x, y, beaconHue, beaconIntensity, grid:Int8Array, nectar, pollen, pollenOnStigma, seedProgress, speciesId }` and:
  - `restock(amount)` — convert delivered sugar into nectar+pollen per genome rates.
  - `visit(key) → { nectar, pollen, pollination }` — `beaconMatch = 1 - |beaconHue - key.preference|` (circular); `gridMatch = B.match(key.decoder, grid)`; `eff = beaconMatch * gridMatch`; reward nectar/pollen `∝ eff` and drawn from pools (capped by what's available); `pollination = eff` (used by the visiting pollinator to deposit prior-flower pollen → setSeed). Mismatch → fumbling (little reward).

- [ ] **Step 1: Write failing tests:** (a) a perfectly-matched key (decoder=grid, preference=beaconHue) extracts more nectar than a random key on the same flower; (b) `visit` never returns more nectar than the pool holds; (c) `eff∈[0,1]`; (d) a fresh-stocked flower's `visit` depletes its pool (collect works).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `flower.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(bloom): the flower — beacon, grid, visit reward = beaconMatch×gridMatch`.

## Task 6: The pollinator — forage loop (find→decode→collect→return)

**Files:**
- Create: `bloom/js/pollinator.js`; Modify: `bloom/test/harness.js`

**Interfaces:**
- Produces: `B.makePollinator(key, x, y) → bee` with state `{ key, x, y, mode('out'|'home'), nectar, pollen, pollenOnBody, prevSpecies, target, age, energy }` and `tick(field, flowers, colony, rng)`:
  1. `out`: if no target or occasional re-pick, choose flower by `score = beaconMatch(key.pref, f.beaconHue)*2 + trailAt(f)*0.5 - dist*0.001` within `forageRange`; move toward it.
  2. on arrival: `r = f.visit(key)`; take `r.nectar`/`r.pollen`; deposit `pollenOnBody` (from `prevSpecies`) → if same species as `f`, `f.setSeed(r.pollination)`; pick up fresh pollen-on-body tagged `f.speciesId`; switch to `home`.
  3. `home`: move toward colony, lay trail (`field.add('trail',x,y, q)` where q∝last reward); on arrival deposit nectar+pollen into colony; rest; back to `out`.
  4. energy: spend per move (speed cost); gain from carried nectar; `age++`; die if too old or starved (returns `false` from tick when dead).

- [ ] **Step 1: Write failing tests:** (a) a bee whose `preference` matches a nearby flower's beacon reaches it and returns carrying nectar within K ticks; (b) returning bee raises colony nectar store; (c) bee lays trail (field trail total rises after a home trip); (d) determinism.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `pollinator.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(bloom): the pollinator — beacon forage, decode, pollinate, trail home`.

## Task 7: The colony — store, upkeep, stigmergic spawn

**Files:**
- Create: `bloom/js/colony.js`; Modify: `bloom/test/harness.js`

**Interfaces:**
- Produces: `B.makeColony(x, y, rng) → colony` with `{ x, y, nectar, pollen, bees:[], population }` and:
  - `deposit(nectar, pollen)` — intake to stores.
  - `tick(field, rng)` — upkeep spends nectar per bee (empty → a bee starves: gentle pressure); if `pollen > LARVA_COST && nectar > LARVA_NECTAR`, spend both → spawn a new pollinator whose `key` is a **mutation of the best-fed recent forager's key** (pollen = machinery; well-fed keys reproduce → keys drift toward flowers); cap population.
  - `bestKey()` — the key of the highest-yield recent forager (for inheritance).

- [ ] **Step 1: Write failing tests:** (a) `deposit` raises stores; (b) with ample stores, `tick` spawns a bee and spends pollen+nectar; (c) with empty nectar and bees present, a bee starves (population drops) — but never instantly to zero (gentle); (d) a spawned bee's key is within mutation distance of `bestKey()`; (e) determinism.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `colony.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(bloom): the colony — store, upkeep, pollen→larvae spawn (stigmergy)`.

## Task 8: The sim — owns the world; tick; selection; serialize; determinism

**Files:**
- Create: `bloom/js/sim.js`; Modify: `bloom/test/harness.js`

**Interfaces:**
- Produces: `B.makeSim(seed, opts) → sim` with `{ field, plants:[], colonies:[], pollinators:[], tickCount, seed }` and:
  - `tick()` — order: field diffuse/decay → each plant tick (photosynthesis, restock flowers, maybe set seed→reproduce a new plant whose grid is parent-mutated → **grids drift toward keys**) → each pollinator tick → each colony tick (spawn → **keys drift toward grids**). Deterministic.
  - `stats()` → `{ plants, pollinators, colonyPop, meanFit, nectarTotal, pollenTotal }` where `meanFit` = mean over (bee,nearest-pref flower) of `beaconMatch*gridMatch` (the headline merge metric).
  - `warmStart()` — seed a sapling with one crude flower + a colony of ~12 bees with random keys, mid-scene, so the opening is alive and fumbling (no cold open).
  - `serialize() → json` / `B.loadSim(json) → sim`.

- [ ] **Step 1: Write failing tests:** (a) `makeSim(7).warmStart()` then 200 ticks: `stats().plants>0 && stats().pollinators>0` (nothing dies instantly); (b) determinism: two sims seed 7, 300 ticks, identical `stats()`; (c) serialize→load→tick matches a never-serialized twin (round-trip identity); (d) **energy bounded:** over 1000 ticks `nectarTotal` and `pollenTotal` stay finite and below a sane cap (no runaway).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `sim.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(bloom): the sim — one world, deterministic tick, serialize`.

## Task 9: The SOUL TEST — co-evolution reduces mismatch (the merge), measured

**Files:**
- Create: `bloom/test/soul.js`; Modify: `bloom/js/colony.js`, `bloom/js/plant.js` as needed to make it pass (tune selection pressure/mutation)

**Interfaces:**
- Consumes: `B.makeSim`, `sim.stats().meanFit`.
- Produces: a standalone `node bloom/test/soul.js` that runs a sim from a **random, badly-matched** start and asserts the merge.

- [ ] **Step 1: Write the test:** `makeSim(seed).warmStart()`; record `meanFit` at tick 0; run N generations (a few thousand ticks); assert final `meanFit` is **meaningfully higher** than initial (e.g. `final > initial + 0.2` and `final > 0.6`), averaged over ≥3 seeds. Also assert the one-sided lever: with a flower grid **locked**, the colony's mean decoder→that-grid match rises over time.
- [ ] **Step 2: Run** `node bloom/test/soul.js` → likely FAIL first (selection too weak / mutation too strong).
- [ ] **Step 3: Tune** selection (well-fed→reproduce bias) and mutation rate until the merge is robust across seeds, WITHOUT making it a fight for survival (populations persist). Keep it deterministic.
- [ ] **Step 4: Run** → PASS across seeds. Print the merge curve numbers.
- [ ] **Step 5: Commit** `feat(bloom): the soul test — random fumbling pair co-adapts into a matched lock-and-key`.

## Task 10: Node PNG renderer — headless visual proof of the world + the merge

**Files:**
- Create: `bloom/test/pngutil.js` (port from `eddy/test/pngutil.js`), `bloom/test/shot.js`, `bloom/test/timelapse.js`

**Interfaces:**
- Produces: `encodePNG(w,h,rgb)`, `renderWorld(B, sim, scale) → {rgb,w,h}` (pixel field tinted by light/sugar/nectar/pollen + trails + flowers drawn from `regionIndex` + bees as tinted dots), `blit(...)`. `shot.js [ticks] [name]` writes one PNG; `timelapse.js` writes a strip of the run AND a side-by-side of a flower's decode-grid vs the colony's mean decoder at start vs end (the visible merge).

- [ ] **Step 1: Implement** `pngutil.js` (zlib PNG encoder is reusable as-is; rewrite `renderWorld` for bloom's field channels + flower sprites via `regionIndex` + bees).
- [ ] **Step 2: Run** `node bloom/test/shot.js 400 opening` and `node bloom/test/timelapse.js` → PNGs written to `bloom/shots/`.
- [ ] **Step 3: View** the PNGs (Read tool). Confirm: colourful, flowers look like flowers, bees visible, and the start-vs-end grid pair visibly converges. Iterate render math until it reads.
- [ ] **Step 4: Commit** `test(bloom): headless PNG — the world renders, the grids merge on screen`.

## Task 11: Browser render — the living world on canvas (offscreen low-res → crisp)

**Files:**
- Create: `bloom/js/render-world.js`; Modify: `bloom/index.html`

**Interfaces:**
- Produces: `B.Render.world(ctx, sim, scale)` — draws the field to an offscreen `ImageData` (low-res) then `drawImage` scaled with `imageSmoothingEnabled=false`; overlays flowers (generative pixel sprites from `regionIndex`, with a soft beacon glow), animated pollinators (2–3 frame wing flick; body tinted toward the beacon hue they prefer = camouflage you can read), trails (faint), colony ring (brightens with store). Mirrors `pngutil.renderWorld` colour math so headless == browser.

- [ ] **Step 1: Implement** `render-world.js` + wire a `<canvas>` and a rAF loop in `index.html` that boots `makeSim(seed).warmStart()` and renders.
- [ ] **Step 2: Headless-screenshot the real page** (the documented Chrome method: `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader`, an autobegin temp HTML, `dangerouslyDisableSandbox`) → confirm the canvas paints the world.
- [ ] **Step 3: Iterate** until beautiful: saturated-but-not-garish, dark loam ground, flowers gorgeous, bees alive.
- [ ] **Step 4: Commit** `feat(bloom): browser render — the living pixel world, animated`.

## Task 12: SVG dashboards — comprehension is the wonder

**Files:**
- Create: `bloom/js/render-dash.js`; Modify: `bloom/index.html`

**Interfaces:**
- Produces: `B.Render.dash(el, sim, history)` building inline SVG strings for:
  - **Lock-and-key fit** — the headline gauge (current `meanFit` %, word: fumbling/learning/specialising/native), plus the two grids (a representative flower's decode-grid vs the colony's mean decoder) side by side so the merge is literal.
  - **Trait-drift over time** — line graphs of meanFit, beaconHue spread, nectar/pollen ratio (from a rolling `history` the sim shell records each generation).
  - **Population over time** — plants, pollinators, colony size.
  - **Inspect-a-creature** — click a bee/flower → the "living machine" panel (recipe eats→process→makes, its grid/key, and a generated "why it looks this way" line) modelled on `docs/2026-06-30-living-machine-mockup.svg`.

- [ ] **Step 1: Implement** `render-dash.js` (port the gauge + grids from mechanisms HTML Mechanism 2; line graphs are simple polylines over `history`).
- [ ] **Step 2: Wire** a dashboard panel + click-to-inspect in `index.html`; record `history` each generation in the shell.
- [ ] **Step 3: Headless-screenshot** → confirm the dashboards read and the fit gauge tracks the soul test.
- [ ] **Step 4: Commit** `feat(bloom): SVG dashboards — fit gauge, trait drift, population, inspect`.

## Task 13: The levers — lock/release trait, plant, place colony, (wall/open)

**Files:**
- Create: `bloom/js/tools.js`; Modify: `bloom/index.html`, `bloom/js/sim.js`

**Interfaces:**
- Produces: `B.Tools` = `{ lockTrait(sim, flower, on), plant(sim, x,y, genome?), placeColony(sim, x,y), growNiche(sim, plant) }`; (wall/open included only if cheap — a boolean barrier channel on the field that blocks bee movement). A locked flower's grid does not drift (forces keys to chase it). Each tool is a clear mutation of sim state.

- [ ] **Step 1: Write a harness test:** locking a flower's grid then running generations raises the colony's decoder→that-grid match (one-sided convergence) — the §7 "lever works" assertion. (May already exist from Task 9; consolidate here.)
- [ ] **Step 2: Implement** `tools.js` + a toolbar in `index.html` (buttons + canvas click placement; lock toggles on the inspected flower).
- [ ] **Step 3: Verify** by eye headless + harness green.
- [ ] **Step 4: Commit** `feat(bloom): the levers — lock/release, plant, place colony, grow niche`.

## Task 14: The game shell — real-time + pause, warm-start, persistence, the imprint

**Files:**
- Create: `bloom/js/main.js`, `bloom/js/persist.js`, `bloom/js/content.js`; Modify: `bloom/index.html`, `bloom/css` (inline)

**Interfaces:**
- Produces:
  - `main.js` — the loop: real-time ticking (the world breathes on its own), a **pause** that freezes the sim for weighed moves (spec DNA #4), speed control, generation counter; boots warm-start; records `history`; autosaves.
  - `persist.js` — `save(sim)`/`load()` to localStorage (serialize), seed shareable in URL hash.
  - `content.js` — the **murmurs**: the Eddington/Boltzmann/Schrödinger/Dylan-Thomas/Heraclitus/Camus/Mandelbrot/Hofstadter epigraphs (from `loophole/shots/murmurs.png`), surfaced one at a time as the player hits milestones (first flower, first matched pair, first niche, first species split, first "native" fit); plus the in-world codex (life witnessed / unions / the AI imprint closer that quietly admits some words were arranged by an AI — "another eddy of order in the same stream"). Lands the soul of the original brief.
- The opening (warm-start) shows a fumbling pair already foraging, a one-line "coax them into a matched pair" nudge, and the fit gauge at ~15%.

- [ ] **Step 1: Implement** the shell, pause/play, persistence, and the murmurs/codex panel (a `?` or "murmurs" button, milestone-unlocked entries).
- [ ] **Step 2: Verify** a full session by eye (headless screenshots at intervals): open → coax → watch fit climb → grow a 2nd niche → a murmur unlocks. Autosave/reload restores state.
- [ ] **Step 3: Commit** `feat(bloom): the game shell — breathe/pause, save, the murmurs imprint`.

## Task 15: Mobile QA pass — responsive + touch

**Files:**
- Modify: `bloom/index.html` (CSS), `bloom/js/main.js` (touch handlers), render layout

- [ ] **Step 1:** Make layout responsive: canvas scales to viewport, dashboards stack below on narrow screens, controls become a touch-friendly bottom bar (big tap targets). `viewport` meta present. No horizontal scroll.
- [ ] **Step 2:** Touch: tap-to-inspect, tap-to-place, pinch/tap controls; pointer events not mouse-only.
- [ ] **Step 3:** Headless-screenshot at phone widths (e.g. 390×844) and tablet → confirm legible, nothing clipped, tap targets ≥44px.
- [ ] **Step 4: Commit** `feat(bloom): mobile — responsive layout + touch controls (QA pass)`.

## Task 16: SimCity-dev critique + iterate

**Files:**
- Create: `bloom/docs/2026-06-30-critique-simcity.md`; Modify: whatever the critique flags

- [ ] **Step 1:** Play through (headless run + screenshots) and critique through a **SimCity/Maxis game-designer lens** (the eddy critique-panel format): is there a clear goal in the first 30s? Can you tell what's going on (legibility)? Does steering feel causal? Is the merge a satisfying payoff? Is it beautiful? Cross-check against the **primary reference docs** (the spec's DNA principles, the murmurs themes, the living-machine + colony-ops mockups) — where stuck, re-read them.
- [ ] **Step 2:** Fix the top 3–5 findings (finding-per-commit).
- [ ] **Step 3:** Re-verify (harness green, soul test green, screenshots).
- [ ] **Step 4: Commit** each fix.

## Task 17: Deploy to gh-pages beside eddy

**Files:**
- (deploy mechanics; no source change)

- [ ] **Step 1:** Confirm harness + soul test green and the page loads clean headless.
- [ ] **Step 2:** Deploy `bloom/` → `<gh-pages>/bloom/` via the git-worktree method used for eddy (repo `booherbg/entropy-game-test`). Re-deploy after meaningful changes.
- [ ] **Step 3:** Note the live URL in `bloom/README.md`.
- [ ] **Step 4: Commit** `chore(bloom): deploy to gh-pages`.

---

## Verification (the spec's §7 contract — these must all be green)
- Energy bounded (Task 8). · The exchange closes — both persist, neither alone (Task 8/9). · Co-evolution reduces mismatch, quantified (Task 9, the soul). · The lock lever converges decoders one-sided (Task 9/13). · Determinism + serialize round-trip (Task 8). · Visual: colourful pixel art, generatively varied, dashboards read, the two grids visibly converge (Tasks 10–12).

**Prototype success = the soul test:** Blaine watches a random, fumbling, barely-surviving pair co-adapt into an exquisitely-matched, beautiful lock-and-key — chills, legible, gorgeous, and he can grab a lever and steer it.

## Self-review notes
- Every spec §6 component maps to a task: field→T2, genome→T3, plant→T4, flower/signal→T5, pollinator→T6, colony→T7, sim→T8, genetics/selection→T8/T9, render-world→T10/T11, render-dash→T12, tools→T13, harness→woven through. §3.7 niche→T4. §3.6 dashboards→T12. §4 aesthetic→T11. The imprint/murmurs (original brief soul)→T14. Mobile→T15. Critique→T16. Deploy→T17.
- Two currencies enforced in T5/T7 (nectar+pollen only). Determinism enforced every task. Warm-start (no cold open) in T8/T14. Legibility in T12. "Never survival combat" guarded in T7/T9 (gentle upkeep, populations persist).
