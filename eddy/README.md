# eddy

*a successor to LOOPHOLE — shape a finite material field with springs, seed life that captures order
against entropy, and tend a living, evolving world you can read and trace back to your moves. named for
Wiener's "we are but eddies in a river": a dissipative structure, ordering what passes through before it
goes.*

## the idea

You don't place creatures. You place **springs** (finite sources), shape the **land**, and seed **life** —
and the world computes the rest. A few principles, embodied in the mechanism rather than illustrated:

- **A finite material field** of three elements — lumen (energy), mineral (structure), humus (decay).
  Diffusion only *mixes* (conserved); the field is rendered so **concentrated = vivid, diffuse = gray** —
  entropy you can see.
- **One primitive: a tagged `consume → produce` node.** Springs emit raw material; life eats a blend,
  keeps its ratio, excretes the surplus (producers → humus; decomposers *mineralize* humus → inorganic).
- **Life is the loophole.** It captures gradients and holds local order — a dissipative structure.
  **Maintenance dissipates** (energy leaves as heat), so the world is bounded by *flow, not stock*: it
  stays diverse and alive indefinitely instead of collapsing to a monoculture.
- **The food web extends itself.** Seed only a producer and a decomposer arises on its own from the waste.
  Two overlapping springs breed a third species in their overlap. **Life builds its own ground** (humus
  accretes into persistent soil — niche construction).
- **Life eats life.** A heritable `pred` trait + one predation primitive give hunters that roam down a
  prey-gradient. Predation is a **keystone** (Paine 1966): a hunter crops the most *abundant* prey, so it
  *raises* diversity instead of thinning everyone. And it can stand on its own — a **real kill** (the prey
  removed, a windfall) + a grazing trade-off make a **self-sustaining obligate predator** whose `pred` evolves
  to a stable equilibrium; the ⚔ tool is strategy, not decoration.
- **Life cooperates too — symbiogenesis** (Margulis). Two different-diet creatures sharing a cell can **merge
  into a composite** that eats both, fitter where their foods meet. The web extends by union, not only combat.
- **The world folds resources away — compounds.** Where humus piles too high it locks into recalcitrant
  **lignin** that ordinary life can't eat; a heritable `crack` trait then **evolves a white-rot specialist**
  that opens it — the food web reaching a resource that didn't exist until the world made it.
- **The planet keeps itself habitable — Gaia** (Lovelock & Margulis, as Daisyworld). A global climate drifts
  under a brightening sun; each creature's heritable **albedo** shifts its local temperature, and selfish local
  growth alone makes life's albedo **regulate the climate** back toward habitable — homeostasis, emergent (and
  it doesn't cost the edge of chaos).
- **An antagonist that pushes back — the rot.** A typed fire on the field that **sweeps a monoculture** but
  **firebreaks at the seams between guilds**: a uniform world is culled ~89%, a diverse one ~39% (one
  patch) and recovers. It also strikes monocultures *unbidden*. So **diversity is resilience** — shield,
  immunity, and firewall at once.
- **The land is a place.** Rock blocks diffusion (a spring in a **basin** pools richer), blocks life, and
  blocks the rot (a *built* firebreak alongside the living one). A fresh world arrives already a landscape.
- **A game on top.** Your objective: **draw out the world's turns** — the seven emergent phenomena it can take
  on its own (life eats life · a decomposer arises · the rot contained · an avalanche · two became one · a pack
  rises · the climate held). A row up top lights each as you evoke it. Underneath: pursue an **aspect**
  (weaver/diversity · stiller/order · burning/throughput), spend a finite **flow** budget, and read an
  **advisor** + a narrated **chronicle** (births, losses, milestones, cascades). An intro **onboards** the
  whole thing; reopen it with **?**.

Full reasoning: `../docs/superpowers/specs/2026-06-24-loophole-loop-prototype-design.md`; the soul of the
dialogue that made it: `…-loophole-successor-genesis.md`; the lab notebook of findings: `DISCOVERIES.md`.

## run

**Play it live:** https://blainebooher.com/entropy-game-test/eddy/ (WebGL2; deployed from `gh-pages`).

```
node eddy/test/harness.js          # the deterministic sim, headless — the source of truth (100 assertions)
node eddy/test/criticality.js      # measure the edge of chaos: Class-4 + self-organized criticality, swept across seeds
node eddy/test/strategy.js         # the bake-off: does layout matter? (a considered hand out-flourishes a lazy one 3.8x)
node eddy/test/playtest.js <scenario>   # play a scenario, narrated (garden|minimal|neglect|predator)
node eddy/test/shot.js [ticks] [name]   # render a world to eddy/shots/<name>.png (pure-JS, mirrors the shader)
open eddy/index.html               # play locally (WebGL2; runs from file://, no build)
```

In the browser, pick a tool and click the canvas:

