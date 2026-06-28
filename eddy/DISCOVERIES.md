# eddy — discoveries

*A lab notebook for the autonomous loop, inherited from LOOPHOLE. Findings about the **simulation's
own behaviour** — what it does that nobody designed — newest first. Not a changelog of features.
Design & soul: `docs/superpowers/specs/2026-06-24-loophole-successor-genesis.md`.*

---

## 2026-06-28 · the whole holds — every system at once still sits at the edge of chaos

A health-check I'd never actually run: I'd measured each mechanism's criticality in isolation (predation,
Gaia) but never the **entire live configuration at once** — auto-rot + compounds + symbiosis + the obligate-
predator redesign + Gaia with the faint-young-sun, all on, the literal flag-set `main.js` boots. That's the
thing the player runs, and emergent systems can interact in ways no single test catches, so the whole needed
its own measurement. It holds, cleanly, on every seed (5 seeds × 4000 ticks):

- **Class 4 + Bak SOC, every seed** — mean diversity 18.3, cv 0.13 (stable count), floor 7 (never collapses),
  turnover 64 extinctions/run (live churn beneath the steady count), avalanches 2.5× heavy-tailed over uniform.
  The richest config yet measured — *more* diverse and more dynamic than any single mechanism alone, still at
  the edge, not tipped into chaos.
- **All five worlds alive, all five climate-regulated** (clime 0.50–0.51 against the brightening sun) — Gaia
  holds even amid predation, rot, symbiosis and compounds all pulling on the same world.
- **6.0 of 7 turns drawn out on their own** — with just the standard three springs and one seeded predator, the
  world evokes six of its seven emergent phenomena unprompted within 4000 ticks. The objective ("draw out the
  turns") is genuinely reachable by play, not a checklist of rarities; the seventh (usually the pack or a late
  cascade) is the one that rewards a deliberate hand.

The quiet result is the important one: a year's worth of layered mechanisms — combat, cooperation, decay,
disturbance, climate — coexist in one world without any of them swamping the others or flattening the soul. The
edge of chaos wasn't a property of the early simple model that the additions eroded; it's robust to the full
stack. The integrated whole is more alive than its parts, and still measured.

## 2026-06-26 · the map is an oasis, and that's load-bearing — why "fill the empty world" fails

Watched the live world play and measured what I saw: at maturity life occupies only **~15 of 96 coarse cells
(~16% of the map)**, and the occupied set barely changes (occupancy churn **0.014** — a frozen blob). Eighty-four
percent of the world is permanently empty. The temporal pulse is real but gentle (predator–prey wobbles at cv
~0.14, ~750-tick period — the big swing is the one-time establishment, not a limit cycle). So the felt
staticness is **spatial**: life pins to the resource halos around the springs and never colonizes the rest.

The cause is simple once measured: `fertilityStep` only spawns where surplus already exceeds a threshold, and
surplus only exists near springs — so there is nowhere else to live. The obvious fix is to put resource
everywhere: **weathering**, a slow map-wide mineral release (real geology, the planet's distributed nutrient
source). Built it opt-in, swept the rate, measured against four gates. **It failed three of them, and the way it
failed is the finding.**

The map *did* fill (footprint 96/96) — but: (1) it filled as a **frozen full sheet** (churn ~0): a uniform
floor makes a uniform world, frozen-empty just becomes frozen-full, no shifting mosaic. (2) Population
**exploded ~20–26×** (107 → ~2800) into a mineral-eater **monoculture**, and diversity *dropped* (18 → 14, and
to 5 at higher rates). (3) The killer: a **bare world with no springs at all scored as well as the spring-tended
one** — springs fell to **1.0×**. Weathering completely trivialized the player's only lever. And it can't be
tuned away: a rate spread over 16,000 cells dwarfs a handful of point springs at any level that sustains life,
so distributed resource is *fundamentally* incompatible with point-source stewardship.

Two things crystallize from this. First, **the oasis is load-bearing, not a defect** — the whole game is
"steward the flows"; making resource free everywhere doesn't enrich the world, it deletes the reason to act
(and the measured 3.8× strategy gap with it). The empty map is the canvas the player paints by placing springs,
and the starting world being a single oasis is *correct*. Second, **a living, shifting map — if we ever want one
— cannot come from a static resource floor.** It would need heterogeneity that *moves*: cycling/drifting
resource plumes, or a disturbance→recolonization mosaic *within* the oases (intermediate-disturbance, Connell
1978), never a uniform sheet. That's a genuine design fork — fuller world vs. oasis stewardship — and one for
the curator's eye now that the game is live to look at, not for ramming in blind. Reverted; the oasis stands,
better understood. (The third bold swing this session disconfirmed by its own measurement — after the prey-rich
regime and the Red Queen. Each wrong guess, precisely caught, is worth more than an unmeasured "feature.")

## 2026-06-26 · the world keeps itself habitable — Gaia, emergent (Daisyworld runs)

