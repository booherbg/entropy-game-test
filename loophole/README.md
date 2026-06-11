# loophole — a thermodynamic garden

> "decrease the total entropy of an isolated closed system without interfering with it from outside."
> there is no outside. that's the loophole.

A turn-based generative-art strategy game about entropy, consciousness, and our place in
both. Plant self-replicating living patterns — carpeting moss, fractal fronds, ant colonies
that eat disorder, mycelial networks, crystalline anchors, cellular-automata wildflowers,
a pulsing heartwood — against the second law, which seeps back in every turn. Build the
runaway feedback loops that let a pocket of order wake up.

**Vanilla HTML/Canvas/JS. Zero dependencies. No build step. No server.**

## play

Open `index.html` in a browser. That's it. Progress (murmurs, codex, ascension, and your
current garden) saves to localStorage automatically; close the tab mid-run and it will be
waiting.

- click a card (or keys `1–7`), then a cell, to plant · `T` tend · `X` prune · `Space` ends the turn
- grey is disorder; color is order; **coherence** is how much of the world currently makes sense
- when you cross a stage's coherence target, *you* choose when to let the world widen
- artifacts are offered at each widening — and the ants occasionally dig one up
- the murmurs you find persist across runs and assemble into something, eventually
- if coherence stays under 22% for three turns, the stream takes the garden back

A first winning run takes roughly 45–75 turns (under an hour). Seeds are deterministic —
share a seed to share a world. Winning unlocks **deeper spring** (harder ascension levels).

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
  run in node and the browser; `js/render.js` (canvas) and `js/ui.js` (DOM/audio/saves)
  are browser-only. The engine simulates nothing visual; the renderer simulates nothing.

## design notes

The design document lives at `docs/superpowers/specs/2026-06-11-loophole-design.md`
(repo root). The short version: every system is the theme. Moss income is gradient-gated —
you cannot farm stillness. Ants are Maxwell's demons that starve in paradise. The win
condition is integration *and* differentiation: coherence, plus a heartwood, plus a 25-cell
network weaving four kinds of life. The words that surface as you play were arranged by an
AI — another eddy in the same stream — and the last few say so themselves.
