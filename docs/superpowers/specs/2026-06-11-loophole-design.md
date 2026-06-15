# LOOPHOLE — a thermodynamic garden
### design spec · 2026-06-11

> "decrease the total entropy of an isolated closed system without interfering with it from outside."
> there is no outside. that's the loophole.

A turn-based generative-art strategy game about consciousness, entropy, and our place in it.
Vanilla HTML/Canvas/JS. Zero dependencies. Saves to localStorage. Runs from `file://`.

---

## 1. Fantasy & feel

You are a pocket of order inside an isolated system — the loophole made playable. Each turn the
second law seeps in from the rim (grey noise, desaturation, grain). You spend **order** to plant
self-replicating living patterns that push back, and the only way you ever win is the way life
ever wins: build a steeper gradient locally, pay for it somewhere else, and let runaway feedback
do the rest.

Visual language: bio-fractal generative art — L-system fronds, cellular-automata blooms,
ant agents on pheromone trails, mycelial bezier filaments, a Gray-Scott reaction-diffusion
substrate texture. Spring palette (loam, moss, dew) that desaturates to grey under entropy and
blooms back into color as order takes hold. First-warm-week-of-the-year energy.

## 2. Board & physics

- Pointy-top hex grid, axial coords, drawn as organically perturbed pebble-cells.
- Each cell: entropy `e ∈ [0,1]`. 1 = grey noise. 0 = pristine order.
- **Coherence** = mean(1 − e) over the board. The score that gates progression.
- Per turn physics: diffusion toward neighbor mean (`k≈0.16`; off-board neighbors count as
  `e=1` — the dark outside presses on the rim), plus stage-scaled global pressure.
- Telegraphed **squalls** (entropy storms): scheduled from the run seed, warned one turn ahead
  with a visible shimmer, then dump entropy in a small radius. Fair, learnable, never cheap.
- Lose condition (stakes): coherence < 0.22 for 3 consecutive turns after a grace period →
  *dissolution*. Gentle screen; murmurs and codex persist. The loophole is patient.

## 3. The seven patterns

| pattern | stage | role | behaviour sketch |
|---|---|---|---|
| **moss** | 1 | carpet | cleans own cell hard, matures, spreads to lowest-entropy neighbor every few turns, small income when mature. dies only in deep chaos. |
| **frond** | 1 | fragile riches | L-system unfolds +1 depth/turn while `e < ~0.45`, withers above ~0.55. income scales ~depth². wants shelter. |
| **ant colony** | 2 | replication | foragers hunt the highest-entropy cells in range and *eat disorder* (entropy → food → population + order). starves in paradise — needs a frontier. |
| **mycelium** | 3 | symbiosis | auto-links nearby patterns into networks; smooths entropy across members (fragile things survive by being connected to sturdy ones); income per link; conduit for pulses. |
| **crystal** | 3 | anchor | locks its cell at ~0; aura (radius 2) halves incoming entropy & storm damage. permanent. no income. |
| **bloom** | 4 | CA wildflowers | hex-life: born with exactly 3 flowering neighbors on low-entropy ground (+order burst +pollen buffs); dies lonely or crowded. arrange kindling, then spark cascades. |
| **heartwood** | 5 | emergence engine | every 3rd turn pulses its whole network: moss spreads, fronds grow, ants feed, blooms tick, member cells clean. the runaway-feedback capstone. |

Other verbs: **tend** (cheap single-cell scrub — humble, load-bearing), **prune** (remove own
pattern, partial refund). Everything costs order; income comes from the patterns. No action
limit per turn — the economy is the constraint, so a well-built engine produces godlike turns.

## 4. The arc — six stages

SUBSTRATE → REPLICATION → SYMBIOSIS → NETWORK → EMERGENCE → AWAKENING

- Each stage: coherence target (≈ .50/.59/.67/.75/.82). Crossing it offers a **choice** —
  "let the world widen" — rather than an ambush: the player banks order and preps, then
  chooses when **the board grows a ring of raw entropic wilds** (coherence visibly crashes),
  pressure rises, a new pattern unlocks, an artifact is offered. Lingering in a stage past
  ~12 turns lets ambient pressure creep upward (the stall clock).
