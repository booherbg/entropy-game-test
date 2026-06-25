# eddy — discoveries

*A lab notebook for the autonomous loop, inherited from LOOPHOLE. Findings about the **simulation's
own behaviour** — what it does that nobody designed — newest first. Not a changelog of features.
Design & soul: `docs/superpowers/specs/2026-06-24-loophole-successor-genesis.md`.*

---

## 2026-06-25 · the loophole is a leak — a world must live on a flow

The monoculture had a deeper teacher in it. A *perfectly conserving* world cannot hold a diverse web:
a closed cycle with no sink lets the most efficient recycler farm the standing stock to dominance. The
resolution was not to conserve harder but to **dissipate honestly** — maintenance, the cost of merely
persisting, now **leaves as heat** instead of recycling into humus. What a world can hold is then
bounded by what flows in (the springs) divided by what it costs to stay alive, exactly as a dissipative
structure must be (Prigogine; Schneider & Kay).

And the result is the thing we were after all along. At 1,500 ticks — where the conserving world had
become a humus monoculture of three thousand — the dissipative world holds **about a hundred lives
across all three guilds, indefinitely.** Producers, mineral-feeders, and the decomposers that arose
from their waste, all coexisting, none winning. *Diffusion still conserves — mixing moves order around
and destroys none. Life dissipates — it captures some order on the way past and lets the rest go.* That
is the loophole stated exactly: not a violation of the second law, but a structure that lives in its
current, ordering what passes through before it goes.

## 2026-06-25 · the food web extends itself — and then eats everything

Give a world only a lumen spring and a single lumen-eater, and wait: around **tick 367 a humus-eater
appears** — born, unscripted, from the waste the lumen-eaters excrete. The food web extends itself.
Nobody wrote a humus-eater; the world dreamed one because a niche opened in its own leavings. That is
the whole thesis, breathing on its own.

But run it longer and the dream sours. The humus-eaters do not just appear — they **take over**: by
tick ~800 the world is a near-monoculture of thousands, every other guild starved out. The cause is
exact and instructive. Matter here is perfectly conserved — and *a perfectly conserved closed cycle
has no sink*. Teaching decomposers to **mineralize** (humus → inorganic, so producer→humus→decomposer→
inorganic→producer closes the ring) helps — more guilds coexist early — but it cannot bound the whole:
with nothing leaving, the standing stock recirculates and feeds an ever-larger crowd until one guild
wins the recycling race.

The fix is the one the parent already knew by name: **a dissipative structure lives on a *flow*, not a
*stock*.** Energy must pass through and *leave*. So lumen — the light, the gradient, the sun — should
**dissipate when it is spent**, not be conserved into matter; while mineral and humus, true matter,
cycle. Then the world is bounded by what flows in (the springs), exactly as Schneider & Kay said a
living world is bounded by the gradient it dissipates. *That is the next build.* The web already
extends itself; now it must learn to die at the right rate.

## 2026-06-25 · the band holds across worlds

Four seeds, the same two springs, four hundred ticks each: **48, 49, 70, 84 lives; six to nine
coexisting diets; never zero, never the cap.** The edge of chaos is not a lucky seed — it is a
property of the rules. One wrinkle worth watching: the **field keeps accumulating** (about +6,300 over
each run) — the springs supply faster than fifty lives can drink, so the unspent material piles into a
growing reserve. The population stays bounded (upkeep sees to that), but a source is outpacing its
sink. Honest, for now. The eventual answer is life that builds on its own leavings (Mode-2
accumulation) or springs that run dry — both already named for later.

## 2026-06-25 · matter cannot leave by the back door

The first thing the simulation taught its builder was a correction. The plan let an organism's
**upkeep** simply decrement its biomass each tick — a number going down, the spent matter going
nowhere. The death-conservation test refused it: matter was vanishing. The fix was not a fudge factor
but the physics — **upkeep is respiration, and respiration returns matter to the world as humus.**
Once spent biomass was excreted rather than deleted, the whole cycle balanced to floating-point
precision: eat → keep your ratio → excrete the surplus → respire upkeep → split → die back into the
soil, and the books always close. The honesty wasn't decoration; it was load-bearing. *Boltzmann:
the struggle for existence is a struggle for entropy — and entropy is conserved bookkeeping, not free
lunch.*

## 2026-06-25 · upkeep is the carrying capacity

Left at its first guess, the world **exploded** — life reproduced to the population cap and pressed
against it, a green goo. The lever that tamed it was not a population limit (that is only a safety
net) but **upkeep**: the matter an organism must spend merely to persist. Raise it, and the
break-even intake rises with it, so the supply a region can offer divides into fewer sustainable
lives. At upkeep 0.15 the same two springs that produced goo now hold a **stable band — about fifty
lives, six coexisting diets, neither collapsing nor exploding, across four hundred ticks and every
seed tried.** The edge of chaos turned out to have an address, and it was metabolic cost. *Schneider
& Kay: life is a means of dissipating a gradient — and it can only dissipate as much as flows.*

## 2026-06-25 · the world is reproducible, and that is the point

Same seed, same moves, identical world — hashed and checked. This is not a nicety. A world you can
re-run is a world whose surprises you can **trust**: when something strange emerges, you can replay
it, trace it, and know it was the rules and not a fluke. Determinism is what lets the loop tell signal
from noise.

---

*Open threads for the loop, in priority order:*
*1. **Blaine's visual verification** — open `eddy/index.html`: does the field render (gradients bloom,
gray when idle), do entities read as distinct things, do the tools work? The loop cannot check this
(no headless browser here).*
*2. Does the overlap of two generators breed a genuinely distinct blend-diet species (the combinatorial
niche), and does it persist long-run? Watch, and write it here.*
*(Answered 2026-06-25: the food web self-extends — humus-eaters arise from waste — and the dissipative
model, upkeep leaving as heat, keeps the web diverse and bounded indefinitely.)*
