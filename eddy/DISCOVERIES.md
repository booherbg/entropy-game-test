# eddy — discoveries

*A lab notebook for the autonomous loop, inherited from LOOPHOLE. Findings about the **simulation's
own behaviour** — what it does that nobody designed — newest first. Not a changelog of features.
Design & soul: `docs/superpowers/specs/2026-06-24-loophole-successor-genesis.md`.*

---

## 2026-06-25 · the hunter earns its keep — predation that makes the web richer (Paine's keystone)

The bake-off had just caught the ⚔ tool being decorative: seeding hunters scored the same as not. The canon
named the fix before I'd finished writing the complaint. **Robert Paine, 1966** — pull the predator (the
starfish *Pisaster*) off a rocky shore and the diversity *collapses*, because one competitor (the mussel)
crowds out everyone; the predator's *cropping of the dominant* is what holds the door open for the rest. A
predator can be a **keystone** — its presence *raises* richness. Mine wasn't, because it bit the first prey
it found, thinning all comers evenly. So I pointed the bite at the dominant: among the prey a hunter can
reach, it now takes one of the **most abundant species** (counted by the same `speciesKey` the diversity
score uses — one comparison added to the prey-selection loop). 

And the shore answered. Under sustained hunting the niche count rises **13.6 → 15.5, +15%, on every seed**
tried — locked now into the harness. The targeting is authored (I wrote "prefer the common one"); the
*diversity gain is not* — it falls out of the ecology, exactly as Paine measured it in tide pools: relieve
the pressure of the crowd and the rare make a living. The take-and-kill primitive, aimed, stops being a
drain and becomes a **function** — top-down control that structures the web.

The honest seam, and it points somewhere: the lift holds only **while the predator guild persists.** A
single fire-and-forget hunter pack fades, and its keystone benefit fades with it (which is why the bake-off's
one-shot seeding still read neutral, while *sustained* pressure clearly lifts). Right now persistence is the
player's job — re-seed, keep the pack alive. The deeper answer is the arc still open in this notebook: an
**obligate predator that sustains itself**, so the keystone holds without a hand on it. The lever works; now
it wants a world that can hold it down on its own.

## 2026-06-25 · is it boring? no — a considered hand is worth 3.8×

The honest test of a god-game: would the world be any different if you hadn't bothered to think? So I ran
six stewardship strategies to 2000 ticks each and scored them on the game's own *flourish* (seed-averaged
over three worlds). The spread settles it — **flourish 121→457, a 3.8× gap between the laziest hand and the
most considered; diversity 2.3→15, a 6.4× gap.** Choices are worth multiples, not percentage points.

What the ranking teaches:
- **The layout sets the diversity ceiling.** One lumen spring tops out at ~2 niches; three elements plus a
  humus vein reaches ~15. So the worry the criticality entry raised — that diversity *saturates* — was only
  half-true: it saturates *for a given board*, but the board is yours to draw. The Weaver is a real goal;
  you raise its ceiling by widening the palette.
- **Overlap pays — in the score, not just the census.** Two springs placed close (fields interpenetrating)
  out-flourish two placed apart at the same spend (200 vs 184): the blend-band between them is its own
  habitat. The "two springs breed a third niche" discovery shows up where the game rewards it.
- **The humus vein is the big unlock.** Adding the third element (triad over overlap) jumps flourish
  200→290 — a decomposer guild is worth more than another producer.

And two honest asterisks, because a number that flatters is worse than none:
- **Mosaic wins partly by spending more.** Six springs out-flourish three — but six springs is six times the
  cost the in-game economy charges, which this bake-off did *not* (it used free, infinite springs to isolate
  *layout* from *budget*). The real game's spring price is exactly what turns "place more" back into a
  decision; among equal-ish spends, placement and palette — not count — carry the result.
- **The hunter is, for now, flavour not strategy.** Seeding predators scores the same as not (284 vs 290) —
  they roam crimson and persist, but they don't move flourishing. A clean backlog thread: make predation a
  *lever* (a hunter cropping a dominant guild should *open* niches and lift diversity), not a decoration.

The core answer is the one the loop needed: the world is not boring. It rewards a considered hand, by
multiples, on its own terms. (`eddy/test/strategy.js`.)

## 2026-06-25 · the soul, measured — the world sits at the edge of chaos (and a number that lied)