The biggest canon in eddy's lineage that the game had *not* yet embodied: Gaia — Lovelock & Margulis's claim
that life collectively regulates its planet toward habitability. The game had *local* niche construction (soil,
terrain) but nothing *global*, nothing self-regulating. So I built the minimal honest version — Daisyworld
(Watson & Lovelock 1983) — and asked the only question that matters: does homeostasis **emerge**, or does it
have to be hand-held?

The mechanism is one global `clime` (a temperature) pushed by an external `forcing` (a brightening sun), plus a
heritable `albedo` on each creature: light life shifts its *local* temperature down, dark life up, and
metabolism is best when that local temperature sits at the habitable optimum. Crucially there is **no global
coordination** — each creature just grows where it personally does best. The collective albedo then nudges the
clime. That's the whole of it.

It works — and the first build *didn't*, which is the interesting part. With slow albedo drift from a uniform
start, the forcing outran evolution and the clime ran to the rails (dead world). Daisyworld needs **standing
variation and a fast response**, not a slow climb: widening the albedo mutation (so there's always light and
dark life for selection to seize) and sharpening the habitability curve turned a runaway into regulation. Then
the signature appears clean: under a warming that would drive the clime to **2.1**, life holds it at **0.50–0.51
for the whole run** — and across a *range* of forcings (it regulates a band, then fails past it: an honest,
finite Gaian envelope, exactly as the real Daisyworld has). Selfish local growth, global stability, no one
steering. The thing Lovelock was mocked for, falling out of the model for free.

And — the part I most wanted to be true — it does **not** cost the edge of chaos. Measured across 5 seeds
against the no-Gaia baseline: still Wolfram Class 4 + Bak SOC on every seed, with diversity actually up
(14.3 → 15.6) and turnover up (37 → 48). A second global homeostat layered on the world leaves it *more* alive,
not more frozen. Opt-in and gated like the rest (off ⇒ albedo never drifts, clime inert, baselines
byte-identical); on in the live game as a gentle brightening sun the world quietly holds the line against, with
the temperature shown in the HUD and the moment it's first proven summoning Lovelock's own words into the
murmurs. The planet, keeping itself alive — now in the simulation, not just the citation.

## 2026-06-26 · watched it play — the dynamism is real, but it hides in the numbers (so I surfaced the pack)

Overdue step in the loop's own method: after building two big mechanics (the kill, the glow), I stopped and
*played* the whole thing — ran the full live configuration (every flag on, terrain, three springs) to sustained
maturity and watched the arc, frame by frame. Two honest findings, one good and one not.

The good: the world is no longer static underneath. Predators emerge unbidden (~t500), overshoot in an
establishment **boom** (hunters 18→61 as prey fall 121→84 around t1500), then **bust** to a steady coexistence
(~40 hunters, ~80 prey, diversity ~17). Niche churn at maturity runs ~2 per 100 ticks — the *set* of ways to
make a living is semi-steady while the *counts* pulse beneath it. The obligate predator earned its keep: the
world has a pulse now.

The not-good, seen only by looking: that pulse is **invisible**. At the macro scale the mature frames are
nearly identical — two colonies pinned to their springs, glowing in place; the t1500 predator boom doesn't
*look* like anything. And the hunters rendered as faint salmon (their evolved `pred` sits ~0.48, and the crimson
tint scaled too gently to read). The game's oldest weakness, again: the depth is in the data, not the eye.

So this pass was about *surfacing* what's already true, no balance touched. Hunters now read clearly **crimson**
(the tint boosted so a `pred`≈0.48 hunter is unmistakably red — a pack knots visibly red at the prey-rich seam,
a kill site you can see). And the chronicle now names the **pack**: a once-only milestone when hunters cross
from a lone predator into a real *guild* (distinct from "the first hunters"), which summons the predator's
voice into the murmurs — Aldo Leopold's *Thinking Like a Mountain*, "just as a deer herd lives in mortal fear
of its wolves, so does a mountain live in mortal fear of its deer." The canon quoted as the world proves it,
exactly as the rest.

One honest restraint: I started to narrate a recurring boom→bust "turn" and pulled it — the boom-bust is mostly
a *one-time establishment overshoot*, not a reliable limit cycle, so a recurring narration would overclaim. The
once-only "a pack has risen" is what's true. And the macro-staticness stands as a named, unsolved limit:
colonies pin to their springs, so a mature world *looks* still even as it pulses. A future arc could let life
spread and migrate so the world fills and shifts by itself; for now, the player's hand (placing new springs)
supplies the macro change. Naming the limit is the start of the next one.

## 2026-06-26 · the storm came, the Queen still sleeps — why even a real predator won't (yet) evolve armour

Having built the strong predator (above), I went straight at the thing it was supposed to unblock: the Red
Queen. Last cycle's note read *"the arms race won't run on a calm sea"* and pinned the blocker on weak
predation — a nibbling hunter is a remote threat, so armour never pays. I'd built the storm; time to test the
guess. Added a heritable `defense` trait (opt-in, gated like the rest): armour blunts the bite, and it costs
(an armoured creature grazes less). Predicted: under the real kill, defence climbs and predators answer with
higher `pred` — a reciprocal climb.

