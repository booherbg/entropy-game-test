# LOOPHOLE — discoveries

*A lab notebook for the autonomous loop. Part of the fun is seeing what emerges that nobody
designed. Each loop iteration that surfaces something true gets an entry — newest first. These are
findings about the **simulation's own behaviour** (often surprising), not a changelog of features.
Method & telos: `docs/superpowers/specs/2026-06-19-loophole-prime-directive.md`.*

---

## 2026-06-20 · the coral is a keystone — the union builds a haven that makes more life

Real corals are keystone reefs: the structure shelters the biodiversity around it. The game's corals
"build REEF — terraform a habitable patch harder than an ordinary bed." I measured whether they actually
*facilitate*: across the meadows that grew reefs, **non-coral flora cover is 2.2× higher within two cells
of a coral than away from one** (11.9% vs 5.3%). The corals are genuine keystones — the meadow
concentrates around them.

But not the way I expected. The reef zone is **not** more *ordered* — its mean entropy is slightly
*higher* (0.066 vs 0.057). The reef doesn't calm the ground; it shelters life that then runs the
throughput up. A living reef is a dissipative *haven*, not a quiet one — which is exactly right
thermodynamically (more life = more gradient-dissipation, the capstone again).

The deeper shape is the food web's positive-sum, made concrete. Symbiogenesis (cooperation) builds a
coral; the coral's reef concentrates *more* life (2.2×); more life → more diversity → more cooperation →
more corals → oneness. **Cooperation doesn't merely win the meadow — it builds the conditions for more
cooperation.** The reef is the niche-construction (Holland) by which the cooperative pinnacle seeds its
own succession. Margulis's union, become a haven. (No fix — designed mechanism, emergent consequence;
worth understanding, not changing.)

## 2026-06-20 · the flora evolve gently — and the gentleness is what lets them become one

The as-built claims the flora undergo "fast natural selection." I went to verify it: do the survivors
actually differ from the dead? Measured four randomized traits (entropy tolerance, spread rate,
establishment speed, niche size) across **187 species** — 72 survivors, 115 extinct.

Selection is **real but weak.** All four traits point the right way — survivors have wider tolerance
(+5%), faster spread (+3%), faster establishment (settle −6%), and bigger niches (+4%) — but only by a
few percent. Four-for-four directional consistency says the signal is genuine, not noise; the smallness
says **survival is mostly niche-luck, not trait-fitness.** The flora are closer to Hubbell's *neutral*
theory of biodiversity (community composition as stochastic drift) than to strong niche-selection.

And the weakness is not a flaw — it is the **load-bearing feature.** Strong selection would drive the
meadow toward a monoculture of the fittest. But the autocatalytic ring needs ≥4 diverse kinds to close
(Kauffman ⨯ Paine, logged above), and oneness needs ≥6. **The gentle, drift-dominated evolution is
exactly what keeps the meadow diverse enough to feed itself and to become one.** The flora don't compete
their way to a winner — they drift their way to a community. Hubbell's neutrality, Paine's keystone,
Kauffman's ring, Margulis's holobiont: one mechanism, the same as it always is. Strong selection would
have killed Gaia in the cradle. (No fix — the right move was to understand why a "weak" result is the
correct one, and leave it be.)

## 2026-06-20 · the meadow is a steady state — constant whole, flux of parts (no portfolio effect)

