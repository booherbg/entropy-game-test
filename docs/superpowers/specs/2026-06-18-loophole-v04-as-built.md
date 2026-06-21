# LOOPHOLE — v0.4 Ecology, As-Built

**Status:** the source-of-truth record of what actually SHIPPED (the design docs describe intent;
this records reality). The full emergent ecology now runs, autonomously, end to end, in the **long
game** mode only — the base "garden" (awaken) game is untouched and stays a clean **24/24**.

```
surplus  →  flora  →  beds  →  meadow  →  megafauna
(of an     (niche-    (niche   (a surplus  (grazing beasts, summoned by
 element)   summoned)  const.)  OF LIFE)    abundance, depending on it)
```
Each trophic level is summoned by the *abundance of the one below*. Nothing is scripted. All of it is
deterministic (one seeded RNG stream) and browser-light (small vectors, O(regions/agents)).

---

## 1. Resources — a 3-element economy (the substrate)
`PROD_BLEND` (core): moss→**lumen** (light), crys→**mineral** (stone), ant→**humus** (rot). A resource
is a 3-vector; `floraColor` renders it as a **colour** (lumen=chartreuse, mineral=cyan, humus=violet).
Each turn `_ecology` sums element production; an **uneaten, sustained surplus is a niche.** Visible to
the player as the **element bars** in the metabolism panel ("the elements · what life eats").

## 2. Flora — the first emergent life (`_ecology`, `_speciate`, core)
- **Speciation:** a sustained surplus (per channel, up to 2 species/channel under larger surplus)
  speciates a flora whose **diet is the continuous shape of the surplus vector** (not a 3-bucket
  archetype) — colour, entropy band, and identity all derive from it. Name = `FLORA_PRE[ch] × FLORA_SUF`
  (goldfern, quartzveil, ashlace…). Fitness = "can you eat what's in excess."
- **Succession:** a pioneer lives/dies by conditions; a survivor (age ≥ settle) **establishes** into a
  permanent bed.
- **Niche construction** (Holland/Odling-Smee): an established bed nudges its own cell AND its empty
  neighbours toward its entropy band — it builds its own habitat, so beds can spread.
- **Territory / allelopathy:** moss won't spread into a cell adjacent to a flora (`_nearFlora` guard in
  `_mossSpread`, gated on `species.size>0` → zero base-game cost), so beds aren't out-competed for ground.
- **Beds form** where there's OPEN ground (a moss-saturated garden leaves none — by design, the player
  must leave room). **Excretion** opens second-order niches (food web); **extinction** → journal.
- Harness metrics (open garden): **peak ~6 species coexisting, biggest bed ~8 cells, deterministic.**

## 3. Megafauna — the next trophic level (`_fauna`, `_speciateFauna`, `_stepToward`, core)
- A **rich meadow** (≥8 established flora, ≥2 species, sustained) is a surplus of LIFE → speciates a
  roaming **beast** that specialises on the meadow's dominant flower (name = `FLORA_PRE × FAUNA_SUF`:
  stonestrider, ironpacer, mireelk…). Beasts are **mobile agents** (`game.fauna` list of `{spId,q,r,
  age,hunger}`, an overlay — not rooted patterns).
