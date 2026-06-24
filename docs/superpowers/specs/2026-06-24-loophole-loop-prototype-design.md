# LOOPHOLE — the successor · the loophole-loop (v1 design)

**Status:** design, **greenlit 2026-06-24** to build autonomously (cron loop). Living spec.
**This is a successor, not a spin-off.** A *new game*, in its own directory — the shipped `loophole/` garden is never touched — but the spiritual lineage to LOOPHOLE must be unmistakable (see §2.5: the murmurs, the research, the voice). Built to last: hardware-accelerated, persistent, backend-ready.
**Decision (build approach):** *begin at the proving loop.* Build the smallest core that proves the feel first — but architect it as the successor's foundation, not a throwaway.
**Context (read for the *why*):** `2026-06-24-loophole-depth-redesign-handoff.md` (the titan critique) · `loophole/DISCOVERIES.md` (the parent's soul) · the dialogue that produced this: `2026-06-24-loophole-successor-genesis.md`.

---

## 1. Why this exists

Blaine played the shipped game and named the disease precisely: it has emergent *bones* but doesn't *feel* deep — **no legible causality, no real decision space, and "entropy as a %" is a trite abstraction.** The redesign reimagines the core loop toward **indirect, SimCity-style stewardship** of a **tangible material substrate** that life adapts to and re-orders.

Rather than rebuild the whole game on speculation, we build a **throwaway-friendly prototype** whose only job is to answer one question: *does this loop feel like magic — legible, surprising, consequential — and not like mush?* The roadmap's repeated lesson is "smallest proof of the feeling first."

## 2. The thesis (what we're proving)

> **Surprise from simple parts, made legible.**
> An indirect player lever → a complex emergent ecology → a *legible, traceable* consequence. The satisfaction lives in the third term being *connected* to the first. Emergence you can't read is noise (we proved this to ourselves the hard way — an early raw-field demo was just a 2D cellular automaton: pretty, illegible, dead-feeling).

Design pillars:

1. **Indirect lever.** You never place the creature. You shape *conditions* (sources, terrain, incentives) and the system computes life.
2. **Legibility is load-bearing, not polish.** A bigger, wilder sim turns to mush *unless* you can read it. Distinct, inspectable **things** (not cells) + on-demand lenses. "They all have it all" — overlays *and* panels *and* the readable world, layered as the world earns them.
3. **Entropy, made visible.** The substrate actively decays toward disorder; **life is the loophole** that captures gradients and holds local order against the tide. This is the title, earned on screen.
4. **Finiteness gives stakes.** Resources are atomic, conserved, consumable. Scarcity → competition → selection → no dominant strategy. Infinite supply would erase every decision.
5. **Richness is local.** Heterogeneous local blends → distinct niches → distinct life. Never homogenize the map into a few big zones.
6. **Principled simplicity.** One primitive, held ruthlessly. Complexity must emerge from interaction, never from authored content or bespoke special-cases.

## 2.5 Lineage, voice & platform — the successor's soul and body

**This is a successor to LOOPHOLE, and the lineage must be *felt*, not stated.** The parent earned its themes by *being* them in code — the wildflowers a calm Game of Life, the ants Szilárd engines drawing work from a gradient, the soundtrack assembling order as yours climbs, the blight the second law given an appetite. *"The game does not depict its themes. It is them."* The successor inherits that contract: every mechanism should **embody** the thesis (entropy → order; life as the loophole), never merely illustrate it.

Carry forward, deliberately:

- **The murmurs.** Real human words — physicists, monks, poets, nearly all long dead — *gathered and arranged*, attributed on the line below with an em dash (Boltzmann's "struggle for entropy," Schrödinger's "drinking orderliness," Margulis's "not by combat but by networking," Anderson's "more is different," the non-dual turn — Watts, Dōgen, Schrödinger's singular consciousness). And the **honest AI presence**: the voice that admits it *gathered* rather than wrote — *"what was mine was the choosing, and the order."* That confession is the soul; the successor keeps it.
- **The research.** Accurately attributed complexity science, woven into mechanism — the parent's canon (Prigogine, Kauffman, Schneider & Kay, Holland, Margulis) plus this design's additions (niche construction, ecosystem engineers, ecological stoichiometry, lignin co-evolution). A **DISCOVERIES** lab-notebook continues here: the autonomous loop records what the simulation *does* that nobody designed — newest first, findings not changelog.
- **The aesthetic.** Lowercase serif; quiet; entropy / emergence / non-dualism; the AI woven in honestly, never as gimmick.

**Built to last (the body).**

- **Hardware-accelerated.** Render via **WebGL2** from the start — a field texture for the material substrate + instanced/point sprites for entities — so the map and population scale far past the parent's Canvas2D hex board. The field's diffusion is a natural GPU ping-pong pass when scale demands it.
- **Determinism preserved as an invariant.** The *authoritative* simulation stays deterministic and CPU-side for v1 (one seeded RNG; harness-testable — the parent's source of truth), with the field structured so diffusion can graduate to GPU compute later without surrendering reproducibility. Determinism vs. GPU float is a genuine tension; we resolve it by keeping the authoritative sim CPU-deterministic until a bit-stable GPU path is proven *(see §6)*.
- **Persistence.** **localStorage** now, behind a thin persistence interface so a **backend** can slot in later (cloud saves, shared/seeded worlds) without touching the sim.
- **Zero heavy dependencies.** Still vanilla — WebGL2 + JS, no framework — runs from `file://` and GitHub Pages, like its parent.
- **Its own directory** (name provisional; never `loophole/`).

---

## 3. The conceptual model

### 3.1 The one primitive — a tagged transformer node

Everything in the world is the **same primitive**: a node that **consumes** a tagged blend and **produces** another, sitting on a finite resource field. It has tags, optionally a rule, and is mutable.

| Face of the primitive | consumes | produces | placed by |
|---|---|---|---|
| **generator** (infrastructure) | ~nothing (ambient) | raw material | the player |
| **transformer** (flora) | one blend | another blend | the player (indirectly, via primer) |
| **consumer** (fauna) | a blend / another organism | waste + behavior | emerges on its own |
| **rule / modifier** *(graduation)* | a tag-combo | a *bonus* | the player |

The primitive never grows. New behavior comes from *chaining* and *mutating* nodes, not from new node types.

### 3.2 The substrate — a finite material field

- A grid of resource "pixels." Each cell holds finite amounts of a few **core elements** × small **variant tags**. Variety is the fuel of emergence (Kauffman's *N*); finiteness is the source of stakes.
- **Entropy is the field's behavior:** left alone it diffuses toward uniformity ("gray"). Diffusion conserves total mass — it spreads and flattens, it does not create or destroy. This decay is the always-running clock/antagonist.
- **Not chemistry, not a scalar.** Enough variety that a specialist who can eat the weird local blend wins; not so much it becomes noise.

### 3.3 Generators — finite fields, delivered with reach

- A generator is a **finite source** (a fixed flux of an element), not an infinite grid. **Range is the *delivery* mechanism, not a grant of infinite supply.** Borrow SimCity's QoL for *distribution* (place a few sources; flow handles spread; no per-cell painting; no footprint; flow through connected terrain) — keep Factorio's *conservation* for the *substance*.
- The injected material **flows/diffuses outward** through connected terrain (this *is* the entropy-diffusion, repurposed as delivery), pooling into gradients; life consumes and depletes it.
- **Tunable:** element + rate. **Projections:** the spatial *shape* of deposit — radial (a spring) and vein (linear). *(Rich geology — faults, basins, noise — graduates later.)*
- **Interference is the richness engine.** Where two fields overlap, quantities **add** and compositions **blend** → a resource that's neither parent → **a niche that didn't exist**. A handful of tunable sources manufacture a heterogeneous map combinatorially, instead of hand-placed. *(Destructive interference graduates later.)*

### 3.4 Starting life — primer & fertility (abiogenesis, abstracted)

- **Primer (paid):** drop a meta-precursor onto a surplus patch → it **latches** (reads whatever's locally in excess) → **spawns** life already adapted to that blend, self-replicating from there.
- **Fertility (ambient/free):** where surplus is rich, an area's fertility climbs and a primer forms *on its own* — life sparks unbidden where conditions allow. Same mechanism, slow/free vs. fast/paid.

### 3.5 Life — legible entities, and how it makes materials

- Life renders as **distinct, inspectable things** with form + diet-color, *above* the substrate (depth = readable identity + interacting layers, **not** height). The **inspector** answers what it is, eats, makes, its state, *and why* (why this color/shape: it adapted to the vein you opened).
- **How life generates materials — without making matter.** Conservation of mass governs (it is the literal foundation of ecological stoichiometry). Two modes, two timescales:
  - **Mode 1 — individual flux (v1).** A consumer eats a blend, keeps the elements it needs (a characteristic stoichiometric ratio), and **excretes the surplus** — re-tagged, mass-balanced; on death it **mineralizes** back to the field. The excreted blend is *derived*: exactly the elements the eater couldn't use — which is *precisely why one organism's waste is another's food*. The self-extending web falls out of stoichiometric mismatch, not authored rules.
  - **Mode 2 — collective accumulation (graduation; "light" is a v1 stretch).** Where a guild persists densely, deposits accumulate into a **constructed source** (soil, reef) that feeds the *next* guild, scaling with population × time. This is **niche construction** (Odling-Smee; "ecological inheritance"), **ecosystem engineering** (Jones, Lawton & Shachak 1994), **stromatolite**-style layer-by-layer building. The substrate shifts over time from **geological** (your generators) to **biogenic** (what life built) — life terraforms its own ground. Gaia.

### 3.6 Compounds — the co-evolution layer (graduation)

- A **blend** is the parts in proportion (linear). A **compound** is a *new identity* — `crystalsap` is not eatable as its parts; a species must **evolve the key to crack it**. That gate spawns co-evolutionary arms races over who can decompose what — real biology (lignin × white-rot fungi).
- **It does not break the primitive:** a compound is just a node's *output* with **derived** properties (no recipe table). Complexity lives in the emergent *chains*, never in the rule.
- **Simplicity guards (non-negotiable):** one primitive · resource tags **capped** (like the species cap) · **always named + inspectable** (unreadable = noise) · **conserved** (mass = inputs; break it to get parts back).
- **Deferred** to keep v1 honest to "not at the sake of principled simplicity."

### 3.7 Layers (the depth model)

Depth = **interacting layers over one flat map**, kept low-friction so each is a *strategic* decision, never a chore. Candidate layers: **material · flow (generators+conduits) · life · rules**. You *read* them one at a time (toggle a lens); they *act* all at once on the same ground. We only add a layer when it earns a real decision. *(v1 ships the material + flow + life layers and exactly one lens; rules and multi-lens dashboards graduate.)*

---

## 4. The v1 prototype

### 4.1 The one satisfying turn

1. **Place a generator** — finite source with reach; a gradient blooms from the gray.
2. **Surplus pools** where flow outruns consumption — and you can read it.
3. **Drop a primer** into the richest patch → it latches → spawns life adapted to that blend.
4. Life **consumes the finite flow** (locks in order), self-replicates, spreads along its food, **mutates toward the local variant**.
5. **Inspect** anything → eats / makes / why-colored / state.
6. **Finiteness bites:** consumption outruns the rate-limited source → scarcity → competition, die-off, or adaptation. You respond — move/add a source, seed elsewhere, or let it ride.
7. **The surprise:** the first colony's *waste* sprouts a second species you never placed.

### 4.2 In scope (the minimum to prove the feel)

- Standalone page; **vanilla HTML/Canvas/JS, zero deps, runs from `file://`**, fully **deterministic** (one seeded RNG).
- A modest grid (target ~64×40; tune for cost) with a **finite, conserved** material field and passive entropy-diffusion.
- **2 generator-placed elements (lumen + mineral) + humus as life's excreted third + 1 variant tag** (enough for specialists to win; not enough to be noise). See §6 — only lumen/mineral come from generators; humus arrives via Mode-1 excretion, which is what makes the food-web surprise work without a third source.
- **Generators:** finite fixed-rate sources; tunable **element + rate**; **radial + vein** projections; fields **add + blend** on overlap.
- **Primer** (paid latch→spawn) + ambient **fertility**.
- **Life as legible entities:** distinct glyph, derived diet-color, **Mode 1** consume→retain-ratio→excrete, self-replicate, mutate-to-local, die→mineralize. **One** consumer interaction (A's waste feeds B).
- **Inspector** (click anything → read it) + **one field lens** (toggle raw-material view).
- A small **harness**: deterministic; asserts the world stays in the live band (not collapsed, not exploded) and diversity persists.

### 4.3 Out of scope (deliberately)

Compounds / reactive resources · Mode 2 full (constructed source-fields, biogenic arc) · full generator tuning UI (range/falloff sliders), rich geological projections, destructive interference, generator drift · rules/modifier zones · multiple lenses & dashboards · big map & terraforming · win/score modes · save/load, audio, journal/codex · any integration with the shipped game.

**Stretch (only if cheap, flagged not assumed):** Mode 2 "light" — deposits persist & accumulate into a weak constructed source, so you can *see* life begin to build its own ground.

### 4.4 Success criteria (the green light to graduate)

1. **Legible** — at any moment you can tell what each thing is, doing, and why.
2. **Causal** — you can trace a result back to your move.
3. **Finite stakes** — scarcity forces real decisions; you cannot flood infinite resource.
4. **Surprise** — ≥1 unscripted interaction/adaptation per session.
5. **Stable band** — neither collapses to nothing nor explodes to uniform goo; diversity persists (harness-measured edge-of-chaos).
6. **The gut test** — it is fun to watch, and it does *not* feel like a 2D CA.

### 4.5 Architecture sketch

Small, focused units (each understandable in isolation):

- **field** — the material grid: finite per-cell element/variant amounts; the diffusion (entropy) step; conserved.
- **generators** — sources, projections, finite-rate deposition into the field; overlap = additive+blend (free, since deposits sum per-cell).
- **life** — entities (position, diet vector, ratio, state, lineage); the node sim: consume→retain→excrete (Mode 1), replicate, mutate, die→mineralize; spawning from primer/fertility.
- **render** — **WebGL2**: a field texture (the material substrate) + instanced/point sprites for entities; the entity (world) view + the toggleable field lens; the "pixels" aesthetic, GPU-scaled.
- **persist** — deterministic save/load to **localStorage** behind a thin interface (backend-swappable later).
- **ui** — toolbar (generator/primer/lens/play-step), the inspector, selection.
- **sim loop** — likely **auto-ticking with pause + step** (the feel is "watch it organize over time," unlike the shipped turn-based garden) — *confirm in §6*.
- **harness** — headless determinism + live-band/diversity assertions; the source of truth for "still working."

## 5. Graduation roadmap (after the proof)

In rough order, each its own spec → plan → build cycle:

1. **Mode 2 full** — constructed source-fields; the geological→biogenic substrate arc.
2. **Compounds & the co-evolution layer** — recalcitrant resources, crackers, arms races.
3. **Generator depth** — full tuning, geological projections (faults/basins/noise), destructive interference, drift/erosion.
4. **The rules/incentive layer** — consume→produce modifier zones.
5. **More elements/variants & trophic tiers**; the full **legibility stack** (multiple lenses + Civ-style panels).
6. **Scale** — the bigger map + terraforming; and the now-*informed* decision: grow the shipped garden in place vs. a new field mode vs. re-foundation.

## 6. Open questions (for review / the plan)

- **Exact element set** for v1 (which 2 elements + which variant?). Candidate: lumen (energy) + mineral (structure), variant on one; humus arrives as life's excretion (Mode 1) — giving the food-web surprise without a third generator.
- **Generators:** fixed-rate only, or a finite reservoir that depletes (geology runs out)? Depletion adds stakes; may be a stretch.
- **Tick model:** auto-ticking real-time with pause/step (recommended for the "watch it organize" feel) vs. turn-based like the shipped game.
- **Mutation cadence** — how fast diet drifts toward local variants (too fast = noise, too slow = static). The harness should sweep this (edge-of-chaos band).
- **Mode 2 "light"** — in v1 as a stretch, or strictly graduation?
- **Grid size / cost** — pick the largest grid that stays browser-light and deterministic.
- **GPU vs. determinism** — when (if at all in v1) to move diffusion to a GPU compute pass; authoritative sim stays CPU-deterministic until a bit-stable GPU path is proven.
- **Backend timing** — localStorage from day one; which backend, and when (cloud saves? shared/seeded worlds?).
- **Name & directory** — provisional; the lineage to LOOPHOLE is explicit regardless.

## 7. Research grounding (attribution — the game's ethos)

- **Entropy / dissipative structures:** Prigogine; Schneider & Kay (a living world dissipates faster than bare rock — already canon).
- **Variety × dependency / order for free:** Kauffman (NK, autocatalytic sets); Holland (Echo, tagged exchange).
- **Niche construction & ecological inheritance:** Odling-Smee.
- **Ecosystem engineers:** Jones, Lawton & Shachak 1994 (*Oikos* 69:373–386).
- **Biomineralization / accumulation:** stromatolites & microbial mats.
- **Conservation + differential recycling:** ecological stoichiometry — Sterner & Elser; the Redfield ratio.
- **Decomposition:** mineralization vs. immobilization.
- **Compounds & co-evolution:** lignin recalcitrance × white-rot fungal peroxidase evolution (Floudas et al. 2012; the Carboniferous "coal gap" causal claim contested by Nelsen et al. 2016).

---

*End of design. Next: writing-plans → implementation plan for the v1 prototype.*