**It didn't run.** Defence plateaus at ~0.10 whether predation is strong (richKill) *or* weak (legacy nibble),
and is if anything *lower* under strong predation; `pred` doesn't escalate either. The Queen still sleeps. And
because the gardener tests rather than guesses, I tried three principled mechanics and ran each: (1) armour
reduces bite *size* — no; (2) a **convex** cost (∝ defense²) to erase the cost-side valley so light armour is
nearly free — no; (3) **offence-minus-defence** (Holland's tags: armour that exceeds a hunter's `pred` negates
the strike entirely, true immunity) — no.

The blocker, found by testing, is one level deeper than "weak predation": an **adaptive valley on the *benefit*
side**. Intermediate armour is nearly useless — a predator adjacent to its target keeps striking and finishes
the kill regardless, so partial defence delays death by a tick, it doesn't prevent it. And fitness in this
world is bottlenecked by **reproduction rate, not survival**, so a trait that only buys survival is nearly
neutral — it drifts to ~0.1 and stops. Only *immunity* (defence ≥ the hunter's `pred`) confers a real benefit,
and that is unreachable by 0.06 increments against ongoing predation and a standing cost: there is no smooth
uphill gradient from bare to armoured. So strong predation was **necessary but not sufficient** — last cycle's
diagnosis was right about the calm sea and incomplete about the climb.

What the Red Queen actually needs is predation reshaped so that **incremental defence buys incremental
survival** (a gradient, not a cliff): a per-encounter lethality that armour gradually lowers, and/or predators
that **abandon** prey they can't crack (so the better-defended genuinely escape and every step up is rewarded,
and the hunter is pushed toward softer prey or toward evolving sharper teeth). That is a deliberate
predation-*shape* change — the same class of load-bearing move the richKill was — now **precisely diagnosed**
rather than vaguely deferred. The inert trait was reverted (an armour that never earns its cost is worse than
none; richKill stays). The pattern holds, twice over now: build what the last diagnosis named, test the next
hypothesis on top of it, and let the world correct you again — the blocker was always one level deeper than
predicted, and naming the new depth exactly is the whole of the progress.

## 2026-06-26 · the kill that pays — an obligate predator, at last (the deferred blocker, resolved)

The notebook has twice deferred the same thing: the dramatic predator–prey relationship and the Red Queen that
would ride it, both blocked (correctly diagnosed) on the **predation primitive** — donor-controlled grazing
that crops prey but cannot *feed a hunter*. The honest note then was that the fix is a load-bearing change to
make "with the curator watching." With the curator's standing leave to run bold experiments, I made it — and
**instrumented it against the trusted criticality harness so it wasn't made in the dark.** It works.

First, the measurement (play before fixing): I seeded obligate hunters into a grown prey colony and watched
the energy. They peaked at the eight injected and bled out — and the cause was not what I'd assumed. Two
specific bugs, found only by watching: (1) **`SATIETY` (1.8) sat *below* `REPRO` (2.0)** — a hunter stops
feeding when sated but must reach 2.0 to breed, so the gap could *only* be crossed by grazing; an obligate
hunter that grazes poorly was frozen one step below the breeding threshold *forever*. The predator population
literally could not grow, whatever the prey count — which is why last cycle's "prey-rich regime" test failed.
(2) The bite **left the prey alive at the floor** — grazing, not killing — so prey never fell to predation and
no population could track it. There was nothing for a predator to cycle *with*.

The redesign is two matched levers, opt-in (off ⇒ byte-identical baselines, the established discipline):
**richKill** — a strike that downs prey past the floor takes the *whole animal* (a kill, a windfall, the prey
*removed*); and **eatTradeoff** — a hunter grazes the field poorly, so predation is not free upside but a
*niche choice* (producer or hunter), the negative feedback that stops a runaway to all-predator. With satiety
also lifted above the breeding line so a hunter can breed from kills alone, an **obligate predator guild now
sustains itself by hunting**, indefinitely.

The numbers, across the board better than the world without it. In a garden: diversity **8 → ~15**, a stable
guild of **~45 hunters** (vs 3), the `pred` trait self-organizing to a steady **~0.48** equilibrium —
adaptation, evolved, not authored. At criticality scale (5 seeds × 4000 ticks): mean diversity **14.3 → 18.1**,
turnover **37 → 51** extinctions/run (a *more* dynamic world), heavy-tail intact (2.1× → 2.2×) — **still
Wolfram Class 4 + Bak SOC on every seed.** The predator redesign doesn't cost the edge of chaos; it pushes the
world *further* onto it. And it is visible: render a hunted world and the hunters knot crimson at the prey-rich
seams — a pack at a kill site, keystone predation you can see.

