# LOOPHOLE — discoveries

*A lab notebook for the autonomous loop. Part of the fun is seeing what emerges that nobody
designed. Each loop iteration that surfaces something true gets an entry — newest first. These are
findings about the **simulation's own behaviour** (often surprising), not a changelog of features.
Method & telos: `docs/superpowers/specs/2026-06-19-loophole-prime-directive.md`.*

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