The foundations doc asked for a *measurable* soul: not "it feels alive," but a number that says whether this
world is Wolfram **Class 4** — the living class between frozen order (1/2) and chaos (3), where Langton put
the edge and Kauffman put life. So I measured it. Five seeds, four thousand ticks each, three springs and a
handful of seeded hunters; sample the diversity every twenty ticks and tally where the extinctions fall.
The verdict held on every seed: **~13 niches alive (of ~30 possible), never dropping below 7, never frozen
to a monoculture, never collapsing.** Persistent and structured — alive, by the number.

But the measurement taught three lessons before it would say so, and the third is the one worth keeping.
**First**, a stable diversity *count* proves nothing alone — *a dead world also has a flat count*. The tell
that separates frozen from alive is **turnover**: beneath that steady ~13 the world runs **~24 extinctions
per run**, each balanced by a birth — niches churning under a calm surface, the way a real ecology holds its
richness while its membership turns over. **Second**, humbling: my first pass read a diversity of *zero* as
a momentary total death-and-rebound — a perfect avalanche. It wasn't. It was the **cold start**, the
impatient-seed problem already in this notebook: the test seeded on bare ground, so the world sat empty
until ~tick 300 awaiting a fertility spark. Pre-build the gradient first (as the game's own opening does)
and the artifact vanishes. *Measure the living world, not the cry of its birth.*

**Third, and the real catch:** my first committed numbers were inflated, and the loop caught itself. I had
counted species by their *procedural names* — but a name is a hash into ~150 buckets, so the count read a
falsely-rich **87**, and the cascades looked **3.4×** heavy. Re-measured by the *meaningful* niche — diet
quantized to quarters, the very key the player's diversity score uses, max ~30 ways of making a living — the
honest figures are **~13 niches and 2.0×**. The signal *survived* the stricter metric; its **magnitude did
not**. So the diversity headline the parent might have bragged on was partly an artifact of how finely you
chose to name things — a humbling, on-thesis reminder that *what you measure decides what you find*, and that
a reproducible world is one whose own builder can be caught and corrected by it.

And the signature that makes "edge of chaos" more than a slogan still stands — **Bak's self-organized
criticality.** If extinctions arrived at a steady drip, the busiest tenth of time-windows would hold about a
tenth of them. Instead the **top 10% of windows hold ~27%** — **2.0× concentrated**, on every seed: long
quiet stretches punctuated by cascades (up to five niches lost in a single window against a mean near one).
The world is not dying at a constant rate; it **avalanches** — most days nothing, then a collapse that takes
a guild, then quiet again. The sandpile, the punctuated equilibrium, the heavy tail: the fingerprint of a
system that tuned *itself* to its critical point. Nobody set a dial to 13 niches or to 2×. The rules — flow
in, dissipate, adapt, die back — found the edge on their own. (`eddy/test/criticality.js`, deterministic;
species counted by the shared `E.speciesKey`, the same niche the Weaver aspect scores.)

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
*3. **The obligate predator that sustains itself** — keystone predation now works (a hunter crops the
dominant and raises diversity, Paine 1966), but only *while the pack persists*; a fire-and-forget hunter
fades. The remaining arc: a predator that lives by the kill well enough to hold its own guild down, so the
keystone effect stays without the player re-seeding (needs a bigger/faster prey base — the long-standing
predator-prey balance problem).*
*4. **The soil boom-then-drawdown** (seen in every playtest & the bake-off): soil peaks mid-run then declines
even with infinite springs — the mature world consumes its own accreted legacy faster than it lays it down.
Probe whether this is a healthy boom/lean cycle or a slow hollowing, and whether it should be felt as a
mechanic (a maturing world living off its past).*
*5. Mode-2 foundation is in (soil accretes & conserves). Remaining: the full biogenic legacy —
energy-aware soil release so accreted ground can revive a dead patch, not just feed the matter guilds.*
*6. More graduation features: compounds & the co-evolution layer, the rules/incentive layer.*
*(Answered 2026-06-25: the food web self-extends; the dissipative model keeps it diverse & bounded; two
overlapping springs breed a persistent blend species; the world renders legibly; finite springs make
placement a consequential decision; the world measures at the edge of chaos (Class 4 + SOC); player
choices move the score by 3.8× — it is not boring; and the hunter is now a keystone lever that raises
diversity, not decoration.)*
