# LOOPHOLE — discoveries

*A lab notebook for the autonomous loop. Part of the fun is seeing what emerges that nobody
designed. Each loop iteration that surfaces something true gets an entry — newest first. These are
findings about the **simulation's own behaviour** (often surprising), not a changelog of features.
Method & telos: `docs/superpowers/specs/2026-06-19-loophole-prime-directive.md`.*

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
