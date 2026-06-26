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
  *raises* diversity instead of thinning everyone — the ⚔ tool is strategy, not decoration.
- **An antagonist that pushes back — the rot.** A typed fire on the field that **sweeps a monoculture** but
  **firebreaks at the seams between guilds**: a uniform world is culled ~89%, a diverse one ~39% (one
  patch) and recovers. It also strikes monocultures *unbidden*. So **diversity is resilience** — shield,
  immunity, and firewall at once.
- **The land is a place.** Rock blocks diffusion (a spring in a **basin** pools richer), blocks life, and
  blocks the rot (a *built* firebreak alongside the living one). A fresh world arrives already a landscape.
- **A game on top.** Pursue an **aspect** (weaver/diversity · stiller/order · burning/throughput), spend a
  finite **flow** budget (a flourishing world pays a dividend; springs cost), and read an **advisor** + a
  narrated **chronicle** (species born, lost, and *cascades* — the self-organized-criticality avalanches).

Full reasoning: `../docs/superpowers/specs/2026-06-24-loophole-loop-prototype-design.md`; the soul of the
dialogue that made it: `…-loophole-successor-genesis.md`; the lab notebook of findings: `DISCOVERIES.md`.

## run

```
node eddy/test/harness.js          # the deterministic sim, headless — the source of truth (67 assertions)
node eddy/test/criticality.js      # measure the edge of chaos: Class-4 + self-organized criticality, swept across seeds
node eddy/test/strategy.js         # the bake-off: does layout matter? (a considered hand out-flourishes a lazy one 3.8x)
node eddy/test/playtest.js <scenario>   # play a scenario, narrated (garden|minimal|neglect|predator)
node eddy/test/shot.js [ticks] [name]   # render a world to eddy/shots/<name>.png (pure-JS, mirrors the shader)
open eddy/index.html               # play (WebGL2; runs from file:// or GitHub Pages, no build)
```

In the browser, pick a tool and click the canvas:

- **◈ generator** — place a finite spring (element + radial/vein projection); it runs dry, so where & when matters.
- **✦ primer** — seed life into a surplus patch; it latches to the local blend. (On bare ground it starves — tend conditions first.)
- **⚔ hunter** — seed a hunter into a living colony; it eats other life (reads crimson) and, kept up, lifts diversity.
- **☣ rot** — loose a rot; it sweeps a monoculture but stalls at the seams between guilds — diversity is your firebreak.
- **▣ rock** — shape the land: lay rock to wall a basin (richer) or a firebreak (stops the rot); click rock to clear it.
- **◌ inspect** — read any creature: what it eats, makes, and *why* it's that color.
- **◉ lens** — toggle the raw material field · **◎ aspect** — cycle what you're pursuing · **❚❚ / ▶** pause · **✛ new** world.

`space` pauses, `s` steps. The world auto-saves to localStorage.

## architecture

A pure-JS **deterministic sim core** (Node-testable) + a browser-only **WebGL2 render/UI** layer that draws
sim state but never owns it. Determinism is the invariant; the headless harness is the truth.

```
js/rng.js         seeded RNG (mulberry32)
js/grid.js        geometry + element constants (W,H, LUM/MIN/HUM)
js/field.js       material field: conserved diffusion + soil (Mode-2) + rot intensity + terrain (rock)
js/generators.js  finite-flux springs (radial/vein, overlap, reservoir) + procedural terrain
js/life.js        entities: latch → metabolism → replicate/mutate → die→mineralize; predation; the rot; upkeep dissipates
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
test/harness.js   the headless proof (67 assertions)
test/*.js         criticality · strategy bake-off · playtest · headless PNG renderer + report
```

## what's proven (headless)

Determinism · conservation *with the dissipation sink* · the food web self-extending · the combinatorial
overlap niche · soil accretion (conserved, stable to 6,000 ticks) · finite-spring depletion · **keystone
predation** (a hunter raises diversity +15%) · **the rot** (sweeps a monoculture, firebreaks at guild seams;
strikes monocultures unbidden, never a diverse world) · **terrain** (basins pool 1.6× richer, rock walls
firebreak) · and the soul itself, **measured**: the world sits at the **edge of chaos** (Wolfram Class-4 +
Bak self-organized-criticality, across seeds), and **player choices move the score 3.8×** (it is not boring).
A full-integration smoke test runs every mechanic at once. See `shots/`, `report.html`, and `DISCOVERIES.md`.

## open threads

1. **Visual check of the live page** — the loop verifies the *design* via headless PNGs but cannot run the
   actual WebGL; open `eddy/index.html` to confirm the GL draws and the feel (a lot of UI now rides on it:
   the advisor, the chronicle + cascades, the ☣ rot, the ▣ terrain).
2. **Make the depth *felt*** — render species as distinct *forms* that visibly move/graze/interact, and add
   a **food-web view**; the richness is real and even measured, but the naked eye still sees coloured clouds.
3. **Compounds & co-evolution** (recalcitrant resources only a "cracker" species can crack open) — designed,
   awaiting a steer on keeping principal simplicity.
4. **The obligate predator** (Lotka–Volterra crash-and-recovery) — diagnosed: blocked by prey *body-count*
   (the upkeep carrying capacity), so it needs a deliberately prey-rich regime — a core-balance choice.

*The game does not depict its themes. It is them — entropy, dissipation, the loophole — in code.*
