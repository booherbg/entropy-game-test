# loophole — a thermodynamic garden

> "decrease the total entropy of an isolated closed system without interfering with it from outside."
> there is no outside. that's the loophole.

A turn-based generative-art strategy game about entropy, consciousness, and our place in
both. Plant self-replicating living patterns — carpeting moss, fractal fronds, ant colonies
that eat disorder, mycelial networks, crystalline anchors, cellular-automata wildflowers,
a pulsing heartwood — across a living landscape of biomes, against the second law that seeps
back every turn. Read the land, weave the synergies, fight the rot, and build the runaway
feedback loops that let a pocket of order wake up.

**Vanilla HTML/Canvas/JS. Zero dependencies. No build step. No server.**

## play

Open `index.html` in a browser. That's it. Progress (murmurs, codex, ascension, and your
current garden) saves to localStorage automatically; close the tab mid-run and it will be
waiting. A generative soundtrack starts on your first click.

- click a card (or keys `1–7`), then a cell, to plant — **click-drag to plant or tend a whole swath**
- `T` tend · `X` prune · `Space` ends the turn · right-click clears your hand
- grey is disorder; color is order; **coherence** is how much of the world now holds together
- **read the land** — each cell's soil (loam/wetland/stone/meadow/ash) favors different patterns,
  and patterns earn by their neighbors (shelter, anchor, plumbing, pollen). hover to see both.
- **don't hoard** — order above a soft cap radiates as heat, some condensing into **✸ insight**.
  spend insight in **« cultivate »** on cultivars and extra *hands* that plant 2–3 at once.
- **rot** creeps from the frontier and gnaws your patterns — tend it, feed it to ants, wall it
  with crystals, or starve it. clearing it pays insight.
- cross a stage's coherence target and *you* choose when to **let the world widen**
- the murmurs you find — real words from Eddington, Dōgen, Whitman, Wiener and others, gathered
  by the game's own hand — persist across runs and assemble into something, eventually
- if coherence stays under 22% for three turns, the stream takes the garden back

A first winning run takes roughly 45–75 turns (under an hour). Seeds are deterministic —
share a seed to share a world. Winning unlocks **deeper spring** (harder ascension levels) —
and **invites you onward to the long game**, where an ecology you never planted arises from a
world tended to turn 100 (see *v0.4 — "the food web"* below).

## publish

The `loophole/` folder is the entire game:

- **itch.io** — zip the folder (`index.html` must be at the zip root), upload as an HTML
  game, set "this file will be played in the browser," viewport ≥ 1280×800.
- **GitHub Pages / Netlify / any static host** — drop the folder in as-is.
- **a friend** — send them the folder. It runs from `file://`.

The `test/` and `shots/` directories and the markdown files are not needed to ship —
include or strip them as you like.

## develop

- `node test/harness.js` — full suite: invariants, fuzz (chaos bot), winnability
  (greedy bot across seeds), dissolution stakes (idle bot), determinism, serialization
  roundtrip, artifact and echo systems. `--tune --seeds 48` for balance work.
- `bash test/shots.sh [state...]` — headless-Chrome screenshots of scripted game states
  into `shots/` (uses `?shot=` URL param; see `shotSetup` in `js/ui.js`).
- Architecture: `js/core.js` (DOM-free engine) + `js/content.js` (DOM-free data/factories)
  run in node and the browser; `js/render.js` (canvas), `js/audio.js` (generative WebAudio
  soundtrack — lookahead scheduler, zone-mapped layer gains), and `js/ui.js` (DOM/saves/input)
  are browser-only. The engine simulates nothing visual; the renderer simulates nothing.
- Save format is v2 (cells carry a soil index); v1 run snapshots are discarded on load,
  murmur/meta progress is kept.

## design notes

The design documents live at `docs/superpowers/specs/` (repo root): the founding design at
`2026-06-11-loophole-design.md`, the current as-built (through the food web) at
`2026-06-18-loophole-v04-as-built.md`, and the autonomous-loop method at
`2026-06-19-loophole-prime-directive.md`. The short version: every system is the theme. Moss income is gradient-gated —
you cannot farm stillness. Ants are Maxwell's demons that starve in paradise. Order you hoard
radiates away as heat (the second law, billing you). The win condition is integration *and*
differentiation: coherence, plus a heartwood, plus a 25-cell network weaving four kinds of
life. The murmurs are real human words — Eddington on entropy, Schrödinger on negative
entropy, Dōgen on forgetting the self, Wiener on patterns that perpetuate themselves — chosen
and arranged by the game's own hand, an AI that admits the curation in the final movement.

## v0.4 — "the food web"

Beyond the base garden lies **the long game** (choose it on the new-garden screen, or take the
awakening's invitation): no single waking, but a world tended toward turn 100 and scored on how *alive*
it becomes. Life you never planted **arises from your surpluses** — flora wearing their diet as colour,
establishing into **beds**; a rich meadow draws Reynolds-flocked **grazing herds** and **pollinators**;
a grazer and its long-grazed flower **merge into a coral** (*symbiogenesis*, Margulis's actual radical
claim); an **apex** thins the herds, and the pressure drives *more* union. When the web grows cooperative
enough, the meadow **becomes one** — a holobiont that recognises itself. A **flourishing** score rewards
cooperation over conquest, and a closing **thermodynamic capstone** resolves the loophole in real
non-equilibrium physics (a living world dissipates the gradient faster than bare rock — Schneider & Kay).
Deterministic and emergent; lives in `_ecology`/`_fauna`/`_symbiogenesis`/`_oneness` (core.js), the base
garden beneath it untouched. The lab notebook of what the simulation surprised us with is `DISCOVERIES.md`.

## v0.3 — "the metabolism"

The garden became a **dissipative structure** rather than an accumulator. Living patterns now
run on **❧ sap**: moss, ants and crystals *produce* it; fronds, blooms and the heartwood
*consume* it; **mycelium is the grid** that carries it. A consumer with no supply line starves
and wilts. The HUD shows your net flow (surplus feeds order, deficit starves). And the second
law now bills you for the order you hold — a rich garden seeps faster, so you can no longer
idle to victory; a built garden holds a plateau you must actively climb past. **Rites** —
expensive board-scale activations (spring surge, the quelling, genesis, the flood tide) — give
large order a home. Mobile got a full touch overhaul (pinch-zoom/pan, bottom-sheet rail).

Sap is visualized as luminous green pulses flowing through the mycelial grid; starving
consumers pulse a warning halo. Roadmap: action points, Civ eras + alternate win conditions,
genetics/weather micro-systems, a full psychedelic visual pass. See
`docs/superpowers/specs/2026-06-16-loophole-v03-metabolism.md`.

## v0.2 — "the living web"

Added on the v0.1 base: **biomes** (clustered soils that bend the rules; maps no longer a
solved radial bowl), **living synergies** (patterns earn by their neighbors), a hardened
**economy** (hoarded order radiates as heat → insight), an **evolution tree** (spend insight
on branching cultivars and extra *hands*), **blight** (motile rot and drifting wisps that
hunt the garden, countered by ants/crystals/tending/starvation), an upgraded **storm**
(vortex, lightning, shake), **drag-to-paint** input, a **stats-over-time** graph, real-quote
**murmurs**, and a generative **soundtrack**.