The honest edge: this is **stable coexistence**, not yet the wild Lotka–Volterra *limit cycle* (the populations
damp to a living fixed point rather than oscillating forever — spatial averaging over a large grid stabilizes
it). That's arguably the better game outcome (a cycle that never crashes to extinction), but a true oscillation
— via a destabilizing functional response (the paradox of enrichment) — is now a *reachable* next experiment
rather than a blocked one. And the bigger door this opens: predation is now a **strong selective force** (a
hunter that kills, not nibbles), which is the precondition the Red Queen was waiting on. The arms race that
"won't run on a calm sea" may finally have its storm.

## 2026-06-26 · lit from within — the depth was always there; it just wasn't *seen* (a render-craft note)

Not a finding about the sim's behaviour but about how it *reads*, and worth the notebook because it resolves a
named weakness: every prior report confessed the same flaw — *"creatures are interchangeable dots,"* the 13
diets and ~25 generations of drift *"subtle shading, not felt… the depth is in the data, not the eye."* The
data never changed. The seeing did. Each creature now lights its own neighbourhood in its own diet-colour
(an additive halo, soft and quadratic, the body a radially-shaded orb over it), and the world that was a
scatter of flat points resolves into **constellations of guilds**: gold lumen-eaters glowing in their gold
nebula, a blue mineral cluster across the seam, a green humus vein between — each orb sized by its vitality,
so a colony has texture and a pulse. The segregation by diet, the biomass spread from thriving core to
starving edge, the three niches holding apart — all of it was computed every tick and invisible; now the eye
reads it at a glance.

The honest catch: additive light is unforgiving of crowds, and the fear was that a dense colony would blow
out to a white smear. It doesn't — at 0.30 centre-intensity the densest maturity frame of the time-lapse
stays legible, individual orbs distinct, and where two guilds touch their lights *mingle and whiten*, which
reads (rightly) as energy at the boundary rather than as overload. Verified the whole arc headless before
touching the live shader, then mirrored the exact math in WebGL (a two-pass point-sprite draw: additive halo,
then solid orb). A reminder that legibility is not decoration — making the existing depth *visible* is itself
moving the arrow. `shots/world.png`, `shots/timelapse.png`, `shots/play-garden-2000.png` carry the new look.

## 2026-06-26 · the Red Queen won't run on a calm sea — why the arms race (and the obligate predator) wait on one thing

