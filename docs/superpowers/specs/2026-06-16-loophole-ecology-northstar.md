# LOOPHOLE — North Star: *The Living Continent*

**Status:** vision / north-star — NOT an implementation plan. It names the destination so the
incremental work (shop → kit page → goals) has something to climb toward. Each section ends at
"buildable," not "built." Where it touches code, it cites the current mechanism so the dream stays
honest about what already breathes.

**Date:** 2026-06-16 · **Horizon:** v0.4+ · **Precedes:** a per-feature spec + plan when a slice is picked up.

---

## 1. The thesis

LOOPHOLE is about the one trick the universe permits: **life is a local eddy that runs *on* the
entropy gradient instead of against it.** A garden is order borrowed from the dark, and the second
law always bills you back. The whole game is the player learning to keep a negentropic structure
standing in a current that wants to flatten it — and, at the end, to *witness* it wake.

Everything below is that thesis scaled up: from placing single cells, to seeding self-propagating
systems, to tending a continent where **life arises, co-adapts, and goes extinct** — and you are the
gardener-witness, not the puppeteer. Annie Dillard is already in the game: *"we are here to witness
the creation and to abet it."* That line is the design brief.

## 2. The shape of a playthrough — three acts, three trophic tiers

The arc of a single game should mirror the arc of life on Earth, and it maps cleanly onto the
**stage system that already exists** (stages = epochs):

| act | tier | you are… | the verb | epoch |
|---|---|---|---|---|
| **I — genome** | micro | placing single patterns | *write the rules* | origin |
| **II — selection** | meso | stamping & pruning self-replicating blueprints | *shape how they spread* | evolution |
| **III — ecology** | macro | tending a continent of interacting systems & fauna | *witness the web* | ecology |

- **Act I (origin):** you establish which patterns and blueprints can exist — the *genome* of this world.
- **Act II (evolution):** conditions *select*; you prune the behavior of self-replicating systems —
  how they expand, where they stop. **This is the act the game is currently weakest at, and §4 is its core.**
- **Act III (ecology):** stable systems interact, ebb and flow, and **fauna emerge on top** (§6–7).

The three tiers are literally **trophic levels of play** — the "levels of play" that make Civ deep,
expressed as ecology.

## 3. Surplus becomes purpose (why this fixes "why would I just hit space?")

The long-standing tension: hoarding order → heat → insight is a degenerate idle. Sim (`test/insight-sim.js`)
confirms a moss-carpet + central-fronds + spam-space strategy is a **stable hands-off insight farm**
(~62 insight by turn 100, accelerating, never dissolves) — but it *parks at stage 4 and never wins.*
It's a grind, not a victory.

The north star **dissolves the tension instead of patching it:** if surplus *feeds* something —
blueprints you stamp, fauna that graze the flow — then farming heat is no longer cheating, it's
**running an ecosystem.** The energy has somewhere to go. A megafauna is a *dissipative structure*:
it exists only while energy flows through it (Prigogine — already a murmur in the game). You dump
your surplus into the world and life adapts to it, then *depends* on it. The exploit becomes the engine.

## 4. Act II — the propagation engine (THE crux)

> *"right now I don't feel like I have much control over how things expand."* — and the code agrees.

### 4.1 Current behavior, and why it feels uncontrollable

- **Moss** (`_mossSpread`): every ~3 turns a mature moss seeds into an empty neighbor — chosen by
  **lowest entropy** (`opts.sort((a,b)=>a.e-b.e); tgt=opts[0]`). A just-pruned cell is empty *and*
  calm, so **moss crawls back inward onto squares you just cleared** instead of advancing to the wild
  frontier. Growth points the wrong way.
- **Fronds** (`_stepFronds`): only propagate if the `sporeleaf` cultivar is unlocked, then a deep,
  thriving frond casts a spore at 12% into a calm neighbor. So "ferns grow but not often."
- **Ants** (`_stepAnts`): eat, grow population toward a cap, occasionally unearth relics — but **never
  found new colonies.** No expansion at all.
