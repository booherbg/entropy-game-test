# LOOPHOLE — The Emergence Engine (flora, resources, niches)

**Status:** deep-dive design. The system that turns "blooms" into an open-ended, surprising,
*legible* ecology — and the prototype for all later life (fauna). Deterministic, browser-light.

**Date:** 2026-06-17 · **Builds on:** the ecology north star (2026-06-16), the metabolism (v0.3).
**Settled in workshop:** sandbox-first (no imposed score; score demoted to a *vital-signs instrument*
+ optional "aspects"); the player is a **steward of flows**, not a placer of plants; life
self-determines from conditions; the engine of engagement is *emergent surprise + your own goals +
the journal of what you witnessed.*

The brief, in the user's words: *an almost infinite permutation of flora that surprises even the
designers; properties that emerge from what the system produces in excess (natural selection, fast);
richer resources than a single "sap"; scalable diversity; deterministic; browser-based.*

Every constraint points at one architecture.

---

## 1. The core loop (the whole thing in five lines)

1. The steward shapes **flows** (channel / condition / seed / cull).
2. Mismatched flows leave a **surplus** — a resource the world overproduces and nothing consumes.
3. A surplus is a **niche**: free energy looking for a user. It **summons** a flora whose traits are a
   *deterministic function of that surplus* — natural selection, compressed.
4. The new flora **eats the surplus and excretes a different blend** — which becomes the *next*
   surplus, the next niche. The food web extends itself.
5. You **guide** it — feed the flows that sustain what you love, starve what chokes the rest — and
   **witness** what your world dreamed up. Extinctions and discoveries go in the **journal**.

No step needs a score. The web is the reward.

## 2. Resources: simple parts, combinatorial richness (the answer to "more than sap")

A single "sap" can't carry diversity. A *list* of hand-authored resources (water, sugar, nitrogen…)
doesn't scale and isn't emergent. So resources are **not a list — they're points in a tiny elemental
space.** Like color is three channels, a resource is a blend of **three elements**:

- **lumen** — light / free energy / throughput (most of what "sap" was)
- **mineral** — structure / matter / the substance order is built from
- **humus** — decay / recycled matter / entropy-touched nutrient

A resource = a 3-vector `(lumen, mineral, humus)`. That's the **tag system** the user asked about:
the tags *are* the elements, and they compose continuously.

