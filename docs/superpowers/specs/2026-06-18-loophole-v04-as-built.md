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
  entropy"); arrival/extinction/cull toasts; the **journals** in the murmurs codex — "life witnessed"
  (flora, with the colour→diet legend) and "beasts that grazed your meadows" (fauna). `meta.flora` /
  `meta.fauna` persist across runs.
- **audio:** `AU.bloom()` (a rising unfurl when a flower opens), `AU.wither()` (a sigh on extinction),
  `AU.beast()` (a low resonant call when a beast arrives).

## 5. Where it lives
- **core.js:** element consts + `floraColor` + `FAUNA_SUF` (before `class Game`); `_ecology`/`_speciate`/
  `_floraSpread`/`_floraSeedSpot`/`_killFlora`/`_nearFlora`; `_fauna`/`_speciateFauna`/`_stepToward`; the
  `flora` cases in `_sap`/`_mkPat`/`_patJSON`/`prune`; serialize/fromJSON (species, fauna, …). `_ecology`
  + `_fauna` called from `endTurn`, both early-return unless `mode==='longgame'`.
- **render.js:** `drawFlora`, `_drawFauna`, the fauna overlay pass + flora dispatch in `_drawPattern`.
- **ui.js:** the `species/extinct/cull/fauna/faunaGone/graze` event cases; `elemBars`; the journals in
  `murmursOverlay`; `defaultMeta` + migration guards; `?shot=eco|ecometab|fauna`.
- **test/harness.js:** the `[emergence]` section — dense + open-garden + megafauna dashboards & guards.

## 6. Open items (next)
- **Predation / parasitism BETWEEN fauna** — the foundations doc's tag-primitive unification (the same
  tag-matched-exchange, different sign): a spider binds to prey, a parasite to a herd. This is the H3
  strategic call (generalise onto tags vs keep the surplus-summoning style). Biggest next lever.
- **Fauna visibility at full-board zoom** — beasts read modestly on a large board; fine zoomed in.
- **Base-economy `c.e` quantization** breaks save→load→endTurn determinism in ALL modes (pre-existing;
  the harness roundtrip check can't see it). Base owner's call.
- **Excretion food-web** is ~tuned but the deeper autocatalytic loops want more channels / tag richness.

*Design intent: `…-emergence-engine.md`, `…-emergence-foundations.md`, `…-ecology-northstar.md`.
Memory: `loophole-roadmap`.*