- **◈ generator** — place a finite spring (element + radial/vein projection); it runs dry, so where & when matters.
- **✦ primer** — seed life into a surplus patch; it latches to the local blend. (On bare ground it starves — tend conditions first.)
- **⚔ hunter** — seed a hunter into a living colony; it eats other life (reads crimson) and, kept up, lifts diversity.
- **☣ rot** — loose a rot; it sweeps a monoculture but stalls at the seams between guilds — diversity is your firebreak.
- **▣ rock** — shape the land: lay rock to wall a basin (richer) or a firebreak (stops the rot); click rock to clear it.
- **◌ inspect** — read any creature: what it eats, makes, and *why* it's that color.
- **◉ lens** — toggle the raw material field · **◎ aspect** — cycle what you're pursuing · **? guide** — reopen the intro · **❚❚ / ▶** pause · **✛ new** world.

`space` pauses, `s` steps. The world auto-saves to localStorage.

## architecture

A pure-JS **deterministic sim core** (Node-testable) + a browser-only **WebGL2 render/UI** layer that draws
sim state but never owns it. Determinism is the invariant; the headless harness is the truth.

```
js/rng.js         seeded RNG (mulberry32)
js/grid.js        geometry + element constants (W,H, LUM/MIN/HUM)
js/field.js       material field: conserved diffusion + soil (Mode-2) + rot intensity + terrain (rock)
js/generators.js  finite-flux springs (radial/vein, overlap, reservoir) + procedural terrain
js/life.js        entities: latch → metabolism → replicate/mutate → die→mineralize; predation (keystone + the kill);
                  symbiogenesis; compounds/crack; Gaia (albedo + clime); the rot; upkeep dissipates
js/fertility.js   ambient abiogenesis where surplus is rich
js/sim.js         authoritative tick() + serialize/deserialize + spontaneous rot + the tools
js/persist.js     localStorage save/load behind a thin interface (backend-swappable)
js/content.js     procedural names + the murmurs (real, attributed)
js/chronicle.js   narrates the world: species born/lost, milestones, cascades, the codex
js/score.js       the aspects + the diversity/order/throughput/flourish score (shared E.speciesKey)
js/economy.js     the flow budget — a flourishing world pays; springs/hunters cost
js/advisor.js     a counsellor that reads the world and surfaces the one useful move
js/render.js      WebGL2: field texture (+ rot stain, rock) + entity sprites + the lens   (browser only)
js/ui.js          toolbar, place/seed/inspect/shape, lens toggle                          (browser only)
js/main.js        webgl bootstrap + the auto-tick/pause/step loop                          (browser only)
test/harness.js   the headless proof (100 assertions)
test/*.js         criticality · strategy bake-off · playtest · headless PNG renderer + report
```

## what's proven (headless)

Determinism · conservation *with the dissipation sink* · the food web self-extending · the combinatorial
overlap niche · soil accretion (conserved, stable to 6,000 ticks) · finite-spring depletion · **keystone
predation** + a **self-sustaining obligate predator** (the real kill) · **symbiogenesis** (complementary life
merges, conserved) · **compounds** (lignin locks away, a white-rot `crack` trait evolves to open it) · **Gaia**
(life regulates the climate against a brightening sun — homeostasis emergent, across a range of forcings) ·
**the rot** (sweeps a monoculture, firebreaks at guild seams; strikes unbidden, never a diverse world) ·
**terrain** (basins pool 1.6× richer, rock walls firebreak). And the soul itself, **measured**: the world sits
at the **edge of chaos** (Wolfram Class-4 + Bak self-organized-criticality, every seed), **player choices move
the score 3.8×**, and — verified holistically — the **full live configuration with every system at once stays
Class-4 + SOC**, all worlds alive and climate-regulated, drawing out 6/7 of its turns unprompted. **100
headless assertions.** See `shots/`, `report.html`, and `DISCOVERIES.md`.

## open threads

1. **The objective fork** — the goal is now legible ("draw out the world's turns"), but soft by design;
   whether to keep it a calm sandbox or push toward harder directed goals is the open curatorial call.
2. **The wild predator–prey cycle — measured closed.** The obligate predator damps to stable coexistence, and
   that turns out to be robust: enrichment (the paradox of enrichment) does *not* destabilize it into a limit
   cycle — the 2D spatial structure resolves the paradox (asynchronous patches cancel; richer = *more* stable,
   never near extinction). Space gives coexistence; the drama is local, the whole stays alive. Not a thing to
   "fix."
3. **A living, shifting map** — the world is an oasis (life clusters at springs; ~84% of the map stays empty
   and frozen). A uniform resource floor was tried and fails (it trivializes stewardship); a living macro
   picture would need *moving* heterogeneity or a disturbance→recolonization mosaic.
4. **The Red Queen** — prey defences don't yet evolve even under a real predator; diagnosed as needing a
   predation reshape where *incremental* armour buys *incremental* survival (a gradient, not a cliff).

*The game does not depict its themes. It is them — entropy, dissipation, the loophole — in code.*
