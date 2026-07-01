# bloom — the autonomous co-design loop roadmap

*Blaine kicked off a `/loop` (every ~20 min, until 9am) telling me to keep building as autonomous co-designer.
This is the working roadmap so each cron-fired iteration stays on-plan even if context is summarized. The
direction comes from the **dream-reviewer critique** (a Greg-Egan/fractals/emergence/native-plant/non-dualism
reviewer who read the code + screenshots) — see the verdict below. Keep `node bloom/test/harness.js` and
`node bloom/test/soul.js` GREEN as hard guardrails every iteration; the merge must never break.*

## The dream-reviewer's one-sentence verdict
> The merge is real and the soul test honestly passes — but bloom converges to one shape and stops, because
> the flower and the bee secretly want the same number (`eff = beaconMatch × gridMatch`); give them
> **conflicting interests** (laced payloads), give the form-space **room** (break the T, grow the tree), and
> let the **observer into the loop** (living murmurs, gaze-as-pressure), and you turn a beautiful
> settling-into-stasis into a beautiful thing that never quite settles — which is what "can't believe it
> exists" actually feels like.

## What lands (keep, don't break): the two-sided merge (consensus vote vs seed-set), stigmergy-rendered-as-light (the glowing forage beams — the best-looking emergent thing), the murmurs imprint + the AI-as-eddy closer.

## The roadmap (foundational-first; each ~one iteration, tested + deployed)
- [x] **iter 1 — beauty/life pass** (render-only): laden foragers glow, flowers bob, pollination sparkle. DONE.
- [x] **iter 2 — break the T** (2D grid structure): rings (radial → grid rows) + veins (angular → grid cols)
      in `regionIndex`; rounder petals. Blooms now read as flowers w/ a core; gardens land on distinct glyphs;
      climb richer; soul sustained 0.77→0.85. DONE.