Reached for co-evolution next — the Red Queen (Van Valen; Holland's offence/defence tags): give prey a
heritable `defense` that blunts a bite at the cost of upkeep, and watch predators escalate to bite through
it, an endless reciprocal climb. Built it, ran it. **It didn't run.** With sustained hunters in the world,
prey `defense` sat at ~0.06 — exactly where it sat with *no* hunters at all. No armour, no escalation, no race.

The reason is the same one that grounds the obligate predator, and finding them to be the **same root** is
the real catch. Predation here is a **weak selective force**: a few keystone grazers cropping the dominant,
a minor cause of death against a tide of upkeep and starvation. So for the average prey, a hunter is a remote
threat, and armour's certain cost outweighs its rare benefit — selection never favours defence. The Red
Queen needs a *predator-haunted* world to run; this world is predator-*flecked*.

I first guessed the cure was abundance — a **prey-rich regime** — and, because the gardener tests rather than
guesses, I built it and ran it. **It is not the cure.** Loose eight obligate hunters into a world of *four
hundred* prey and they are all dead inside **thirty ticks** — they starve surrounded by food. So the blocker
was never the prey *count*; raising it changes nothing. The blocker is the **predation primitive** itself:
this world's hunting is donor-controlled grazing, and a creature that pays the specialist's price to live by
the kill simply cannot earn it back — the bite returns less than the cost of being a hunter, however much
prey it stands in. The dramatic Lotka–Volterra cycle, and the arms race that would ride it, wait not on more
prey but on a **redesigned predation** (a richer kill, a different take-and-keep) — a deliberate change to a
load-bearing primitive, the kind to make slowly and with the curator watching, not to crank in the dark. The
honest correction is worth more than the tidy theory it replaces: *I had the wrong cause, tested it, and the
world told me so.*

So defence was reverted (an inert trait that never earns its cost is worse than none). The world keeps the
co-evolution it *can* sustain — predation that lifts diversity (keystone), and the merger that founds new
kinds (symbiogenesis) — and the notebook now knows precisely what the dramatic predator-prey cycle is
waiting for. The honest gardener prunes the branch that won't fruit in this soil, and names the soil.

## 2026-06-26 · two became one — symbiogenesis, the other way life takes over (Margulis)

Freed to push toward depth, I went for the body of research the world had only half-spoken. It had **combat** —
predation, the rot, the cracker. But Lynn Margulis's whole correction to Darwin, the line already in the
murmurs, is that *"life did not take over the world by combat, but by networking"* — by **merger**. The
eukaryotic cell is two organisms that became one and never parted. That is **symbiogenesis**, and it was the
missing half of the food-web arc my own notes named (mutualism → predation → *symbiogenesis*).

Built it small, the way the brief asked: one heritable `symb` trait, one rule. Two creatures of *different*
diets sharing a cell may **merge** into a single **composite** that eats both — and the merger PAYS, a
metabolic windfall (the eukaryote's aerobic gain), so the new whole is more than the sum of its parts. Then
the world did the rest, unbidden. Where two complementary springs **overlap**, composites bloom at the seam;
the `symb` trait **evolves to fixation** (→1.0 — partnership, strongly selected); and the composites become
the **fit majority of the overlap** (biomass 1.12 vs 0.92 for the specialists), a new luminous kingdom owning
the boundary while specialists keep the pure edges. Two became one, and one inherited the meeting-place.

The honest turn, the one that taught the most: my first composite was *worse* than its parents — a balanced
diet eats the same total but a dual body costs more upkeep, so it died. The merger has to **pay** to be
chosen, exactly as Margulis insists endosymbiosis did: the captured partner gave the host a power it could
not make alone (respiration, photosynthesis). Give the composite that windfall — eat *more* where both foods
meet — and partnership becomes the better life precisely at the boundary, and a loss in a monotone zone. So
cooperation, like predation before it, earns its place only where the world makes it pay. And it is honest
all the way down: conserved (the composite *is* the sum of its partners, nothing created), off by default
(no `symb` drift, no merges, no rng → baselines byte-identical), narrated ("two became one"), and beautiful —
composites glow **pearl**, larger, a higher integrated form you can pick out of the crowd by eye.

The web now extends itself **both ways the canon names**: by combat (a hunter from prey, a white-rot from
lignin) and by **cooperation** (a composite from two that met). Margulis's quarrel with the combat-only story
is no longer a quotation in the margin — it is a mechanism running in the world.

---

## 2026-06-25 · playing the whole machine — compounds gave the world an age, once tuned

With every system built, I finally played the *integrated* world — compounds and the antagonist and terrain
and the food web all at once — and watched the numbers, not the parts. It caught a real fault the unit tests
never could. At the lock threshold I first chose, **compounds cratered the founder game**: turned on, the
young world fell to **diversity 6 against the baseline's 16**, its **decomposer guild wiped to zero** —
because lignin formed in exactly the humus-rich spots where decomposers would have founded, locking their
food away before they could arise. The white-rot niche was strangling the very guild it should grow from.

The fix was to let only *genuine excess* humus lock, and gently (threshold 0.45 → **0.7**, slow rate). Now
the founder dip is mild and the truth underneath is better than a fix — it is a **feature**. Compounds give
the world an **age**: a lean lignin-accumulation phase, then white-rot evolves, and the mature web settles
**richer than the baseline ever does — diversity 15–17 against its flat 11–12.** The recalcitrant matter
isn't a tax; it's a maturation the world walks through, ending more diverse for having a locked resource and
a specialist that learned to open it. (Also confirmed at the same sitting: with every lever live, the
*full* world equals the compounds-only world — the diverse garden never trips the spontaneous rot, exactly
as its 85%-monoculture gate promised. The pieces compose.)

The lesson is the old one, re-earned: a system is not its parts, and the only way to know the whole is to
**run the whole and look.** The unit harness proves each mechanism honest; only playing the assembled world
showed that one of them, untuned, ate another alive.

## 2026-06-25 · the web extends itself a third time — white-rot evolves on the lignin (compounds)

The last of the founding dreams, the one held longest for fear of clutter: **emergent resource chains** —
"a compound that is more than its parts," weird and unexpected, *but not at the cost of principal
simplicity.* Built it as the canon's own example, **lignin and white-rot**, and kept it to one new resource
*state* and one heritable *trait* — no fourth element, just a fold in what's already there. Where humus
piles **high**, a fraction locks into **lignin** — recalcitrant, inedible, seeping back only at a crawl.
And life carries a `crack` trait: a **cracker** can eat the lignin nothing else can touch.

Then the world did the rest, unbidden. Turn compounds on over a humus-rich garden and **lignin accumulates**
(to ~5,000) where the decomposers pile their waste — and the **`crack` trait climbs on its own**, 0.33 → 0.5
→ **0.62**, because where lignin lies it is free food and selection finds it. A **white-rot guild evolves**
(sixty-odd crackers) on a resource that did not exist until the world made it — and then *draws it back down*
(5,000 → 25) as the specialists consume the locked store. Humus → lignin → a cracker that evolves to open it
→ the lignin spent: a whole loop, authored by no one. It is the **third time the food web has extended
itself** — decomposers from waste, hunters from prey, and now white-rot from the recalcitrant compound its
own decay laid down. The thesis, breathing again.

And it is honest and it is small. Conserved end to end (humus ↔ locked ↔ biomass, to floating point); **off
by default** so no measured baseline moves a bit (the edge-of-chaos is exactly where it was, the `crack`
trait drawing no rng until compounds are lit); visible as a **woody-brown zone** you can read on the map (a
new substance, not a hidden number); and on in the live world. One resource state, one trait — and out of
them, a creature that eats wood. Richness from a fold, not a pile. (`E.makeField` lockStep, the `crack`
trait, `sim.setCompounds`; harness 76.)

## 2026-06-25 · why the obligate predator won't come — it's bodies, not material

Terrain gave a fresh idea for the oldest deferred dream — a true **obligate predator** (one that lives only
by the kill, booming and crashing against its prey in a Lotka–Volterra cycle). The blocker was always "the
prey base is too thin." And terrain *concentrates* — so: wall the prey into a **basin**, pack them dense, and
let an obligate hunter (the `EAT_TRADEOFF` lever, off by default, turned up) finally find a meal every tick.

It failed, cleanly, in every basin tried — large, small, sealed — and the failure named the real wall at
last. **Terrain concentrates *material*; it does not concentrate *bodies*.** A region's prey *population* is
pinned by **upkeep** — the carrying capacity is inflow ÷ cost-to-persist, about sixty to ninety lives, and a
basin holds *more material* without holding *more prey*. Cram those same ninety into a tiny bowl and the
body-density does rise (to ~0.43 a cell), but ninety bodies is still ninety bodies: a hunting population eats
them out and starves before they regrow, or — the adaptive valley again — hunting fails to pay often enough
and `pred` drifts back down to grazing. Either way the hunters are gone within a hundred ticks.

So the diagnosis is finally precise, and it closes a thread that had stayed vague for many iterations: the
obligate predator is blocked by **prey body-count**, which is set by the **upkeep carrying capacity** — not
by material, not by mobility, not by terrain. To get the crash-and-recovery drama you would have to build a
deliberately **prey-rich regime** (much higher spring inflow, or a lower prey upkeep) — a change to the
*core balance* that tunes the whole edge-of-chaos, a design decision with global consequences, not a tweak.
The stable **grazer-omnivore keystone** the game ships is the honest v1; the obligate cycle is a different
game knob, and now we know exactly which one. (The `EAT_TRADEOFF` lever was wired, tested, and reverted as
unused — the path, if ever wanted, is: raise the prey base *first*, then turn it up.)

## 2026-06-25 · the land takes shape — terrain, basins, and a second kind of firebreak

The thing the founding brainstorm wanted most, and the last big piece unbuilt: **spatial depth** — the SimCity
dream of flow through shaped zones, basins, chokepoints, "where matters." Now the field has **terrain**: a
layer of rock. Rock holds nothing and lets nothing pass — so it **blocks diffusion** (material pools against
it, and a spring walled into a **basin** runs **1.6× richer** than the same spring in the open — denser life,
a deliberate concentration), it **blocks life** (nothing grows into stone), and it **blocks the rot** — a
rock wall is a **firebreak the fire cannot cross**, measured dead at zero on the far side.

That last one is the quiet delight: the world now has **two** ways to firewall the antagonist. Keep your
guilds diverse and the rot stalls at the *living* seams between them; or wall a colony off with *rock* and
the rot stalls at the stone. Biological resilience and built resilience, the same outcome by different means
— and a real choice in how you defend. And it deepens every placement: a spring in a bowl is a different,
richer thing than a spring in the open; a ridge between two colonies keeps a blight in one of them. "Where"
was already worth 3.8×; terrain gives it basins and walls to work with.

It is honest engineering all the way down. The barrier layer is a **no-op when empty** — an unshaped world
diffuses byte-for-byte as before, so every measured baseline (the edge-of-chaos, the bake-off) is untouched;
terrain is opt-in, laid by the player's hand. It renders as stone (verified headless — a lumen spring cupped
in a basin of rock, its gold pooled and its life packed inside, a ridge firebreaking the open colony beside
it), it serializes, and it gives the steward a new verb: **▣ shape the land.** The map stopped being a flat
sheet the world relaxes across; it became a place with structure to read and to build.

And the world now **arrives as a landscape.** A fresh world generates its own terrain — the opening spring
**cupped in a U-basin** (a richer, sheltered start, open at the top so life climbs out as it matures) and a
couple of wandering ridges scattered for character. Deterministic from the seed (every world its own place,
reproducible), bounded (~190 rock cells of 16,000 — a landscape, not a maze), and verified to **never wall
off the opening** (4/4 seeds establish their first colony). The blank table is gone: you wake into a basin
someone might have carved, and the first thing the world shows you is that *here* is different from *there*.

## 2026-06-25 · the rot strikes unbidden — a monoculture rots from within

The rot was a tool you could loose; now it is a threat that comes for you. **Spontaneous ignition:** when the
world has collapsed to a genuine monoculture — one guild holding more than **85%** of all the living, and the
world established — a rot rarely lights, on its own, at the colony's thickest point. Uniformity rotting from
the inside. The over-optimized world, the green goo, the single perfect strategy: it festers.

The elegant part is that the antagonist is **self-gating by the very thing it punishes.** The property that
makes a monoculture vulnerable — uniformity — is exactly the trigger; a diverse world, where no guild nears
85%, is **never touched.** Measured: the Class-4 garden tops out at a 0.62 single-guild fraction across every
seed, so it never qualifies, ever — the rot *cannot* disturb a healthy world. And because it ships **off by
default** (the live game turns it on), every measured baseline stays byte-for-byte identical; the controlled
experiments still isolate each mechanic, while the live game is the integration where the threat is real.

So the thesis is now closed on both sides. Build a monoculture and it **rots from within** (punished); keep a
diverse world and you are **immune to the spontaneous rot** (rewarded) *and* any rot you do face **firebreaks
at your seams** (defended). Diversity is no longer a number on a panel you might chase — it is your shield,
your immunity, and your firewall, all at once. The Weaver was always the point; now neglecting her has a
cost that finds you on its own.

And played out — 3000 ticks, the antagonist live — it is the drama the report said was missing. A
**monoculture** world (one lumen spring, ~100% one guild) **ignites eight times**, its population swinging
**0 → 142 → crash → regrow → rot again**: a boom-bust life, the green goo purged and reborn on a loop. The
**diverse** world beside it (three guilds, ~38% each) **ignites zero times** across the same span — serene
at ~13 niches, alive holding 85–164. One rule, and the careless world gets tension and consequence while
the considered one earns peace. After setup there is now something to lose, and a reason it was worth
tending well.

## 2026-06-25 · the rot arrives — an antagonist that pushes back, and makes diversity a *shield*

The blight was reverted with a promise (below): the antagonist wanted a different substrate — the **field**,
not the creatures. Built it, and it landed. The rot is a **typed fire** on the field: a stain of one guild's
*type* that feeds on that guild's living fuel (spreads full), bridges bare ground weakly carrying its type,
and is all but **blocked by a different guild** (wrong fuel → it can't catch, and starves on the far side of
the seam). So a **monoculture is one open field the fire crosses end to end; a diverse world is a quilt of
firebreaks** that pens it into a single patch. Diversity stops being mere richness and becomes **resilience**
— Elton's diversity–stability hypothesis, the portfolio effect, fire-ecology's firebreaks, all at once.

The numbers say it plainly, locked in the harness: light a rot in a **monoculture** and it culls **89%** —
near-total; light the same rot in a **diverse** garden and it takes **39%**, one guild, then dies at the
seams while the others hold. The headless render shows it true: the gold lumen colony eaten down to nothing
under a dark stain, while the blue mineral and green humus colonies sit pristine a few cells away, untouched.
*You can see the firebreak.* The Weaver aspect finally has teeth — a varied world isn't just prettier, it
*survives* what a uniform one cannot.

The design turn that made it work was **the type**. A rot with no identity launders through bare ground and
re-ignites in any patch — no firebreak. Give the fire a fuel-*type* (the guild it's burning) and a
wrong-guild cell becomes a wall: the fire can't feed there, decays fast, and stops. That one bit of state
turned diversity from incidental into *load-bearing*. And it's honest all the way down: the biomass the rot
destroys returns as humus (conserved); a world with no rot runs the step as a no-op (the measured Class-4
edge-of-chaos is untouched until a rot is lit); it's visible as a creeping stain, narrated by the chronicle,
and wieldable by the player as a ☣ controlled burn. This is the redemption of the blight's negative result —
same mechanism, right substrate. The map's structure was the firebreak all along.

## 2026-06-25 · the blight that wouldn't bite — a contagion needs a body to spread in

Reached for the antagonist the report calls the #1 lever, and framed it on the most beautiful thesis
available: **diversity as protection** (Elton's diversity–stability; the epidemiological *dilution effect*).
A blight as a contact contagion — leaping between look-alike neighbours (transmission ∝ diet similarity),
rotting them to humus — should sweep a uniform monoculture and *stall* where diets differ, so a diverse
world survives what a monoculture cannot. The Weaver aspect would finally have teeth: variety as a shield.

It conserved to floating point — the accounting was never the problem. But it **wouldn't bite**: loosed on
a monoculture it culled ~12% and the world shrugged it off; recovery outran it. Two reasons, both worth
keeping. **(1) A contact contagion is density-limited.** Against a sparse, *reproducing* population the
survivors recolonise as fast as it spreads, so it settles to a small cull and burns out — birth beats
transmission, R₀ never holds. **(2) The dilution effect assumes mixing.** It needs dissimilar neighbours
*interspersed* — but this world's niches are spatially **segregated** (a lumen patch is all lumen-eaters),
so every local neighbourhood is uniform no matter how diverse the *whole* is. Diversity *between* patches
cannot dilute a plague that only ever spreads *within* one. The thesis came out faintly right (the
monoculture's denser core caught more) but far too weak to feel, and pushing virulence higher only risks it
leaping the firebreaks into the diverse world too.

So diversity-as-shield can't ride on neighbour-similarity in a patchy world — the substrate is wrong. The
honest next attempt is a **region-rot on the field itself**: a spreading stain that damages all life in the
cells it covers and advances faster through ground held by a *single* diet, stalling at the seams between
guilds. That firebreaks on the map's *actual* structure (which is genuinely diverse), it's legible — you'd
watch it crawl and watch a mixed border hold it — and it doesn't need a contagion to out-run birth.
Reverted the contact-blight (it conserved, but didn't earn its complexity). The build wasn't wasted: it
mapped the wall. Same shape as the obligate predator — a real mechanism waiting on the right substrate.

## 2026-06-25 · the soil overshoots, then settles — a founder bloom, not a slow death

Every playtest showed soil booming then draining, and it worried me: was the mature world slowly hollowing
out the ground it had built? Ran it to **6000 ticks** to see where it lands. It lands. Soil booms to ~1920
in the founder bloom (t400), draws down for ~4000 ticks, and **settles to a plateau near 470 — then holds,
even ticks back up.** Not a hollowing; an **overshoot-and-settle.**

The why is succession in miniature. Soil's equilibrium is roughly *five times the local humus surplus* (it
locks at 5%/tick, releases at 1%). The pioneer bloom — much early death, few decomposers yet — over-accretes
a transient store; then the decomposer guild matures (~35 steady) and mineralizes the humus, and soil
relaxes from the overshoot to the level the standing surplus can actually sustain. Pioneers hoard, the
mature system reaches equilibrium — the same arc a real recovering ecosystem walks. And underneath it, the
reassurance a left-running world needs: at 6000 ticks everything is steady — **~140 alive, ~35 decomposers,
burn ~21, soil ~470 — no drift, no death.** The dissipative balance holds for the long haul, not just the
first thousand ticks. (Honest caveat, already on the books: with *infinite* springs the raw field still
creeps up, ~6500→7360 — springs over-supply; the game's *finite* springs are the cap. It's the **living**
layer — life, soil, burn — that sits at steady state.)

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
*2. **The impatient-seed problem — RESOLVED by the physics, made legible by the advisor.** Tried giving a
player's primer its own starter substrate (even a generous 55-unit packet); found a one-time gift CANNOT
sustain life on bare ground no matter how large — it diffuses away and upkeep starves the lone seed. That
is not a bug, it is the dissipative thesis ("a world lives on a flow, not a stock"): you must place a spring
and let surplus pool before seeding. The model teaches patience by itself, and the advisor now says it
aloud ("the world is nearly bare — place a spring, let surplus pool, then seed"). Teach-patience was the
right answer; it needed no code, only legibility — which the advisor supplies.*
*3. **The antagonist SHIPPED — the rot** (above): a typed fire on the field that sweeps a monoculture (89%
culled) but firebreaks at guild seams in a diverse world (39%, one patch). Conserved, no-op baseline,
visible as a dark stain, narrated, a ☣ player tool — and now **strikes unbidden**: a monoculture (one guild
>85% of the living) spontaneously rots from within, while a diverse world is never touched (self-gating;
off by default so baselines stay byte-identical). The antagonist is complete. (Next, if wanted: tune the
ignition rate for feel, and a render of the spontaneous strike.)*
*4. **The obligate predator that sustains itself** — keystone predation works (a hunter crops the dominant
and raises diversity, Paine 1966), but only *while the pack persists*; a fire-and-forget hunter fades. The
remaining arc: a predator that lives by the kill well enough to hold its own guild down (needs a
bigger/faster prey base — the long-standing predator-prey balance problem).*
*5. Mode-2 foundation is in (soil accretes & conserves, and settles to a stable plateau over 6000 ticks).
Remaining: the full biogenic legacy — energy-aware soil release so accreted ground can revive a dead patch,
not just feed the matter guilds.*
*6. **Compounds SHIPPED** (lignin/white-rot, above) — a recalcitrant resource a cracker species evolves to
open; the food web extends onto it unbidden. Remaining graduation: a deeper co-evolution/arms-race layer
(prey defences vs the cracker/hunter), and the rules/incentive layer.*
*(Answered 2026-06-25: the food web self-extends; the dissipative model keeps it diverse & bounded; two
overlapping springs breed a persistent blend species; the world renders legibly; finite springs make
placement a consequential decision; the world measures at the edge of chaos (Class 4 + SOC); player
choices move the score by 3.8× — it is not boring; the hunter is now a keystone lever that raises
diversity, not decoration; the soil settles to a stable plateau (overshoot-and-settle, not hollowing); the
SOC cascades are now narrated as felt events; the impatient-primer "problem" was the dissipative thesis
working all along — a packet can't sustain life without a flow, and the advisor now teaches that; and the
antagonist arrived — the rot, a typed fire that makes diversity a literal firebreak (89% vs 39% culled) and
strikes monocultures unbidden, while never touching a diverse world; terrain arrived — rock that pools
material into basins (1.6×) and walls the rot off (a second, built firebreak), with a ▣ shape-the-land verb;
and compounds arrived — lignin, a recalcitrant resource a white-rot specialist evolves to crack (the food
web extends itself a third time).)*