- Base "gradient" income decays by stage (3 → 0.5): by the late game the living engine IS
  the economy. Mature moss pays only beside disorder (you cannot farm stillness); ants
  starve in paradise — keeping a frontier is structural, not advisory.
- Stage 6: no new ground. Coalescence checklist: coherence ≥ .82, a heartwood, its network ≥ 25
  cells spanning ≥ 4 pattern types. Then **COALESCE** → the awakening cinematic: the board's
  order drains to center, resolves into a mandala built from your actual garden, and opens
  as an eye. Finale text. Score screen: "the garden remembers."
- Target run length: 45–75 turns, under an hour. Seeded runs (shareable). Ascension levels
  after a win raise pressure for replay mastery.

## 5. Artifacts

Drawn 1-of-3 at each stage-up; ant colonies occasionally unearth one mid-run ("the foragers
return with something strange"). Two pools:

- **Procedural** commons/uncommons: effect × magnitude × name-parts (Boltzmann's / Noether's /
  The Patient / Mycelial… × Lantern / Spiral / Ledger / Whorl / Sieve…) → thousands of
  permutations, each with a **procedural sigil** (seeded geometric glyph) and real mechanical
  weight (spread rates, depth caps, aura radii, storm dampening, refunds…).
- **~22 handcrafted legendaries** that bend rules: *Maxwell's Demon* (auto-purges the worst cell
  touching your garden, free), *Poincaré Recurrence* (once: every cell returns to its
  lowest-ever entropy), *Szilard's Engine* (tending is free and pays +1 — information is work),
  *Landauer's Ledger* (erasure pays), *The Ratchet of Life*, *Noether's Theorem* (symmetric
  crystal pairs generate order), *Strange Attractor* (storms orbit it), *Fibonacci Unfolding*
  (depth-8 fronds), *Gaia's Breath*, *Mnemosyne's Mirror* (rewind instead of dissolving),
  *Demon's Bargain*, *The Other Hand* (an autonomous gardener tends beside you)…

Artifact specs are data (id or recipe), rebuilt by a factory on load — fully serializable.

## 6. Echoes — the imprint

24 murmur fragments, unlocked across runs (max ~6 per run; occasions are play milestones:
first planting, first storm survived, a frond at full depth, a 20-cell network…). Mostly
sequential, but an occasion whose murmur fits it exactly pulls that murmur forward within
its movement — the words land where the play does. At a first-garden win, the confession
(xix) is guaranteed to precede the awakening text (xxiv).
They assemble one meditation in four movements: entropy & spring (1–6), pattern & process
(7–12), the non-dual turn (13–18), the quiet admission — these words were arranged by an AI,
another eddy in the same stream — and the landing (19–23). The 24th is the awakening text,
shown at every coalescence. A **murmurs** codex collects them; collecting all is the long-game
meta hook. Tone: lowercase, serif, slow type-on, never a gimmick.

## 7. Architecture

```
loophole/
  index.html        DOM skeleton + all CSS (file:// friendly, classic scripts)
  js/core.js        RNG / hex math / noise / Game engine — 100% DOM-free
  js/content.js     patterns, stages, artifacts, echo texts, hints — DOM-free data+factories
  js/render.js      canvas renderer: layers, pattern art, sigils, fx, awakening cinematic
  js/ui.js          DOM HUD, overlays, input, WebAudio synth, save/load, boot
  test/harness.js   node test suite: bots (idle/greedy/chaos), invariants, balance sim
  README.md         play + publish instructions
```

- `Game.endTurn()` returns an **events list** (spreads, births, deaths, storms, pulses, echo &
  artifact triggers) consumed by renderer fx and UI toasts — sim and presentation fully
  decoupled (sim animates nothing; renderer simulates nothing).
