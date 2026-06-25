# eddy — discoveries

*A lab notebook for the autonomous loop, inherited from LOOPHOLE. Findings about the **simulation's
own behaviour** — what it does that nobody designed — newest first. Not a changelog of features.
Design & soul: `docs/superpowers/specs/2026-06-24-loophole-successor-genesis.md`.*

---

## 2026-06-25 · the world moves — hunters roam, a real third behavior

Mobility, scaled by the \`pred\` trait: producers stay rooted (plant colonies), hunters roam toward prey
(the fullest neighbouring patch of edible life). It changed everything for the hunters — instead of
starving in place they *follow* the prey, so a seeded handful (5) surges past two dozen and holds (~16),
\`pred\` near 0.85, threading crimson through the colonies and out across the gray between them. The world
is no longer three static clouds; it has motion, and the motion *means* something (a hunt). Class-4 at
last: persistent, mobile, interacting structures.

The dramatic version still resists. A *true obligate* predator — made a poor producer so it must hunt —
starves even WITH mobility, because these prey colonies are small and slow: a hunter that lives only by
the kill exhausts them, and there's no herd over the next hill. So today's hunters are roaming
grazer-omnivores (they also sip the field), which is why they persist *and* why they don't crash the
world. The crash-and-recovery drama wants a bigger, faster prey base — a balance problem for later, not
a mechanism we're missing.

## 2026-06-25 · life eats life — a hunter that evolves, and why it can't yet starve right

Gave organisms a heritable \`pred\` trait and one predation primitive (a more-predatory entity bites a
less-predatory neighbour; the rest of the kill returns to humus — conserved). Seed a hunter into a
colony and it works: the hunters persist, reproduce, and their \`pred\` climbs on its own from 0.7 toward
**1.0** — predation evolving *upward* under selection, unbidden. They show as crimson among the
producers; "the wonder" has its first visible instance — a hunter↔prey relationship the code never
authored.

But three tunings taught the hard limit the canon warned of. **(1)** Predation won't evolve from zero —
the climb is an *adaptive valley*: a faintly-predatory mutant pays a cost before the bite pays off, so
selection pushes it back down (it must be *seeded*). **(2)** A *true obligate* predator — made a poor
producer so it must hunt — **starves**, because it is stationary: it eats out its local patch and can't
follow the prey. So v1 is donor-controlled grazing/omnivory (stable, gentle), not the dramatic
predator-prey crash-and-recovery. The missing piece is plainly **mobility** — predators that roam down a
prey-gradient (the parent's roaming grazer, which did *not* collapse). Build that, and the obligate
hunter (the field-eating trade-off is already wired, just switched off) comes alive.

## 2026-06-25 · scale is cheap — the sim is not the bottleneck

The spec promised bigger maps; the CPU sim can pay for them. A populated world ticks in **0.8 ms** at
the current 160×100, **3.1 ms** at 4× (320×200), and **7 ms** at 9× (480×300) — all far under the
~60 ms real-time budget. Diffusion is O(cells) and that is the floor; even a nine-times-larger world
runs near 140 ticks a second headless. So a much larger map (the terraforming-scale vision) is a free
choice whenever the feel calls for it — the WebGL render carries the pixels, the deterministic sim
carries the rest, and neither strains. (Caveat already known: a bigger map spreads material thinner, so
life establishes slower — which the pre-built opening and the starter-primer already soften.)

## 2026-06-25 · life builds its own ground — but matter is not energy

Mode-2: where life's excreted humus piles up, a fraction accretes into persistent **soil** that slowly
releases back. Over 1,500 ticks the colonies lay down a real biogenic layer (~130 units) where they
thrived — niche construction; the substrate shifting from geological to *made*. Conserved: humus locked
into ground exactly equals humus drawn from the field — the soil cannot conjure matter, only store it.

And the honest wall the build hit: soil is **matter**, and a producer runs on **energy**. When a spring
dries, the soil life accreted can keep feeding the matter-cycling guilds — the decomposers, the mineral
line — but it cannot bring back the lumen-eaters, because lumen *is* the gradient, and that dissipated
when the spring went quiet. The accumulated ground is a real legacy, but a partial one: it remembers
the bodies, not the sunlight. A fuller biogenic revival would need soil to release along an
energy-aware path — a thread, not a wall.

## 2026-06-25 · a seed on bare ground starves — the loop wants patience

Adding finite springs revealed a fragility in the *opening*, not in depletion. Drop a primer the instant
you place a spring and it dies within a few ticks: the gradient hasn't built yet, so the new life is on
near-bare ground and upkeep outruns the trickle. The world still *arrives* — fertility sparks life a few
hundred ticks later, once surplus has pooled past its threshold — but the **seeded** creature fizzles.
The intended loop already knew this: *place a spring, watch the surplus pool, then seed.* The storyboard
had it right. **Fixed for the opening:** a fresh world now pre-builds its gradient (40 ticks of the
spring) before it seeds, so the first colony takes at once (min-alive 0→never-zero; it grows to ~11)
instead of the world sitting dead for hundreds of ticks. Still open for the feel: should a *player's*
primer dropped on bare ground also carry its own **starter substrate** — a paid investment that lands as
food, so any seeding takes — or should the UI just teach patience (it already hints "click a surplus
patch")? A decision should have a consequence; the impatient one still quietly has none.

## 2026-06-25 · the world, seen — it is legible, not mush

Without a browser, the loop built a pure-JS renderer that paints a sim state to a PNG using the shader's
exact color math. The image settles the make-or-break question the parent game *failed*: **this world
is legible.** Three springs make three resource blooms — gold lumen, blue mineral, a green humus vein —
each fading to gray where no source feeds it (entropy, on the screen). Life reads as distinct,
diet-colored dots gathered in their niches: gold eaters in the gold, blue in the blue, green by the
humus. And one detail nobody drew — the lumen colony has **grazed the center of its own bloom dark**, a
bright ring of plenty around an eaten-down middle. Consumption, made visible; cause you can read off the
picture. This is the depth the whole redesign was for: not a field of cells, but a world of things you
can see and explain. (The headless render mirrors the shader faithfully; the live WebGL page still wants
a real browser to confirm the GL code itself runs.)

## 2026-06-25 · two springs, a third creature — richness from the overlap

Place a lumen spring and a mineral spring close enough that their fields overlap, and seed life *only*
at the two sources — never between them. Wait. The overlap fills on its own: by the end a **blend-diet
species lives in the band between the springs** (mean position x≈80, dead center between sources at 72
and 88), eating the lumen+mineral mixture that exists nowhere else. Two simple sources, three niches —
the pure-lumen edge, the pure-mineral edge, and a creature that is neither, born only of their
interference. Richness is not authored here; it is **manufactured combinatorially** by *where* the
springs are put. The map's diversity is a function of its geometry — exactly the worry, answered.

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
*1. **Blaine's visual verification** — open `eddy/index.html` (the loop can't; no headless browser).*
*2. **The impatient-seed problem** (above): the auto-opening is fixed (pre-builds the gradient), but a
*player's* primer on bare ground still starves — decide the feel (starter substrate that lands as food,
vs. teach patience) so player seeding reliably has a consequence.*
*3. Mode-2 foundation is in (soil accretes & conserves). Remaining: the full biogenic legacy —
energy-aware soil release so accreted ground can revive a dead patch, not just feed the matter guilds.*
*4. More graduation features: compounds & the co-evolution layer, the rules/incentive layer.*
*(Answered 2026-06-25: the food web self-extends; the dissipative model keeps it diverse & bounded; two
overlapping springs breed a persistent blend species; the world renders legibly; and finite springs make
placement a consequential decision.)*