**Why three, and why this is the keystone decision:** three channels **render as a color.** A surplus
of `(0.8, 0.1, 0.4)` is a specific magenta; the flora that evolves to eat it is *tinted by its diet.*
The player reads the world's chemistry as a **palette** — the metabolism becomes visible, beautiful,
psychedelic, and legible all at once (the project's visual pillar). This is the single highest-leverage
choice in the design. (Four elements = more space but loses the clean color map; see §10.)

The existing currencies are untouched and sit *around* the element layer:
- **✦ order** — stored capital (abstracted structure). Unchanged.
- **entropy** — the gradient/pressure you borrow order from. Unchanged.
- **✸ insight** — understanding (meta-currency, cultivars, the legendary shop). Unchanged.
- **❧ "sap"** — becomes shorthand for *the element-flow*, now a spectrum. A producer emits a blend; a
  consumer needs a blend; "fed" means *the blend it needs is flowing to it.*

Producers emit a blend (moss = lumen-rich; ants recycle disorder into humus; crystals = mineral).
Consumers draw a blend. **Matching is overlap in element-space** — a consumer is fed to the degree the
local available blend covers its diet vector. Cheap dot-product math, fully deterministic.

## 3. Surplus & niches (per-region, cheap)

We do **not** track a vector per cell (too heavy). We track a **surplus vector per network / per
region** — aggregate "what does this part of the world have too much of." Each turn, per region:
`surplus = Σ produced − Σ consumed` over the element channels. A region with `surplus·magnitude >
threshold` for K turns has an **open niche** of that color. That's the selection pressure. It's O(regions),
not O(cells²).

## 4. Speciation: traits emerge from excess (fast natural selection — the heart)

When a niche opens, the world **speciates** a flora to fill it. Its genome is a small **trait vector**,
a *deterministic function* of:
- the **surplus blend** (its food → defines its diet, and tints it),
- the **local conditions** (entropy band, neighbor species, soil),
- a tiny **seeded jitter** (from cell+turn via the game RNG) — the "mutation" that makes each one
  particular without being random mush.

From the trait vector we derive, by fixed formulas, the **rule-signature**:
- **diet** — the blend it consumes (≈ the surplus that birthed it).
- **excretion** — a *different* blend it emits as waste (this is what chains the web; §5).
- **birth / survival rule** — its Conway-band and spread geometry (succession: survivors *establish*).
- **settle rate, yield, lifespan.**
- **interactions** — how it reads non-flora neighbors (rooted-by-mycelium, fed-by-moss, pollinated-by-ants…).
- **phenotype** — color (from diet), form, and a **procedural name**, composed like the artifact sigils.

**Why it surprises even us:** we author the *function* (surplus → traits → phenotype), never the
outcomes. The surplus state is itself a deep function of the player's flows and the world's dynamics,
ranging over a *continuous* element-space × conditions. So the space of possible flora is effectively
unbounded and unpredictable — yet every individual is a **readable function of the niche that made it.**
That's the legibility crux from the north star, satisfied: *infinite, surprising, and explainable.*

This is natural selection at speed: a surplus (opportunity) → an organism adapted to it (appears) →
when the surplus is consumed or conditions shift, it can no longer feed → **extinction** (to the
journal). Selection without a fitness function we wrote — fitness *is* "can you eat what's in excess."

## 5. Trophic chaining: the web builds itself

The move that makes it an *ecology* and not a list: a flora **eats one blend and excretes another.**
Flora A drawn by a lumen surplus excretes humus; that humus becomes a surplus; which summons flora B
that eats humus and excretes mineral; … A self-extending **food web / circle of dependency** (the
thing the user wanted, and exactly McCann's many-weak-links stability and Tilman's niche-partitioning
from the north star's ecology research). The player seeds the *first* surplus; the chain is emergent.

Loops close (A's waste feeds C whose waste feeds A) → a **standing cycle**, a self-sustaining meadow
that needs no tending — the *"grow a bed that tends itself"* goal, achieved by the system, not scripted.

## 6. The steward's agency (you farm niches, not flowers)

This is where "no score, set-and-watch" becomes a *game*. You never decide if a flower lives — you
decide **what's in excess**, with the four verbs:
- **channel** — route element-flows; pool a blend here, starve it there → open or close niches.
- **condition** — shift the entropy/soil of a region → change *which* flora a surplus can summon.
- **seed** — drop a flora you've collected into conditions you've built, and see if it takes.
- **cull** — clear a runaway that's flattening the web's diversity.

You are gardening the **fitness landscape**, and life fills it. Every intervention ripples through the
chain. That is constant, high-leverage decision-making — the antidote to the screensaver.

## 7. Determinism & browser feasibility (the "lol" constraint, answered)

- Resources/traits are **small float arrays (3–8 numbers)**. Matching is dot products. Cheap.
- Surplus is **per-region**, computed from sums already in the metabolism. O(regions).
- **The infinite space is generative, not stored.** Only **live species are simulated**, hard-capped
  (~8–16 concurrent). The unbounded variety lives in the *function*, evaluated on demand.
- **Speciation/jitter use the game's seeded RNG** → fully deterministic; same seed + same flows =
  same dreamed-up flora, every time. (Reproducible "wow, look what my world made.")
- The **journal** stores only discovered species' trait vectors + names — a few bytes each.

## 8. Legibility & beauty (the pillar)

- **Resources are colors.** Surplus fields glow their blend; flora wear their diet. You *see* the
  chemistry. Psychedelic and informative at once.
- The **kit / codex** already exists to host the journal and the per-species rule-signatures.
- A flora's card reads like a haiku of fact: *"born of a lumen surplus on calm ground · eats light,
  leaves humus · settles in 4 · pollinated by foragers."* Surprise you can *read.*

## 9. Incremental build path (smallest proof first)

1. **v1 — one dreamed flower.** Add the 3-element resource layer (sap → a default lumen blend, back-
   compatible). Track per-network surplus. When a lumen-or-humus surplus opens, summon **one** flora
   with derived traits + color + name + a journal entry, with succession (it establishes). Ship the
   single screen: *"my world made a flower I didn't plan, and I see why."* If this lands, everything
   else is real.
2. **v2 — variants & the chain.** Excretion → second-order surpluses → a 2–3 link food web. Distinct
   rule-signatures across the element space.
3. **v3 — the steward verbs** as real controls (channel/condition/seed/cull), shaping surplus.
4. **v4 — cross-species interactions & hybrids** at overlaps (rooted/fed/pollinated; named hybrids).
5. **v5 — fauna**: the same engine with motion. Mega-flora and animals that ride the web.

Each ships behind the **long-game / sandbox** mode; the base "garden" stays untouched and debuggable.

## 10. Open decisions
- **The elemental basis** (the keystone): three channels *lumen / mineral / humus* (energy / structure
  / decay) → color. Right primitives? Or different three? Or four (more space, weaker color map)?
- **Speciation cadence**: surplus-threshold-triggered vs a slow clock vs steward-invoked ("let life
  find this niche"). Probably threshold + a cap.
- **How much player nudging** of a flora's traits is allowed (pure witness vs light breeding).
- **Extinction permanence**: gone-forever-but-journaled (heavier, lovelier) vs re-summonable if the
  niche reopens.

*See `2026-06-16-loophole-ecology-northstar.md` (the destination), `…-holistic-eval.md` (current
state). Memory: `loophole-roadmap`.*