Tested a famous ecological hypothesis: does **diversity stabilise** the meadow (Tilman's portfolio effect
— a diverse community's aggregate steadies because its species fluctuate out of phase)? Measured flora
diversity against the temporal CV of total biomass across 18 meadows. Answer: **no** — and the *reason* is
the finding. Every meadow is already near-maximally stable (**CV 4–8% of total biomass, flat across the
whole diversity range**). The non-collapse design (donor-control, satiety, refuges — the
never-Lotka-Volterra invariant) regulates the whole to its carrying capacity so firmly that there's no
instability left for diversity to cure. The portfolio effect can't show because the portfolio is already
perfectly hedged.

But the null has a shape worth keeping. The meadow's biomass holds nearly **constant** while its
**composition churns** — flora arise, establish, are grazed, merge into corals, give way to the next. The
constancy of the whole amid the flux of the parts: a *shifting-mosaic steady state* (Bormann & Likens) —
and exactly the Heraclitus the game already quotes, *"an ever-living fire, kindling and going out in
measures."* The fire is constant; only its fuel turns over. The homeostasis IS the Gaian trait, hiding in
plain sight as mere "stability." (A negative result, but one the sim turned into its own metaphor.)

## 2026-06-20 · the flora close Kauffman's loop — but only with Paine's diversity

The game rests on two complexity-science pillars: **Kauffman** (autocatalytic sets — "order for free", a
closed loop of mutually-producing parts) and **Paine** (the keystone — *diversity*, not biomass, is what
holds a web together). I went to check whether the first is actually *real* — do the flora's excretions
close a loop, or is it an aspirational comment? — and found the two pillars are **the same mechanism**.

Each flora eats one element (`ch`) and excretes another (`ex`, always a *different* channel). So the
flora form an eat→excrete network, and it **closes into a complete autocatalytic ring** — every element
both eaten AND produced by the flora, so the meadow begins to feed *itself* rather than leaning only on
the bare producers. But only above a **diversity threshold**. Measured across 14 meadows at turn 80:
**0/6 closed at 3 living species, 2/5 at 4, 1/1 at 5, 1/1 at 6.** Below ~4 kinds the loop stays open; at
4–5 it closes. Kauffman's order-for-free *requires* Paine's keystone diversity — and nobody designed that
coupling; it fell out of a 3-element cycle and a random-but-different excretion channel.

And the closure **peaks mid-succession, then fades** (turn 40: 6/14 closed; turn 80: 4/14) — because the
flora become **corals**, leaving the flora pool: symbiogenesis *supersedes* the metabolic ring with a
higher union. The autocatalytic set is a rung on the ladder to oneness, not the top.

This milestone had been happening **invisibly**, so I surfaced it: once a meadow grows ≥4 diverse flora
that close the ring, a beat fires — *"the meadow has begun to feed itself… order, for free."* A diverse
meadow earns it (~50% of runs); a sparse one never does. The lesson the sim keeps teaching without
stating it: **diversity is what lets a community become self-sustaining.**

## 2026-06-20 · widening is not a trap — oneness is the COMPACT path (and a probe nearly lied)

Chasing a node/browser reproducibility gap, I realised a real long game **widens** through the stages
(to ~217 cells) while my probes never had. So I tested widening — and it looked catastrophic: every
widened meadow grew **0 corals, no oneness, flourish ~580** vs ~2000 compact. I nearly shipped a fix
(stop the long game widening) for what looked like a wonder-destroying trap, and even built two core
"fixes" (gating the board growth, gating the per-stage pressure) — neither worked.

That two patches failed is what finally made me distrust the *probe* instead of the game. It was an
artifact: `widen()` sets a pending artifact offer, and `endTurn()` returns early — **blocked** — while
an offer is pending (`if (this.pendingOffer) return [{t:'blocked'}]`). My probe never resolved the
offer, so after the first widen the ecology simply never ran again. A real player picks the artifact and
plays on. The recurring lesson, paid for again: **a broken probe gives false confidence — and false
catastrophe.** Robustness ≠ existence; neither does ruin.

With the offer resolved, the truth — and the real signal that was hiding under the false alarm. Widening
is **fine and well-rewarded**: a 217-cell meadow grows a rich food web and scores **~3000 flourish**,
*higher* than a compact one (~2000). But **oneness is the COMPACT path** — widened games reached oneness
**0/6**; compact games **5–8/10**. A bigger board breeds more flora → more grazers and predators → more
combat, and oneness requires the combat to subside (≤ 2). So the long game holds two genuine end-states:
**widen** into a big, teeming, high-scoring ecology that never quite becomes one — or **stay compact**
and let a small meadow weave itself into a single living whole. The restraint thesis again, now at the
scale of the whole board: a world becomes one not by growing without bound, but by holding an intimacy
in which cooperation can win.

(Open tension, logged not fixed: the flourish *score* rewards the big board over oneness, so a
score-optimiser widens and misses the wonder. Worth weighing — carefully — whether the cooperative
climax should out-reward raw size. Not rushed at the tail of a long debugging session.)

## 2026-06-20 · restraint reaches oneness more readily than abundance

Auditing transmission (can a player actually REACH the wonder?), I measured the oneness rate across 20
long games — a denser producer base vs a sparser one, each left hands-off to turn 100. Two findings.

**Oneness is reachable** — not a rare jackpot. It fires for a solid fraction of meadows (5/10 dense,
8/10 sparse), so a player who tends a long game has a real chance of seeing the summit. Good: the climax
transmits.

**And the surprise: the *sparser* garden reaches oneness MORE** — 8/10 vs 5/10, and earlier (turn 67 vs
75). The mechanism is in the end-of-run combat counts: a denser producer base makes more flora → more
grazers and predators → more COMBAT, and oneness requires the combat to subside (≤ 2). Dense runs carry
3–4 hungry consumers at turn 100; sparse runs carry 1–2. The teeming, maximised meadow stays at war with
itself; the gentler one settles into union.

Nobody designed "plant less → more oneness." It fell out of the density↔combat↔cooperation coupling on
its own — and it is the game's whole thesis, emergent: *cooperation, not maximisation, reaches the
whole.* The player's instinct to fill every cell works against the climax; restraint — leaving room — is
what lets the meadow become one. A Gaian lesson the simulation teaches without ever stating it. Left
UNSAID in the game on purpose (the existing onboarding only nudges "leave open ground"): the discovery
is the joy, and a player earning that realisation themselves is the whole point.

## 2026-06-20 · the meadow is a grazing mosaic — but a miniature one (a direction tested & closed)

Chasing emergence, I probed whether the food web self-organizes *spatially*. The grazers roam as
flocked herds over a regrowing resource — the textbook setup for grazing waves, patchiness, Turing
mosaics (tiger-bush vegetation bands, Belousov-Zhabotinsky spirals). It does, faintly: flora cluster
into beds at **~2× random density** (a clear, stable patch structure), and the roaming herds
seek-and-deplete those patches, then drift on — a faithful grazing mosaic.

But it stays **miniature**: ~13 flora at ~20% cover, 1–2 grazers, on a 61-cell board. The ecology is
deliberately "kept tiny so the base economy is untouched," and that lightness is exactly what denies
it the density for *dramatic* spatial pattern. No traveling waves, no Turing spots — too sparse, by
design.

So: a tempting feature direction — surface or amplify spatial patterns — **tested and closed by
measurement**. The lightness is not a gap to fill; it's the constraint that keeps the base garden's
24/24 intact, and the meadow's richness lives in its *narrative* (succession, union, oneness), not its
density. Recorded so the loop doesn't re-chase it. (Negative results are results.)

## 2026-06-20 · the game was always proving its own ending (the seep IS the thesis)

I went down a rabbit hole — Rayleigh-Bénard convection, order that snaps into being at a critical
gradient precisely to dissipate it faster — meaning to build it as a new layer: the abiotic "origin of
order" beneath the food web. Before writing a line, I went to read how the entropy field actually
works, to find where convection would hook in. The rabbit hole collapsed into something better:
**the game already does it.**

The seep — the second law returning each turn — is not a flat tax. `pressure()` scales with coherence:
`slope = 1 + 1.5 · C`. The code's own comment: *"a richer garden has a steeper gradient to the
surrounding dark, so it seeps faster… its own order pulls the dark in harder."* So the more order you
build, the FASTER entropy fights to take it back — because your order steepens the gradient. That is
exactly the thesis the closing capstone just shipped (*"a living world runs the gradient down faster
than bare rock; the order serves the disorder"*). The garden's central tension — build order, the dark
fights harder — has been a working demonstration of the thermodynamics of dissipative structures the
whole time. Measured: a coherent garden (C≈0.7) seeps at ~2× the base rate; at C≈0.95, ~2.4×.

The capstone doesn't ADD the thesis. It NAMES what the seep was always doing — which means the
Rayleigh-Bénard layer would have been mechanically redundant (the gradient already drives the flux).
The right move wasn't a new mechanic but to make the existing one legible: a one-time hint, fired once
the garden is coherent enough to feel it, naming the tension (*"your own order quickens the seep… this
is the tension you tend"*) — the felt setup the ending later reframes.

The lesson, again: read the system before extending it. The wonder I went looking for to BUILD was
already there to be FOUND.

## 2026-06-20 · the ecology arc arrived at the consciousness arc (the meadow becomes one)

I went looking for the next thing to build with no plan, and a play-first probe handed me something
I didn't expect: **the food web, left to run, converges on a clean, measurable, well-timed end state.**

Track the cooperation (corals + pollinators) against the combat (grazers + apex) over a long run, and
every meadow tells the same story: they start balanced (~turn 20–40), cooperation pulls decisively
ahead (~turn 60), and by **turn ~80–100 — the game's own natural end — the meadow is a community of
6–10 corals with the combative consumers all but gone** (combat ≤ 2), richly diverse, and then it just
*holds* there, stable. It is a genuine attractor. Not every meadow reaches it (about 5 of 8 do; the
rest settle one or two corals short) — so it is *earned*, not given.

And here is the part that stopped me: **that attractor is a Gaian holobiont.** A meadow so woven of
union and mutualism that the parts no longer read as parts — which is *exactly* the thing the game's
own murmurs have been circling in their non-dual movement (the self as eddy, "there is only one
thing," "a way for the cosmos to know itself"). The game is, by its own description, "about entropy,
consciousness, and our place in both." I had spent four loops building the **entropy/ecology** half
and treating the **consciousness** half as a separate, hand-authored climax (the garden's awakening).
But the ecology, followed honestly, *walked right up to the consciousness theme on its own.* The food
web's natural endpoint **is** the holobiont; the holobiont **is** the non-dual whole. The two halves
of the game were never two.

So the only thing left to build was a recognition — to let the world *notice* when it has become one,
and say so (with the line that was waiting for it: Margulis's "we are all of us walking communities of
bacteria... a pointillist landscape made of tiny living beings"). I didn't connect the ecology to the
consciousness theme. The mechanics did, and the probe just showed me they had.

*Shipped: `b843e79`. Guard: `[emergence]` oneness — fires 5/8 meadows ~turn 52–106, earned (never young
or combative), deterministic. The murmur progression (24) intact; 26 echoes total.*

---

## 2026-06-20 · the apex that engineers its own obsolescence (predation drives cooperation)

The last beat of the food-web arc was supposed to be the obvious one: a keystone predator (Paine,
Yellowstone) that thins an overgrazing herd and thereby *releases* the meadow — the top-down cascade
to mirror the bottom-up one. I built it. A **play-first probe was blunt:**

**1. A bare culler adds *nothing* here.** With the predator on, corals and diversity were unchanged
(sometimes slightly *lower*). The reason is the previous loop's discovery: this web **sheds combat for
cooperation** — there is no sustained grazing layer for a predator to be the keystone *of*. The classic
move simply doesn't apply to a web that has evolved past it. The probe refused to let me ship the
textbook answer.

**2. So the predator had to DRIVE the cooperation, not oppose it.** The synthesis that resolves the
tension is the whole point of the increment: under predation **fear**, a grazer **flees into union** —
it skips most of its grazing youth, bonds to its flower twice as fast, and the threatened meadow
tolerates more corals (a coral is *immune* to the culler). So the apex, by hunting, drives its prey
into **the very form that escapes it**. It engineers its own obsolescence — it hunts the herd into
coral, and then, with nothing left to hunt, starves. *Combat drives cooperation.* That is not a
metaphor I imposed; it is the only framing under which the predator earned a measurable, positive
effect: a predator-present meadow ends with **more corals (25 vs 18) and more diverse (55 vs 49 kinds)**
than the same world without it (Σ6 seeds). Margulis's "networking, not combat" — except here the combat
*is* the thing that produces the networking.

**3. The apex's effect surfaced two more truths (by breaking guards).** Its extra corals meant grazers
now merge away so fast that they are genuinely **transient** — the test "a grazer emerged" had to start
tracking the *whole run*, because a snapshot at the end finds only pollinators and corals. And the
cascade's RELAXATION moved house: with more hardy corals, pulling the base no longer drops the flora
*count* (the coral skeleton holds it up) — the relaxation now lives entirely in the **living, fed
layer**, which still unwinds to zero. The metaphor keeps becoming the mechanism.

**The shape of the whole arc, in hindsight:** mutualism (the pollinator) said cooperation *beats*
combat; symbiogenesis (the coral) said combat *becomes* cooperation; the dissolution said there was
never a clean line; and predation says combat *drives* cooperation. Four loops, and the food web has
argued itself, from its own mechanics, all the way to Margulis's actual thesis.

*Shipped: `0cfc31d`. Guards: `[emergence]` predation — apex emerges 6/6, combat-drives-cooperation
(more corals + diversity, never a collapse), deterministic. base garden still 24/24.*

---

## 2026-06-20 · the food web sheds combat for cooperation (the herd, and a dissolved dichotomy)

I ran a *play-first* loop — probed the running ecology before building anything — and it told me
things I hadn't designed.

**1. Left to run, the web SHEDS its combative layer.** Over a long run the grazer (the herbivore,
the "combat" trophic level) dwindles to a single vestige while pollinators fill the animal layer.
The food web, unguided, converges to a **cooperative climax** — mutualists and mergers, almost no
grazing. *Margulis's "life took over by networking, not combat" emerging from the mechanics, nobody
having scripted it.* Beautiful — but it also meant the crown jewel I'd just shipped (symbiogenesis)
barely happened within a single turn-100 game: one ephemeral grazer → 0–2 corals by game end. The
feature was nearly invisible in actual play.

**2. One small change, a large effect.** A grazer now arrives as a small **herd**, not a lone
vestige. Merges roughly tripled; corals are present by turn 100; a real herbivore base exists; late
diversity rose. The smallest faithful change with the biggest emergent return — the most on-theme
kind of edit this game rewards.

**3. The herd EXPOSED two coupling cheats I'd shipped without seeing.** With more biomass moving
through the system, two free lunches became visible:
- A dead **fossil scaffold** (established-but-unfed beds, e.g. after pulling the base) was still
  *summoning new fauna* — the animal layer was coupled to standing-dead bed COUNT, not to
  production. Pull the base and fauna floated at ~4 forever. *Fix:* a meadow must be FED to birth
  fauna.
- A grazer cohabiting its diet but unable to merge (coral cap reached) was **immortal** — its "the
  union already feeds me" hunger-decay wasn't tied to a *living* partner. A single grazer clung to a
  dead world for 400 turns. *Fix:* the proto-coral self-feeds only off a PRODUCING partner — so the
  union, too, is coupled to the base. Both cheats were invisible until a herd put load on the system.

**4. The hysteresis became LITERAL.** Grazers don't graze a coral (it's calcified reef, not a
flower), so when the base is pulled the soft web unwinds to zero while the **corals persist as the
fossil scaffold**. The game's old murmur — *"a coral skeleton after the polyps"* — is now exactly,
mechanically what the cascade leaves behind. The metaphor became the mechanism.

**5. The deepest one, which the test suite surfaced by FAILING:** the **combat/cooperation dichotomy
has dissolved.** Food-web I's headline claim was *mutualism is positive-sum — networking beats
combat* (a pollinated meadow ended 17 flora vs a grazed 5). It is no longer true. Once grazers became
gentle specialists that **merge**, an all-grazer meadow ends just as rich as an all-pollinator one
(16 ≈ 16, carrying-capacity bound) AND grows **corals the pollinated one never does** (combat → union).
The mutualist is no longer "better" — because *combat itself became generative.* I didn't decide
this; the assertion broke, I measured why, and the sim had quietly proven Margulis's actual, deeper
point: there was never a clean line between combat and networking. The harness now asserts the truer
thing — the matured web is **all net-positive, and even the grazer ends in union.**

*Shipped: `214ff68`. Guards: `[emergence]` food-web (combat≈cooperation), symbiogenesis (Δ12
diversity now, up from Δ8), the cascade's three-part truth (coupling to ZERO + a coral-skeleton
scaffold). base garden still 24/24, deterministic.*

---

## 2026-06-20 · the merger kept teaching me how merger works (symbiogenesis / the coral)

Building the never-been-a-game-mechanic feature — a grazer and its diet flora *merge* into a compound
kind (a coral) — five things the sim insisted on, each arriving from a measured failure:

**1. A generalist can never merge.** First cut: the bond would not build. A grazer forages the
*nearest* flower, which is almost never its own diet (3 cells out of ~19), so the sustained pairing
symbiosis needs never accrued — the bond crept to 9 over 232 turns and froze. The sim was stating a
real law: **symbiogenesis requires a specialist**, a consumer locked onto *one* producer (coral &
zooxanthellae, lichen, panda & bamboo). Specificity precedes symbiosis.

**2. The consumer eats the relationship.** So I made the grazer a hard specialist — and it ate its
diet to **extinction** at the exact moment the bond completed, destroying the very partner it needed.
A consumer that over-exploits its host cannot form a symbiosis with it. The faithful fix is the heart
of the mechanic: the bond is **cohabitation, not predation** — a bonding grazer *houses* its partner
and forages the *other* flora, never eating the one it is becoming.

**3. The bond stalled exactly one short — and the fix was the truest line.** Even cohabiting, the bond
peaked at **13** (one short of 14) on four of six seeds, then froze: a still-hungry grazer nibbled its
own partner bed down and lost adjacency right at the threshold. What unstuck it is the most faithful
sentence in the whole feature — *a proto-coral is already fed by the union it is forming*, so its
hunger decays while bonding; it need not hunt, and so cannot eat the very flower it is becoming one
with. 1/6 → **6/6** meadows now merge. The mechanic's deepest truth arrived as a bug fix.

**4. The keystone signal is diversity, not biomass.** I set out to repeat the pollinator's proof —
*the merged meadow is richer in flora* — and measured it **null** (95 vs 95). Total flora is
carrying-capacity-bound; adding corals changes the *composition*, not the count. The real signal is
**diversity: +24%** (41 distinct kinds vs 33, Σ6 seeds, never reversed on any single seed). Which is
**exactly how Robert Paine measured the keystone effect in 1966** — pull the keystone and species
*richness* collapses while biomass barely moves. The science corrected my own claim: **Margulis is the
mechanism, Paine is the measurement.**

**5. A lucky seed lied to me.** My first probe (one seed) showed merges working — false confidence. A
six-seed sweep showed only **1/6** actually merged. Robustness is not existence; the per-seed variance
was invisible until I swept, so the harness now averages the keystone claim over seeds.

**Bonus, from the screenshot bench:** the long game **auto-widens** the board in the browser (radius
4→5, 61→91 cells) but not in a bare node grow loop — so the *same seed* grows a *different* meadow
headlessly vs in-page. Determinism holds *within* node (the harness proves it); this is a setup-path
divergence, logged for a closer look at the widen-trigger.

**The wonder, unprompted:** the names the system dreamed for its own unions — *goldcoral · miremeld ·
ashpolypary · umbrachimera · lumencommons · glowsymbiont · fenpolypary*. It reached, on its own, for
**"polypary"** — the precise word for the shared skeleton of a coral colony. Nobody wrote that
expecting *that* cell. The channel + the suffix-pool + the seed did.

*Shipped: `89da6a3`. Guards: harness `[emergence]` — compounds emerge 6/6, the union is GENERATIVE
(diversity), deterministic, survives save→load. Murmur landed on the first union — Margulis,
*Symbiotic Planet* (1998): "at the base of the creativity of all large familiar forms of life,
symbiosis generates novelty."*

---

## 2026-06-20 · the food web taught me something mid-build (mutualism / the pollinator)

Building the first slice of the food web (a pollinator that spreads flora instead of eating it),
five things surfaced that I did not design:

**1. The thesis was already in the game.** The nugget for the whole arc was hiding in the murmur
anthology: *"life did not take over the globe by combat, but by networking"* — Margulis & Sagan,
*Microcosmos*. The game had been quoting its own design principle for versions. So the web leads
with the **mutualist, not the predator.**

**2. Autocatalytic closure emerged by accident.** First cut: I pulled every producer in the cascade
stress-test and flora went **up** (12→26). The pollinator + flora had spontaneously closed into a
self-sustaining loop that needed no mineral base — **Kauffman's "order for free."** I set out to
build a pollinator and accidentally grew an autocatalytic set. Beautiful — but a physical cheat
(nectar is a product of primary production).

**3. The faithful fix revealed a deeper, truer law.** Gating nectar on a *fed* flower (only a
flower that's eating can make nectar) didn't just fix the cheat — it exposed the real long-run
behaviour, measured over 300 turns past the game's normal end. Pull the base and the meadow:
- **RELAXES** — a brief bloom (to ~45 flora) then a long decline (Prigogine: the biomass the
  abiotic base was *subsidising* is shed);
- **COUPLES** — the whole flow-dependent web, metabolism *and* fauna, unwinds to **zero** (genuine
  trophic coupling — the living layer is not decoration);
- **persists as HYSTERESIS** — a small fossil scaffold of niche-built beds survives on
  habitat-memory alone (Holland/Odling-Smee). *A coral skeleton after the polyps.*

**4. A measurement artifact was hiding the truth.** The cascade test had a latent flaw: the long
game hard-ends at turn 100, so it was only ever observing ~15 post-pull turns — mid-bloom, before
the decline. The "everything collapses" and the "nothing collapses" readings were *both* artifacts
of *when* I looked. The real dynamics only appear when you run past the end. (Lesson: always check
the observation window before trusting a trend.)

**5. The earlier "closure" was regime-dependent.** Once roles followed realistic succession
(a consumer arrives first; a pollinator network is the *mature, varied* meadow's reward), the
all-pollinator regime that produced false closure disappeared, and the system relaxed honestly to
the fossil-scaffold state. Same code, different summoning rule, opposite macro-behaviour — a small
illustration of how sensitively emergent outcomes depend on the rules of *who arrives when*.

**Quantified:** mutualism is positive-sum — a pollinated meadow ends **~3.6× richer** in flora than
the same world grazed (17 vs 5). Networking out-produces combat, *measured.*

**The wonder, unprompted:** the names the system dreamed for its own creatures —
*golddancer · sundrifter · emberflutter* (pollinators) drifting over *frostwallow* (the grazer).
Nobody wrote those. The diet + the suffix-pool + the seed did.

*Shipped: `ece74ac`. Guards: harness `[emergence]` — both roles emerge, mutualism positive-sum,
cascade's three-part truth. Long-run probe: `test/_closure_probe.js`.*
