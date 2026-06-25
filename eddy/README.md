# eddy

*a successor to LOOPHOLE — shape a finite material field with springs, seed life that captures order
against entropy, and read a living world you can trace back to your moves. named for Wiener's "we are
but eddies in a river": a dissipative structure, ordering what passes through before it goes.*

## the idea

You don't place creatures. You place **springs** (finite sources) and seed **life**, and the world
computes the rest. A few principles, embodied in the mechanism rather than illustrated:

- **A finite material field** of three elements — lumen (energy), mineral (structure), humus (decay).
  Diffusion only *mixes* (conserved); the field is rendered so **concentrated = vivid, diffuse = gray**
  — entropy you can see.
- **One primitive: a tagged `consume → produce` node.** Springs emit raw material; life eats a blend,
  keeps its ratio, excretes the surplus (producers → humus; decomposers *mineralize* humus → inorganic).
- **Life is the loophole.** It captures gradients and holds local order — a dissipative structure.
  **Maintenance dissipates** (energy leaves as heat), so the world is bounded by *flow, not stock*: it
  stays diverse and alive indefinitely instead of collapsing to a monoculture.
- **The food web extends itself.** Seed only a producer and a decomposer arises on its own from the
  waste. Two overlapping springs breed a third species in their overlap. **Life builds its own ground**
  (humus accretes into persistent soil — niche construction).

Full reasoning: `../docs/superpowers/specs/2026-06-24-loophole-loop-prototype-design.md`; the soul of
the dialogue that made it: `…-loophole-successor-genesis.md`; the findings: `DISCOVERIES.md`.

## run

```
node eddy/test/harness.js          # the deterministic sim, headless — the source of truth (36 assertions)
node eddy/test/shot.js [ticks] [name]   # render a world to eddy/shots/<name>.png (pure-JS, mirrors the shader)
open eddy/index.html               # play (WebGL2; runs from file:// or GitHub Pages, no build)
```

In the browser: pick a tool (**generator** / **primer** / **inspect** / **lens** / **pause** / **new**),
click the canvas. Place a spring, let its gradient bloom, drop a primer into the surplus, watch life take
and spread. Click **inspect** to read any creature (what it eats, makes, why it's that color); **lens**
toggles the raw material field. `space` pauses, `s` steps.

## architecture

A pure-JS **deterministic sim core** (Node-testable) + a browser-only **WebGL2 render/UI** layer that
draws sim state but never owns it. Determinism is the invariant; the headless harness is the truth.

```
js/rng.js         seeded RNG (mulberry32)
js/grid.js        geometry + element constants (W,H, LUM/MIN/HUM)
js/field.js       material field: conserved diffusion + soil accretion (Mode-2)
js/generators.js  finite-flux springs: radial/vein projections, additive overlap, optional reservoir
js/life.js        entities: latch → Mode-1 metabolism → replicate/mutate → die→mineralize; upkeep dissipates
js/fertility.js   ambient abiogenesis where surplus is rich
js/sim.js         authoritative tick() + serialize/deserialize
js/persist.js     localStorage save/load behind a thin interface (backend-swappable)
js/content.js     procedural names + the murmurs (real, attributed)
js/render.js      WebGL2: field texture + entity sprites + the lens   (browser only)
js/ui.js          toolbar, place/seed/inspect, lens toggle            (browser only)
js/main.js        webgl bootstrap + the auto-tick/pause/step loop      (browser only)
test/harness.js   the headless proof
test/shot.js      headless PNG renderer (lets the loop SEE the world)
```

## what's proven (headless)

Determinism · conservation *with the dissipation sink* · the edge-of-chaos live band across seeds ·
long-run diversity (3 guilds hold past 1500 ticks, no monoculture) · the food web self-extending ·
the combinatorial overlap niche · soil accretion (conserved) · finite-spring depletion · and — via the
headless renderer — that the world is **legible** (resource blooms, distinct creatures in niches, a
colony grazing its own bloom). See `shots/` and `DISCOVERIES.md`.

## open threads

1. **Visual check of the live page** — the loop verifies the *design* via headless PNGs but cannot run
   the actual WebGL; open `eddy/index.html` to confirm the GL code itself draws + the feel.
2. The **full biogenic legacy** — energy-aware soil release so accreted ground can revive a dead patch,
   not just feed the matter-cycling guilds (soil is matter; lumen is energy, gone when a spring dries).
3. **Compounds & the co-evolution layer** (recalcitrant resources only a "cracker" species can eat);
   the **rules/incentive layer**; the player-seed-on-bare-ground feel.

*The game does not depict its themes. It is them — entropy, dissipation, the loophole — in code.*