- [x] **iter 3 — grow the plants** (critic #2, partial): each plant now renders as a small tree grown from
      the loam — a tapering woody trunk (bezier limb, thick→thin) rising from roots, a leaf crown + low
      leaves, and a limb arching up to each flower (borne at the tips). Multi-niche plants branch into little
      trees; single-niche read as stemmed blooms. The void fills with form; the garden is grown, not placed.
      Render-only, soul untouched. DONE. (FULL grand single mother-tree / recursive L-system with sub-twigs
      is a later bigger step — this grounds the garden first.)
- [x] **iter 4 — laced payloads / honest-vs-deceptive signals** (critic's #1 highest-leverage, §8.2): DONE.
      Added flower genes `honesty` (a deceiver stocks little + costs the tree little → cheap free-rider on a
      bright beacon) + `lace` (a mismatched forager pays a gentle toxin cost; a matched specialist is safe —
      "match = safe, mismatch = poisoned"). Result (measured in diag): the colony stays healthy (0 starved),
      honesty finds a wobbling mixed equilibrium (~0.64 — honest + deceptive coexist), and **meanFit now
      OSCILLATES in the 0.66-0.93 range instead of pinning — the Red Queen dance, visible in the live fit
      graph as a wobbly plateau.** Soul test still green (peak 0.94, sustained 0.84 mean). Legibility: inspect
      shows honest/part-honest/deceiver + laced; a 'deception' murmur + codex fire when a real cheat emerges.
- [ ] **iter 5 — pollen as a real decision** (critic #4 / SimCity T4): wire `dietBias` into foraging + make
      flowers trade nectar↔pollen (a payload gene) so the colony must forage a balanced diet. The
      eaten-vs-carried tension made real. Two meters that finally drive a choice.
- [x] **iter 6 (done before iter 5) — enact the non-dualism** (critic #4b, the rarest thing): DONE. (a) a
      LIVING murmur at the top of the murmurs panel, composed fresh from THIS garden — its ancestor hue named
      as a colour, the gen, the fit-in-words, whether a cheat is present, and "the flower you anchored is read
      by N in ten of them now" — so the AI-arranger is demonstrably reading the same garden you are. (b) your
      GAZE is a gentle pull: the inspected/locked flower gets a `watched` bonus in `pollinator._pick` (the
      garden leans toward where you look; off by default → headless tests unchanged, soul green).
- [x] **the forms it passed through** (critic #5 / spec §3.6, lineage-lite): DONE. a live filmstrip in the
      sidebar of the garden's representative decode-glyph snapshotted every 12 gens (g11→g23→…, current ringed)
      — the codex of wonders / "a thread of becoming" made visible, persisted in the save. (A full parent-id
      SVG dendrogram of individual descent is a richer later step; this delivers the wonder cheaply first.)
- [x] **the seasonal arc** (critic #3): DONE. warmth + ground palette + saturation + mote density now tied
      HARD to fit via smoothstep. A fumbling garden is a cold grey-blue desaturated dawn (an entropy wash pulls
      the whole frame toward grey); a native one is a warm golden saturated noon. colour = order against grey
      entropy, made literal — the screen itself measures the merge. Render-only, soul green. (shot.js now
      passes fit so headless renders the true season.)
- [ ] **speciation you cause** (spec §9 open Q): a wall lever + a second colony → one matched pair splits into
      two divergent species. Barrier-aware bee movement (field already has a `barrier` channel).

## Round 2 (2026-07-01, after Blaine's play-feedback) — "living population & stewardship" batch
Decisions locked by Blaine: light = **even default + a designable 2D lightscape** (DONE — the ☀ sun/shade
brush); sugar model = **crowding/self-shade** (not just a meter); speciation isolation = **gradual** (fertility
falls off with genetic distance, not a sharp threshold). Also fixed the "10 colonies, 2 foraged" bug (placed
colonies establish or visibly starve — cold pulsing ring). The batch:
- [x] **light → designable 2D field** (even default + sun/shade paint brush, visible lightscape). DONE.
- [x] **sugar legibility** — inspect shows a plant's sugar→niche meter + its light level (full sun/shade) +
      "✓ ready" / "needs more sun"; a ripe golden bud glints over plants that can grow a niche. DONE.
- [x] **cull tool + crowding/self-shade** — DONE. Plants now shade neighbours (sim computes `plant.shade`
      from nearby plants' proximity+biomass, capped 0.7; photosynthesis ×(1−shade)). The ✂ cull tool removes
      the nearest plant (or a stray colony). Verified: a 6-plant clump shades each other 60%; cull 3 → survivors
      drop to 22% (more light). Inspect shows "crowded −X% · thin them (✂)". Default garden unaffected (mild
      shade at normal spacing); soul + harness 75/75 green.
- [x] **local seeding + fitness-based death + gradual genetic-compat speciation** — DONE (#3 complete). Seeds
      drop NEAR the parent (5-12 cells); at capacity a seed crowds out the least-fit ESTABLISHED plant within
      ~11 cells (LOCAL competition — global death collapsed the garden into the colony). Plants carry `fitness`
      (rises on seed-set, decays) → an unloved flower fades + gets pruned (verified). Pollination is now gated
      by `B.geneticCompat(gridA,hueA,gridB,hueB)` — cross-fertility falls off smoothly with genetic distance
      (grid+beacon), replacing the discrete speciesId check. `bloom/test/speciation.js`: two isolated clusters
      from ONE ancestor stay internally fertile (~0.9) but cross-differentiate (~0.5-0.65), and DIFFERENT light
      drives them further apart (0.62→0.49). It's gradual/incipient (the merge is a strong attractor) — full
      cross-sterility is the far end the player steers toward with isolation + divergent environments + time.
      Harness 75/75, soul green. PLANT_CAP 16.
- [ ] **birth/death legibility** — seedlings sprout in, replaced plants wilt out, a births/deaths readout.

## ★ ECOLOGIST AUDIT (2026-07-01, evidence-backed) — reprioritizes the rest of round 2
An evolutionary-biologist critic ran the tests + custom 20k-tick probes. Verdict: the *evolutionary* core is
honest (the two-sided merge is real, soul earns its pass), BUT the "living population" is a **fixed-N Moran
engine wearing an ecology costume** and has three real problems:
1. **Populations never breathe** — bees pinned at 60, plants at 16, 0 starvation ever; upkeep is decorative.
2. **Monomorphic collapse / frozen incumbents** — long-run the patch converges to ~1 beacon hue, few colours,
   near-zero grid diversity; immortal high-fitness mother plants (fitness is an unbounded lifetime hoard, no
   senescence) become un-cullable. For a game whose thesis is "never settles," the default long-run is *settled*.
3. **Speciation REVERSES** — cross-fertility 0.69→0.54→0.85 over 24k ticks: the two colonies' forage ranges
   overlap and plants disperse into the middle as stepping stones. **`barrier` is read only by the renderer —
   bee movement ignores it.** So the speciation.js result is a leaky, reversible transient, not an attractor.
Also flagged: post-peak meanFit sag reads as "losing" (seasonal arc greys back out); directed key inheritance
is guided-mutation (the thumb on the scale that also drives the diversity collapse).

**Reprioritized build order (audit-driven), all keeping soul GREEN + DNA (gentle, coax, legible):**
- [x] **A. barrier-aware bee movement + a HEDGEROW lever** — DONE (the plumbing). `field.blocked/rayBlocked/
      paintBarrier`; `_moveToward` slides along walls, `_pick` skips flowers across a hedge. A 🧱 hedge brush
      (drag to build, tap again to clear). VERIFIED mechanically: a walled bee can't forage across (rayBlocked)
      or fly through (stays its side over 600 ticks); rendered, the two colonies' trails stay on their own
      sides. BUT: the wall alone does NOT yet yield strong speciation — with gene flow cut, both isolated sides
      still land on the SAME attractor (no divergence pressure). So A is necessary but insufficient; the payoff
      needs **B (frequency-dependence)** so the two sides settle on DIFFERENT morphs. Soul + harness 75/75 green.
- [ ] **B. negative frequency-dependent selection** — over-visited hues pay less (pool depletion / forager
      satiation memory) → rare morphs bloom → standing diversity is maintained → the garden genuinely never
      settles (fixes the monoculture root cause; gives speciation something to act on).
- [ ] **C. fitness = bounded rate + gentle plant senescence** — cap fitness / short window + soft age-mortality
      so frozen incumbents yield to seedlings → turnover, grid evolution keeps moving.
- [ ] **D. flower constancy** (assortative visitation) — small `_pick` bias toward the just-fed `lastBeaconHue`
      → foragers self-sort into lanes → a single patch can split sympatrically (deepens speciation without a wall).
- [ ] **E. colony population breathes with match quality** — carrying capacity tracks recent nectar inflow
      (well-matched swarm grows toward 60, fumbling one thins toward ~15) with a FLOOR (never a survival wipe).
- [ ] **F. reframe the post-peak sag** — render floor / murmur so the Red Queen wobble reads as vitality, not regression.
- [ ] **G. birth/death legibility** (original #4) — sprout/wilt + a births/deaths readout.

## Method each iteration
pick the next unchecked item → implement (TDD for logic, headless screenshot for visuals) → keep harness +
soul green → commit finding-per-commit → redeploy to gh-pages (worktree method) → tick the box here → leave a
short note. Spawn a fresh model critic every few iterations for new direction. Stay in the DNA: coax don't
command, wonder not power, legibility is king, gentle upkeep never survival-combat.