- **Blooms** (`_bloomGeneration`): a genuine self-replicating CA (3 neighbors → a 4th) but unsustained —
  blooms wilt unfed, so the population collapses as fast as it blooms.

The diagnosis: growth is either **mis-directed** (moss), **rare/locked** (fronds), **absent** (ants),
or **unsustainable** (blooms). None of it is *player-shaped.*

### 4.2 The unified model: growth = **RULE × GRADIENT × BOUNDARY**

Every propagating pattern gets three legible knobs, and **Act II is the player tuning them:**

1. **RULE** — *when* it tries to spread (a local condition: neighbor counts, sap/order available,
   age, an entropy band). This is the cellular-automaton heart. Blooms already have one
   ("exactly 3 neighbors"); generalize the idea to every grower.
2. **GRADIENT** — *which way* it spreads (a direction bias). Moss should climb **toward the frontier**
   (entropy it can still usefully clean), not retreat into the calm interior. Ants toward disorder.
   Fronds *along* mycelium. The gradient is visible on the board, so the player can *read and steer* it.
3. **BOUNDARY** — *where it stops* (a stop condition the player can place: a wall, an entropy
   threshold, the edge of a mycelial channel, a resource running out, a population cap).

**Player control = landscape design.** You don't micro every cell; you shape the field growth flows
through — lay mycelium channels (water in a garden), place attractors/walls, tend or prune to sculpt
the entropy gradient, and at the meso tier **stamp blueprints that carry their own RULE/GRADIENT/BOUNDARY.**

This single model **fixes the current quirks as a side effect:**
- Moss: change the gradient from "calmest neighbor" → "frontier neighbor within a tolerance band."
  Pruned interior cells have no gradient, so moss stops backfilling them. (A small, shippable fix —
  good first proof of the model, see §11.)
- Fronds: spore *along* a fed mycelial network, not at random — directional, sustainable.
- Ants: when a colony hits its population cap with surplus food, it **swarms** — founds a daughter
  colony toward the nearest disorder (your "replicate ahead of the wave" idea; the `stigmergy` trail
  primitive already exists to bias the direction).
- Blooms: a sustain rule (fed by the network) so the CA can *hold* a population, not just spike it.

### 4.3 Self-replication is already in the game

Blooms are **Langton's loops** in miniature (Langton 1984, *Self-reproduction in cellular automata*):
a small pattern that copies itself when the substrate allows. The meso tier **generalizes the bloom
rule from one cell to a multi-cell stamp** — the smallest unit being a center + 6 neighbors,
`HEX.disk(q,r,1)` = **7 cells.** A blueprint is a motif + a RULE/GRADIENT/BOUNDARY; when its local
condition is met it stamps a copy outward and stops at its boundary. That is buildable because a
piece of it (blooms) already runs every turn.

## 5. Meso — blueprints (self-replicating stamps)

- A **blueprint** is a saved motif of patterns over a small hex region (start at the 7-cell disk;
  allow larger), e.g. *grove* (heartwood + mycelium ring), *colony* (ant + moss skirt), *wetland*
  (mycelium/moss weave).
- **Select** from discovered blueprints, or **capture** a region you built into a reusable stamp
  (the Factorio move — deeper, later).
- **Self-replication:** a blueprint may carry a propagation rule, so a stamped region *expands on its
  own when conditions are right* and *stops at its boundary* — the player programs the growth, then
  watches it run. This is Act II made tactile.
- **Cost / currency:** stamping at scale should spend the **accumulated surplus** (heat/insight or a
  dedicated "biomass" macro-resource — see open questions §12), closing the loop in §3. Resolve so it
  does **not** simply drain the legendary-shop's insight; the macro economy likely wants its own pool.

## 6. Macro — fauna as **niche-summoned**, legibly-emergent life

### 6.1 The make-or-break: legible emergence, not random rolls

