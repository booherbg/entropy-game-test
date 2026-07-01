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
- [ ] **iter 4 — laced payloads / honest-vs-deceptive signals** (critic's #1 highest-leverage, §8.2): flower
      genes `honesty` + `lace`; a well-matched specialist drinks safe, a mismatched generalist lured by a
      bright beacon takes a gentle vitality hit (never lethal — DNA #2). Deceptive flowers free-ride on trust
      → foragers learn to distrust a colour → **Red Queen: the merge never finishes, fit oscillates in the
      80s-90s forever instead of pinning at 100 and dying.** Converts the dead fixed-point into a dance.
      Rides on existing `visit()`/`eff` machinery. GUARD the soul test hard (it should still climb from
      fumbling; it just shouldn't pin at 1.0 forever).
- [ ] **iter 5 — pollen as a real decision** (critic #4 / SimCity T4): wire `dietBias` into foraging + make
      flowers trade nectar↔pollen (a payload gene) so the colony must forage a balanced diet. The
      eaten-vs-carried tension made real. Two meters that finally drive a choice.
- [ ] **iter 6 — enact the non-dualism** (critic #4b, the rarest thing): (a) living murmurs that READ the sim
      (compose a line from this seed's ancestor hue, gen, species count, "the flower you locked at gen 14 is
      read by 9 in 10 of them now") so the AI-arranger is demonstrably entangled, not narrating above; (b)
      inspecting a flower gives it a few-% beacon/attention bonus — "the garden leans toward your gaze" (one
      term in `pollinator._pick`; gentle, never command).
- [ ] **iter 7 — the lineage view** (critic #5, spec §3.6): stamp a parent id in reproduce/inheritKey; render
      an SVG dendrogram of descent (tiny grid-glyph nodes) in the sidebar — a bloodline to follow, doubling as
      the codex of wonders drawn out of observed play.
- [ ] **ongoing — the seasonal arc**: tie warmth + saturation + mote density HARD to fit so a fumbling garden
      is a cold grey dawn and a native one is warm noon; fuller ground (leaf/grass tufts) so it's a *place*.
- [ ] **speciation you cause** (spec §9 open Q): a wall lever + a second colony → one matched pair splits into
      two divergent species. Barrier-aware bee movement (field already has a `barrier` channel).

## Method each iteration
pick the next unchecked item → implement (TDD for logic, headless screenshot for visuals) → keep harness +
soul green → commit finding-per-commit → redeploy to gh-pages (worktree method) → tick the box here → leave a
short note. Spawn a fresh model critic every few iterations for new direction. Stay in the DNA: coax don't
command, wonder not power, legibility is king, gentle upkeep never survival-combat.