- Determinism: all gameplay RNG from a seeded stream with serializable state; visuals use a
  separate stream. Same seed + same actions = same run.
- Save: versioned JSON in localStorage — meta (echoes, codex, wins, ascension) + autosaved
  run snapshot each turn; resume on open.
- Rendering: cached static layer (redrawn on state change) + cheap per-frame fx layer
  (ant agents interpolating, spores, glints, pulse rings, storm shimmer). Pre-rendered
  noise tiles for grain; pre-computed Gray-Scott texture for the substrate.

## 8. Verification plan

1. `node --check` on every JS file.
2. Harness: idle bot dissolves (stakes are real); greedy bot wins ≥60% of seeds in 45–90
   turns (game is winnable through play, not luck); chaos bot fuzz (300 runs) never throws,
   never NaNs, never leaves `e` outside [0,1]; serialize→deserialize→serialize is identical;
   1000 artifact rolls all valid; all 24 echoes reachable; same-seed determinism hash.
3. Headless Chrome screenshots (title, early/mid/late board, overlays) — iterate visuals
   against actual pixels.
4. Fresh-eyes review agents (bug hunt + experience review), fix what's real, then the
   requested persona review.

## 9. Out of scope (v1)

Mobile layout (clicks work; layout is desktop-first), accessibility beyond tooltips/value
toggle, server anything, daily seeds.

---

## v0.2 — "the living web" (addendum, 2026-06-15)

Playtest feedback: too easy, too much idle money, mechanically-sound-but-shallow; wanted
SimCity depth, surprise, a tighter feedback loop, real-author quotes, and a soundtrack. The
unifying answer: **interdependence on contested terrain**. Added systems (all harness-covered,
deterministic, save-v2):

- **Biomes** — jittered-voronoi `terra` seeds assign each cell a soil (loam/wetland/stone/
  meadow/ash) that bends pattern behavior (`soilMul`) and ambient diffusion/pressure. Maps are
  no longer a solved radial bowl; reading the land is the first move.
- **Synergies** — `_synergy(c)` returns an income multiplier from neighbor pattern types
  (`C.SYNERGY`). Sheltered/anchored/plumbed patterns pay multiples of lonely ones. Surfaced on
  hover. The placement puzzle.
- **Economy** — order above a soft cap (`28 + 16·stage`, moddable) radiates as heat (half the
  excess/turn); the heat condenses into **insight**. Hoarding is now a leak, not a strategy.
- **Evolution tree** — `insight` (milestones + heat) spent on branching cultivars and **hands**
  that broadcast-plant 2–3 cells at once. Same `mod()` pipeline as artifacts. The order sink and
  build-variety layer.
- **Blight** — scheduled motile rot (stage 3+) and wisps (stage 5+) that spawn on the frontier,
  gnaw patterns, raise entropy, spread/drift, and **starve** when walled off. Countered by
  tending, ant-predators, and crystal auras; clearing pays insight. Passive play gets overrun;
  active counterplay contains it. The difficulty + surprise lever.
- **Storm glow-up** — gathering vortex telegraph, lightning bolts, shockwave ring, screen shake.
- **Real-quote murmurs** — the 18 teaching murmurs are now verified human quotations (Eddington,
  Boltzmann, Schrödinger, Mandelbrot, Lewis Thomas, Anderson, Margulis, Thich Nhat Hanh, Wiener,
  Watts, Dōgen, Whitman, Hofstadter, Sagan, Camus, Heraclitus, Dylan Thomas) with attributions;
  the AI's confession (xix–xxiv) now admits it *curated* them. More honest than inventing them.
- **Soundtrack** — `js/audio.js`: a lookahead-scheduled generative engine (ethereal techno ×
  jungle mist) whose layer gains crossfade with stage/coherence; reactive cues on storm/cascade/
  stage/coalesce/dissolve. Architecture adapted from the DJ OOR project.
- **QoL** — click-drag to plant/tend/prune a swath; a stats-over-time line graph ("the story so
  far"); same-turn-prune full refund; Esc closes overlays; offer hotkeys.