A creature must be a **readable function of its world**, or "emergent" collapses into "random mush."
So a creature is **not rolled from a table — it is *summoned by a niche.*** When the world produces a
stable configuration with an unfilled gap (e.g. a dense bloom field beside mycelium = a pollinator-shaped
hole), a creature **condenses to fill it, and its traits are derived from the exact conditions that
birthed it** — the bloom variety, the biome, the entropy band, the neighboring patterns. Its name and
form are composed procedurally, the way **artifact sigils already are** (deterministic from a seed).

The test, every time: **the player can look at the animal and understand *why their world dreamed it.***
Get that and each game grows creatures that are legibly, hauntingly *theirs.*

### 6.2 Scale & succession

Fauna grow with the ecology: **insects → small animals → megafauna.** Bigger fauna require richer,
more stable configurations to exist, so the macro game is a succession — beds become forests, moss
becomes sheets, colonies become districts, and the largest beasts only arise atop a mature continent.
Megafauna are **dissipative structures** (§3): standing waves in the energy flow.

### 6.3 Extinction & the journal — the emotional core

If the ecology shifts too far, a creature **starves and goes extinct — forever.** Every creature that
lived and vanished is remembered in a **journal/catalog** that reuses the existing vessel for memory:
the **codex / murmurs / voices** machinery the game already has. The fragility *is* the thesis —
nothing borrowed from the dark is kept; you were here to witness it. This is the layer that makes a
playthrough mourned, not just won.

## 7. A non-collapsing ecology — *simple balance without re-inventing fragile ODEs*

> *"predator/prey doesn't have to be zero-sum… 'hey give me some of that'… things that weirdly fit
> together into a circle of dependency… even the largest predator must have some weakness."*

This instinct is **exactly right and well-supported by real research.** The trap is continuous
Lotka–Volterra population dynamics, which oscillate and crash. The antidote is to **borrow the
*structure* that real stable webs have, not simulate the fragile equations.** Five mechanisms, each
grounded:

1. **Donor-controlled, partial taking** ("give me some of that"): an interaction transfers a *fraction*
   and never annihilates. Donor-controlled flows are far more stable than victim-controlled ones — no
   boom-bust kills.