- **Dissipative structure:** lives only while the meadow feeds it; starves → journal when it fails.
- **NON-COLLAPSING predator-prey** (the key tuning — first cut was textbook Lotka-Volterra and crashed
  to zero): graze **one flower/turn** (donor-controlled) + **eat-to-satiety-then-rest** (`GRAZE_NEED=4`)
  + a **prey REFUGE** (won't graze flora below 6). Droppings → humus (fertilise the cycle); well-fed
  beasts **breed** (herd to `FA_CAP=5`).
- Harness guard: a rich meadow run 100 turns → **beasts persist (live@end ~4) AND flora persist
  (~14)** — a stable circle of dependency; deterministic; base game stays fauna-free.

## 4. Witnessability (render / ui / audio)
- **render:** `drawFlora` (form + colour read the diet — light-eaters spare & star-pointed, rot-eaters
  lush & full; established beds glow), `_drawFauna` (a large dark-outlined grazing beast in its diet
  colour, drawn as an overlay).
- **ui:** the haiku-of-fact **cellTip** ("eats light, leaves rot · established · thrives at N–N%
  entropy"); arrival/extinction/cull toasts; the **journals** in the murmurs codex, reshaped so the
  food web reads as a *web* — "life witnessed" (flora, colour→diet legend), **"unions"** (each coral
  naming the two parents it was born from — `beast ⊕ flora`), and fauna split by **role** ("herds · the
  grazers", "mutualists · the pollinators", "apex · the cullers"), each with a one-line note. `meta.flora`
  carries `compound`/`flora`/`beast`; `meta.fauna` carries `role`/`eats`; both persist across runs (old
  saves degrade gracefully — roleless beasts read as grazers).
- **audio:** `AU.bloom()` (a rising unfurl when a flower opens), `AU.wither()` (a sigh on extinction),
  `AU.beast()` (a low resonant call when a beast arrives), and the food-web voices: `AU.merge()` (two
  voices glide into a unison, then a warm bell — symbiogenesis sounding like itself), `AU.oneness()` (a
  warm chord swelling into one sustained bloom), `AU.predate()` (a sharp low strike, the apex's cull).

## 5. Where it lives
- **core.js:** element consts + `floraColor` + `FAUNA_SUF` (before `class Game`); `_ecology`/`_speciate`/
  `_floraSpread`/`_floraSeedSpot`/`_killFlora`/`_nearFlora`; `_fauna`/`_speciateFauna`/`_stepToward`; the
  `flora` cases in `_sap`/`_mkPat`/`_patJSON`/`prune`; serialize/fromJSON (species, fauna, …). `_ecology`
  + `_fauna` called from `endTurn`, both early-return unless `mode==='longgame'`.
- **render.js:** `drawFlora`, `_drawFauna`, the fauna overlay pass + flora dispatch in `_drawPattern`.
- **ui.js:** the `species/extinct/cull/fauna/faunaGone/graze` event cases; `elemBars`; the journals in
  `murmursOverlay`; `defaultMeta` + migration guards; `?shot=eco|ecometab|fauna`.
- **test/harness.js:** the `[emergence]` section — dense + open-garden + megafauna dashboards & guards.

## 6. The food web — Margulis-first (mutualism, then merger)
The megafauna chain becomes a **web**, leading (per Margulis) with cooperation, not combat.
- **Mutualism — the pollinator** (`_fauna` role branch; shipped `ece74ac`): a rich AND varied meadow
  (≥3 flora species) summons, by succession after a grazer, a **pollinator** — it sips nectar from a FED
  flower (never kills) and carries that flower's kind into open ground (`_floraSpread`). It was once
  cleanly positive-sum (17 flora vs a grazed 5) — but see *the dissolution* below: once grazers became
  gentle mergers, that gap closed.
- **The herd & the coupling** (`214ff68`): a grazer now arrives as a small **herd**, not a lone vestige,
  so symbiogenesis is present within a turn-100 game and a real herbivore base exists. The load exposed
  two coupling cheats, now fixed faithfully: fauna are summoned only by a FED (producing) meadow (a dead
  fossil scaffold no longer births them), and a cohabiting grazer self-feeds only off a PRODUCING partner
  (so the union is base-coupled too). Pull the base → the soft web unwinds to ZERO while the **corals
  persist as the fossil scaffold** (grazers don't graze calcified reef — "a coral skeleton after the
  polyps" made literal). The refuge now decrements live so a herd can't overshoot it on a stale count.
- **The dissolution** (`214ff68`): the **combat/cooperation dichotomy dissolved**. An all-grazer meadow
  now ends as rich as an all-pollinator one AND grows corals (combat → union) the pollinated one can't —
  "networking beats combat" is no longer true because combat itself became generative (Margulis's actual
  point). The harness asserts the matured web is **all net-positive, even the grazer ending in union**.
- **Symbiogenesis — the coral** (`_shouldMerge` / `_symbiogenesis`, core; `FAUNA_MERGE_SUF`, `MERGE`
  consts): Margulis's *actual* radical claim — major novelty comes from MERGER, not competition (the
  eukaryotic cell is a union; mitochondria/chloroplasts once free-living). A grazer that has (1) lived a
  grazing **youth** (`age ≥ MERGE.YOUTH`), then (2) **cohabited** as a specialist beside its OWN diet
  flora long enough (`bond ≥ MERGE.BOND`) does not graze it again — it **merges** into a **compound KIND**:
  a sessile, self-feeding, reef-building **coral** (`FLORA_PRE × {coral,reef,zoophyte,chimera,meld,commons,
  polypary,symbiont}` → goldcoral, miremeld, ashpolypary). Key faithfulness moves the build *discovered*:
  the bond is **cohabitation, not predation** (a generalist never forms the exclusive pairing symbiosis
  needs); a bonding grazer **houses its partner, never eats it** (forages around it); and a proto-coral
  **self-feeds off the nascent union** (hunger decays while bonding) — without that it would eat its
  partner to extinction and stall one bond short. The compound is a flora species `compound:true` with
  emergent capabilities over either parent: a **wider entropy band** (lichen tolerance) and a **stronger
  reef** (`MERGE.REEF` niche construction). One-way (a ratchet); the consumer niche refills (a new grazer
  grows), so unions recur up to `MERGE.SP_CAP`.
  - **Measured (harness `[emergence]`):** compounds emerge 6/6 meadows · deterministic · round-trip through
    save/load. **GENERATIVE / keystone** — a meadow that lets its grazers merge ends MORE DIVERSE (Σ6 seeds:
    41 kinds vs 33, **+24%**) while total flora COUNT is null (95 vs 95, carrying-capacity-bound). *Discovery:*
    the keystone signal lives in **diversity, not biomass** — which is exactly how Robert Paine measured the
    keystone effect (the 1966 *Pisaster* removal: richness collapsed, biomass didn't). Margulis-as-mechanism,
    Paine-as-measurement.
- **Witnessability:** `_drawCompound` (a calcified branching coral — cream skeleton + fat polyps in the
  symbiont's colour, distinct from any flower); the `merge` FX (a convergent bloom + a calcified ring); the
  arrival **toast** ("…becomes one with it… symbiogenesis — the union Margulis foresaw"); the coral
  **cellTip** (its two parents · self-feeding · hardy band); the merge **murmur** (Margulis, *Symbiotic
  Planet* 1998 — "at the base of the creativity of all large familiar forms of life, symbiosis generates
  novelty", landed on the first union); `?shot=coral`.
- **Predation — the apex** (`0cfc31d`; `_hunt` / `_speciatePredator`, core; `FAUNA_PRED_SUF`, `PRED`;
  `_drawPredator`): the top-down counterpart to the bottom-up summoning chain. A grazer **herd** summons a
  keystone **culler** that hunts it under the same non-collapse discipline (donor-control, refuge-bounded,
  dissipative — it boom-busts, as apex predators do). A bare culler adds nothing to a web that sheds combat
  for cooperation, so the apex DRIVES the cooperation: under predation **fear** a grazer flees into union
  (`MERGE.YOUTH_FEAR` + faster bond + `MERGE.FEAR_CAP` raises the coral ceiling — a coral is immune to the
  culler). The apex hunts its prey into the very form that escapes it: **combat drives cooperation**
  (Margulis, all the way). Measured (harness `[emergence]`, Σ6 seeds): apex emerges **6/6**; a predator-
  present meadow ends with **MORE corals (25 vs 18)** and **MORE diverse (55 vs 49 kinds)**, 6/6 stay alive,
  deterministic. Witnessable: a lean red `_drawPredator` (raised sharp muzzle, slit eye, vs the grazer's
  placid dipped head), a `predate` kill FX, an arrival toast (the cycle + the fear→union mercy);
  `?shot=coral` now stages the full web (corals + a remnant herd + the apex).
- **The meadow becomes ONE** (`b843e79`; `_oneness`, core): the long game's quiet awakening, where the
  ecology arc meets the **consciousness** arc. When the food web reaches its COOPERATIVE CLIMAX — a real
  community of corals (≥6 mergers), the combative consumers all but gone (≤2), richly diverse (≥6 kinds),
  sustained — the whole is recognised as ONE: a Gaian holobiont (Margulis's literal subject). A gentle
  whole-board breath (golden pulse from centre), a toast, and a standalone murmur (idx 25, outside the
  progression — shown only here): Margulis & Sagan, *Microcosmos* (1986), "we are all of us walking
  communities of bacteria… a pointillist landscape made of tiny living beings." Measured: fires 5/8
  meadows ~turn 52–106, EARNED (never young/combative), deterministic. The food web's natural attractor
  *is* the holobiont — the two halves of the game ("entropy, consciousness") were never two. `?shot=oneness`.
- **Flourishing = cooperation** (`flourishScore`/`flourishBreakdown`/`flourishGrade`): the long game's reward
  once called "megafauna the pinnacle" and rewarded fauna *count* — but the cooperative climax SHEDS the
  combative layer (grazers → corals), so a meadow that became *one* could score *lower* than a teeming
  combative one: the goal rewarded the opposite of the game's deepest theme. Realigned: **unions woven
  (corals) ×70** and **the meadow became one +600** are now the top-rewarded components, and a meadow that
  reaches oneness earns the summit grade **"a world that became one"** (above "a flourishing world").
  Measured: a cooperative meadow scores ~+1000 over the same world combative; ✦2677 vs ✦1450. `?shot=longend`.
- **…and cooperation > *teeming*, too** (`7fa5af9`+`2010226`, 2026-06-21): that first pass made the
  cooperative bonuses additive, but they STILL lost to raw board SIZE. A verified test pitted a compact
  gardener (reaches oneness) against a widener (big teeming board) over 8 seeds and the **widener won 8/8**
  (e.g. ✦2675 no-oneness > ✦1840 oneness): `live×4` and every size-correlated term buried the cooperative
  bonuses — `flourishScore` was contradicting its own comment ("cooperates, not teems"). Fix: oneness now
  **AMPLIFIES** the whole flourishing **×1.5**, it doesn't merely add — so a compact world made one
  out-flourishes a big one that only teemed (✦2760 > ✦2675), while a big world that ALSO became one still
  wins (the apex is a *large* whole, not a small one). `flourishBreakdown` gained an exact lift row so the
  itemization still sums to the displayed score.
- **The closing thought** (`onLongEnd`): the long game ended on a scoreboard with no reflection (the garden
  game closes with "it woke…"). Now it closes with the **thermodynamic capstone** — the loophole resolved.
  In real non-equilibrium thermodynamics (Schneider & Kay's airborne thermal data: old-growth forest 24.7°C
  degrading ~90% of solar input vs a clearcut at 51.8°C/~65%), a living world runs the gradient DOWN faster
  than the bare rock it rose from — so the order never defied the second law; the order was disorder's own
  quickest path. "There is no outside" resolves. The closing prose scales to whether the meadow became one,
  callbacks the anthology's Heraclitus, and is anchored by a verified line: *"nature abhors a gradient"* —
  Schneider & Sagan, *Into the Cool* (2005). (The strong MEP "law" is contested; the prose states the solid
  empirical observation, not the law. Research brief verified the science + the quote against primary sources.)
- **The long game's murmur cap** (`echoCap`): raised to 14 (garden stays 6) — a 100-turn run earns far more
  murmurs than the garden sprint, and the cap of 6 was spent by turn 15, so the food-web murmurs never fired.
  Now ~11–12 surface across the run; the Margulis "symbiosis generates novelty" line lands on the first union.
- **The bridge to the wonder** (`winOverlay`): the *transmission* fix. Found by playing as a new player —
  the base garden's awakening (the first win) offered only "go deeper · difficulty N+1" (a *harder* base
  garden) and "begin again." It never pointed to the long game, where the entire food-web / oneness /
  thermodynamic-capstone arc lives. So a player could master the base garden, be steered into ever-harder
  base gardens, and **never discover the wonder** — the telos ("let other minds follow the path") failed at
  the one bridge that mattered. Now the awakening invites it: a "tend the long game →" button (first, prominent)
  plus a line naming what arises (flowers, beasts, unions, "a world that becomes one"). The base garden stays
  the first experience (default mode unchanged); the win is now the on-ramp to the deep game.

## 7. Open items (next)
- **Coral / fauna visibility at full-board zoom** — corals (like beasts) read small on a large board;
  fine zoomed in. The render path is verified (the dispatch runs), the legibility is the open item.
- ~~**node↔browser ecology divergence**~~ — **understood, not a bug**: a real long game widens through the
  stages (the *player* takes the golden choice; node grow-probes simply never did), reaching ~217 cells by
  stage 6. Determinism holds (same seed + same widen choices → same world). The real finding (DISCOVERIES,
  2026-06-20): widening is well-rewarded (~3000 flourish) but **oneness is the COMPACT path** (widened
  0/6 vs compact 5–8/10 — a bigger board breeds more combat, and oneness needs it ≤ 2). The long game's
  `widenReady` prompt now names that tradeoff so the player doesn't foreclose oneness blind. *Open design
  question (the creator's call): the flourish NUMBER rewards the big board, while the GRADE ("a world that
  became one") already crowns oneness — should the cooperative climax also out-score raw size, or is the
  number-vs-grade split the right two-paths design?*
- ~~**Base-economy `c.e` quantization** breaks save→load→endTurn determinism~~ — **FIXED** (save format
  v3): the sim's floats (`c.e`, `eMin`, `carry`, `insightFrac`, ant `food`, storm/blight queue positions)
  are now serialized at full precision, and cells are serialized in **insertion order** instead of sorted
  — the live cell Map is in insertion order and the ecology consumes RNG while iterating it, so a
  sorted-on-reload board drew a divergent sequence. Save→load is now byte-exact (flourish Δ = 0 over 40
  turns across seeds; harness all-determinism green). v2 saves still load (fromJSON is version-aware).
  Completed: the sustained run-counters (`faunaRun`/`predRun`/`onenessRun`/`autocatRun`) are now serialized
  too — a save mid-accumulation was the one remaining hole (only `surplusRun` had been saved).
- **The meadow feeds itself** (`_autocatalysis`, core): a witnessable food-web beat that had been emerging
  invisibly. The flora eat one element and excrete another; once a meadow grows ≥4 diverse kinds whose
  excretions **close the ring** (every element both eaten and produced by the flora), it begins to feed
  itself — Kauffman's autocatalytic set, gated by Paine's diversity (measured: 0/6 closed at 3 species,
  reliable at 5+). A mid-succession milestone before symbiogenesis supersedes it; fires in ~50% of runs
  (the diverse ones earn it). See DISCOVERIES.md.
- ~~**Excretion food-web** is ~tuned but the deeper autocatalytic loops want more channels~~ — the
  autocatalytic loop is now confirmed real *and* surfaced (above); deeper channel richness still open.

- **Verified robustness** (2026-06-21, measured this session): the engine is fast and the save is small.
  Worst-case per-turn cost on a maximally-widened board (radius 8, 217 cells, full ecology — 209 living,
  7 herds, 5 corals) is **avg 2.1ms / max 5.4ms** — every turn well under one 60fps frame (16ms). The
  contemplative pace is a *design choice*, not a compute ceiling (~10ms/frame headroom sits unused). The
  serialized save at that size is **26.5 KB** — 0.5% of the ~5MB localStorage quota — and roundtrips
  byte-exact, so the full-precision determinism fix costs nothing. (The food web is also continuously
  fuzzed, and the wonder's reachability asserted — ≥half of meadows must reach oneness — in the harness.)
  Robust on every axis measured.

*Design intent: `…-emergence-engine.md`, `…-emergence-foundations.md`, `…-ecology-northstar.md`.
Memory: `loophole-roadmap`.*