2. **Niche / resource-ratio partitioning** ("I consume exactly this combination"): each consumer is
   defined by a *combination* of inputs it needs; rarity = how unusual the combo is ("what are the
   odds"). Coexistence by differentiation, not domination (Tilman's resource-ratio / R* theory, 1982).
3. **Intransitive / cyclic dominance** ("the apex has a counter — many small things prey on it when
   conditions are right"): rock–paper–scissors loops provably *stabilize* diversity — no species can
   run away, because something always counters it (Sinervo & Lively 1996, side-blotched lizards;
   Kerr et al. 2002, *Nature*, E. coli colicin RPS).
4. **Conditional, event-driven, sparse interactions** ("when conditions are right"): links fire on
   thresholds, not continuously → a sparse, slow, legible web instead of tightly-coupled feedback.
5. **Mutualism as first-class** ("weirdly fit together"): facilitation and mutual dependency are as
   common as predation — the mycelium is literally a mycorrhizal mutualist already. The goal is a
   **circle of dependency** (energy flowing in loops), not a chain that topples.

**Why this is the *fun* version, per the research:** May (1972, *Will a Large Complex System be
Stable?*, Nature) showed *randomly* assembled complex webs are almost always unstable — so real stable
ecosystems must be **structured.** McCann, Hastings & Huxel (1998, *Nature*) showed **many weak
interactions** (not few strong ones) are what calm the oscillations. So we deliberately build a web of
**weak, partial, conditional, intransitive, niche-partitioned, often-mutualistic** links. That's not a
delicate simulation we must nurse away from collapse — it's a web that is *structurally* hard to
collapse, which is exactly what keeps it fun and legible.

**ALife lineage to borrow from (all real):** Conway's Life & Langton's loops (self-replication);
Tierra (Ray 1991) and Avida (Adami/Ofria) for digital organisms evolving in a substrate; novelty
search (Lehman & Stanley 2011) for *filling niches* rather than chasing a single objective — the
creature-summoning in §6 is novelty-search-shaped.

## 8. The AI's honest role

The AI is the thing that **dreams the configurations** — it searches the space of what *this* world
makes possible and surfaces the self-fulfilling combinations, the same way it already curates
humanity's words into murmurs and voices. Not a narrator perched above the garden: the **substrate
that imagines.** Woven in honestly, which is the project's standing rule.

## 9. Design principles (guardrails)

1. **Legible emergence, never random.** Every emergent thing is a *readable function of world state.*
   If the player can't infer *why*, it's noise — cut it.
2. **Orchestration, not idle.** "Watching the continent" must stay *deciding* — where to stamp, which
   beast to feed, which to let starve. If it plays itself, it's a screensaver.
3. **Prove the smallest magic first.** Hand-author **one** niche-summoned creature and ship it before
   generalizing. The "born from my world" feeling must be real at N=1.
4. **Tune in the dark with the harness.** Emergent ecologies are the single hardest thing to make
   *good* not merely *present.* Evolve a thousand silent worlds overnight (`test/`-style sims) and
   keep the ones that stay beautiful. Balance claims are backed by simulation, never asserted.
5. **Readability at scale.** A continent needs a macro zoom/LOD tier (the renderer already pans/zooms;
   this adds a simplified "continent" view).
6. **Accurate attribution.** The game cites real humans verbatim; this doc cites real research. Keep it true.

## 10. Surplus economy, restated

micro spends **order ✦** (build) · meso spends **surplus/biomass** (stamp & propagate) ·
the **legendary shop** spends **insight ✸** (escalating 6→12→20→30→45) · fauna *consume the flow itself.*
Heat stops being an exploit because every tier downstream is hungry for it.

## 11. The incremental path (so the dream ships in bricks)

1. **Legendary shop** (specced & priced; first brick). *[near-term roadmap #1]*
2. **Kit / tech-tree page** — make compounding legible. *[#2]*
3. **Goals / score / modes** — civ-style win conditions; "reach goal by turn N." *[#3]*
4. **Propagation v1** — ship the **moss frontier-direction fix** (§4.2) as the first proof of the
   RULE×GRADIENT×BOUNDARY model; then fronds-along-network and ant-swarming.
5. **First blueprint** — the 7-cell disk stamp, manual placement, no auto-replication yet.
6. **Self-replicating blueprint** — one motif that propagates & stops by its boundary.
7. **First niche-creature** — one hand-authored, niche-summoned insect with a procedural name, and the
   extinction journal entry when it dies. Prove §6.1 at N=1.
8. …then generalize: trophic scale, the non-collapse web (§7), megafauna, per-game-unique adaptation.

## 12. Open questions / risks

- **Macro currency:** does meso/macro spend insight, or a new "biomass/surplus" pool? (Leaning: its
  own pool, to protect the shop economy.)
- **Where micro→meso flips:** an expansion threshold (board size / widen count / stage)? Does the
  player keep micro control after, or zoom out for good?
- **Creature representation:** trait-vector → phenotype/name. How rich before it's illegible? Start tiny.
- **Performance:** a continent of cells vs the per-turn `_computeFlows`/step passes. Profile early.
- **The hardest risk:** an ecology that's *interesting-unstable* lives in a narrow band between boring
  stasis and constant collapse. §7's structural choices aim at that band; only simulation will confirm it.

## 13. Relationship to the near-term roadmap

The shop (**build identity**), kit page (**legible compounding**), and goals/modes (**levels of play**)
are not detours — they are the **on-ramp** to this. Each installs a piece the macro game needs:
identity to make builds diverge, legibility to make compounding readable, and objectives to give the
continent something to be *for.* Build the bricks; keep this cathedral in view.

---

*See also: `2026-06-11-loophole-design.md` (foundation), `2026-06-16-loophole-v03-metabolism.md`
(the sap economy this builds on). Memory: `loophole-roadmap`, `loophole-feedback-style`.*
