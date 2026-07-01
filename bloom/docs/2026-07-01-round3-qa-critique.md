# bloom — round-3 QA critique: two fresh lenses on the finished build (2026-07-01)

Two independent fresh-context critics reviewed the finished round-3 build: one through a
player-UX/UI lens, one through a systems/game-design lens. Neither had read the round-3 plan;
both worked from the player+art audit round 3 was built to answer
(`bloom/docs/2026-07-01-player-art-audit.md`) and the game's own stated DNA
(`bloom/docs/2026-07-01-handoff.md` §7 — coax not command, the arc bends upward, wonder not
power, legibility is king). Reference stills, seed 42: `bloom/shots/round3-final-w0.png`
(opening, fit ~15%), `-w800.png` (mid/fumbling), `-w2500.png` (native fit). Both critics took
their own additional captures on top of these.

---

## The six items — per-item verdict

### 1. Light filaments (the merge becomes light in the world) — under-reads on both lenses

- **UX critic: PARTIAL.** The filaments exist — faint hue-tinted dotted sparkle-trails between
  bee and flower, visible in low/mid-fit crops (`fil-crop-w470.png`, `fil-crop-w600.png`). But at
  native fit the broad translucent green forage beams dominate the exact same region and use the
  same "light-in-the-world" idiom, so the new signal is swamped — the critic could not isolate a
  filament from the beams at native fit (`crop-filament-w520.png`). Caveats that a still can't
  prove the ~30-frame fade/twinkle reads better in motion, but calls the two disqualifying
  properties — low brightness and hue/idiom collision with the beams — static, provable-from-a-
  still problems. Verdict: "lands as a mechanic, misses as the marquee beat."
- **Game-design critic: "serves the DNA, but doesn't land yet."** Confirms the instinct is
  correct (fires off the sim's own `pollination > 0.55` read, bee-to-flower, witness not
  reward-pellet) but states flatly: **"I cannot find it."** Across a fumbling frame and two native
  frames it's invisible in a still — drawn on top of the very beams it's trying to distinguish
  itself from, at `alpha = fade·eff·0.7` for 46 frames. Names this "the single loveliest intended
  beat of the round" and "a legibility miss on the item meant to be the round's emotional payoff."
- **Both converge:** present, correct in concept, invisible in practice — beam-collision is the
  named cause on both sides.

### 2. Poetry inline (murmur drifts into the world live) — lands, but collides with the frame around it

- **UX critic: LANDS.** The old "open ✦ murmurs to read it" homework toast is gone (visible for
  comparison in `round3-item1-filaments.png`); `round3-final-w800.png` shows the actual line
  drifting in as a low-contrast full-width italic imprint (*"a solitary ant, afield…" — lewis
  thomas*), `round3-final-w2500.png` shows the dylan thomas swap. Caveat, framed as density not a
  miss: at native fit the frame carries three simultaneous prose layers (top milestone toast, this
  poem imprint, bottom coaching prompt) — "readable, but text-busy."
- **Game-design critic: "right call, executed into a pile-up."** Calls it the audit's biggest
  content win and confirms the arc is intact. But raises the reward-pellet question directly —
  murmurs fire on fit thresholds (0.40/0.55/0.66/0.78/0.92), which *is* operant structure, judged
  "acceptable, not alarming" because each fires once and it's a narrative arc, not a score. Then
  states the real damage is collision, not conditioning: on the mobile shot, the drifting murmur +
  the milestone toast + the bottom hint sit on the canvas at once, "overlapping into unreadable
  text soup." Explicitly: **"This breaks DNA #6 (legibility) and reintroduces the exact 'wall of
  words' feeling the poetry-surfacing was meant to cure."**
- **Both converge, one goes further:** the UX critic frames it as desktop-tolerable density; the
  game-design critic names the mobile version an outright legibility regression and a DNA
  violation, and prescribes a fix — suppress toast+hint for the beat a murmur drifts in.

### 3. Softer opening — lands on the numbers, still contested on the actual first impression

- **UX critic: LANDS**, with a trade the audit accepted. `round3-final-w0.png` shows warm
  dark-brown ground, vivid flowers with glow halos, visible motes — "nowhere near" the ~56%
  desaturated near-monochrome pre-state. Caveat: because the floor is warm even at low fit, the
  grey-dawn-to-gold-noon *ground* climb is now subtle; the seasonal arc now rides mostly on the top
  gradient bar and tooltip, not the world — a trade the audit explicitly signed off on.
- **Game-design critic disagrees on the outcome, not the numbers.** Confirms desaturation cap
  dropped 0.6→0.375 and `gLo` warmed — "numerically real." But the critic's own fresh-open render
  (fit ~15-33%) is **"still a dark, near-empty night garden": two-thirds black loam, sparse
  glints.** States plainly that the SimCity critique's "beautiful but lonely… two-thirds empty
  black" and the original audit's "first sight is near-monochrome + sparse" **both still
  substantially stand**, and that the brief's literal ask — "the first warm week of the year," "the
  screen literally blooms" — is unmet at the opening. Verdict: **"decorated the parameter, didn't
  change the first impression."**
- **Divergence, not consensus:** the UX critic calls this LANDS-with-a-known-trade; the
  game-design critic calls the actual player-facing outcome unchanged from the pre-round-3
  complaint. Do not average these — the game-design critic is explicitly rejecting the "lands"
  read on the thing that matters (the first sight), even while agreeing the parameter moved.

### 4. Flower bodies (soft filled body so blooms stop reading as asterisks) — both call this the clearest miss

- **UX critic: "PARTIAL / effectively a MISS for the case that motivated it."** Symmetry-6 blooms
  read acceptably as stars. But symmetry-4 blooms — the exact "reads as a literal cross/plus-sign"
  complaint — **still read as a glowing plus**: coral arm-outlines, cyan inner pixels, green
  center, with the four diagonal quadrants left dark/empty. The only addition is a diffuse magenta
  glow halo *behind* the cross; it doesn't fill the petal gaps or round the silhouette
  (`crop-flower-native.png`).
- **Game-design critic: "the clearest decorated-not-fixed item."** Names the exact mechanism: the
  "body" is a 22%-alpha disc drawn *under* the 96%-alpha genome pixels, and the genome pixels are
  the actual shape — for symmetry-4 flowers, a literal cross. "A faint glow behind a bright cross
  reads as 'a cross with a halo,' not 'a flower.'" Across all seven of the critic's frames, the
  dominant motif is unchanged: **"glowing plus-signs and asterisks on sticks."** Quotes the
  original audit's own framing back: this was always "the cheap render-only *half* of the asterisk
  problem" — the other half is morphology. Verdict: **"honest half-fix; flowers still don't read
  as flowers."**
- **Both converge exactly**, independently, down to the same visual detail (the halo sits behind,
  not inside, the cross) and the same conclusion: this item did not move the read.

### 5. Legible dashboards — value labels genuinely land; both flag drift toward a readout; UX-only finds a mobile regression

- **UX critic: PARTIAL.** Value labels land — sparkline titles now carry real numbers ("lock-and-
  key fit · grid match · 96% / 98%", "stores · nectar / pollen · 35.1 / 36.1"), and the fit
  headline is prominent (`crop-sparklines.png`). But: no visible current-value end-dot on any of
  the three sparklines, and the population sparkline shows **an odd lone bright-blue vertical
  stroke pinned at the left edge** that "reads like a rendering glitch, not data" — visible in
  `crop-sparklines.png` and every `qa-ux-desk-*` capture. The critic then names the real problem:
  on the true mobile viewport (390×844, `mob844-w0.png`), the merge strip is pinned above the
  canvas as intended, but is **not compact** — full-size dual grids + fit bar eat ~200px, roughly a
  quarter of the screen, squeezing the garden into a letterbox (canvas ≈ y295-630). Worse, **the
  same widget is duplicated**: "THE LOCK & KEY — THE MERGE" appears again below the toolbar,
  visible at the bottom of the same 844px screen and in full in `qa-ux-mob-w0.png` /
  `qa-ux-mob-w2500.png`. Net: "mobile now shows the identical merge grid twice within ~one scroll —
  busier than pre-round-3."
- **Game-design critic: "a real legibility win drifting toward a readout."** Credits the same
  wins (value labels + current-value dots in `spark()`, the mobile lock-and-key strip pinned above
  the canvas — called "the best single UX fix in the round"). Then asks directly whether the
  value-label dashboard pulls toward optimization/power, and answers **"partly, yes"**: three
  stacked sparkline panels with two-decimal labels is "edging from witness toward analytics
  readout," which DNA #5 warns against. Names a specific finding: the stores panel shows nectar and
  pollen tracking together (38.6/39.2) because — per a prior SimCity critique — the two currencies
  are still one currency wearing a hat. **"You've built a precise gauge for a choice the player
  never makes."**
- **Do not average:** the UX critic did not catch the mobile duplication in the game-design
  critic's review (it wasn't looked for at that resolution), and the game-design critic did not
  flag the blue-stroke glitch or the duplication — these are UX-only findings, both credible and
  specific (exact pixel/viewport evidence given), and should be treated as additive, not
  cross-checked away.

### 6. Grouped toolbar — the one item both critics call a clean win, with the same mobile caveat

- **UX critic: LANDS on desktop, PARTIAL on mobile.** Desktop crop (`crop-toolbar-desk.png`) shows
  clear vertical separators partitioning `[inspect · lock] | [plant · colony · grow niche] |
  [sun · cull · hedge]` — "clean, readable grouping." On mobile (`mob-tb-a.png`), the read|grow
  separator is present, but only `inspect → grow niche` fits the 390px width; **sun/cull/hedge sit
  off the right edge with no visible scroll-fade affordance** — "the card just gets clipped." Notes
  this is the exact "shape tools hidden behind unscrolled overflow, undiscoverable" problem from
  the original audit — grouping helped, the scroll hint did not visibly ship. Mode-pip: confirms
  sun/hedge correctly show no pip in default (untoggled) state; cannot verify the toggled state from
  a static URL.
- **Game-design critic: "landed cleanly, lowest risk, highest hit-rate."** Confirms clustering
  reads on mobile and that mode pips + icon swap make the dual-toggle (sun⇄shade, hedge⇄clear)
  discoverable — "fixing the audit's 'undiscoverable dual-mode toggles.' Pure UX, zero soul risk."
  Minor note: on desktop the group gaps are subtle enough that clustering barely reads as clusters.
- **Both converge:** shipped and good, lowest-risk item of the round. The one real caveat — mobile
  scroll-fade missing, tools clipped off-screen — is named independently by the UX critic (with
  exact evidence) and not contradicted by the game-design critic.

---

## Overall

- **UX critic: 7/10.** "More inviting and better-narrated than pre-round-3 — the warm opening,
  inline poetry, and desktop toolbar grouping genuinely landed and the thing is beautiful — but
  the two soul-critical reads still aren't resolved: the merge-as-light whispers under the forage
  beams and symmetry-4 flowers still read as plus-signs, so the emotional core still lives more in
  the sidebar than in the world, and mobile actually got busier (duplicated merge, squeezed
  garden)."
- **Game-design critic: comprehension deepened; aliveness mostly decorated.** "The four items that
  improved understanding — grouped toolbar, mobile merge-strip, labelled dashboards, and the 'grow
  a niche' second-act pointer — are real... But the two items meant to make the world feel alive
  (warmer opening, flower bodies) are parameter tweaks that don't change the dominant impression,
  and the one item that genuinely makes the world alive (the filament) is too subtle to confirm it
  fires." And, naming the load-bearing fact underneath all six items: **"the garden still opens as
  a dark field of glowing crosses and ends as a settled T"** — the same monoculture two prior
  critics and the morphology brief named — "this round decorated the frame around that wall without
  touching the wall."

---

## Ranked next actions

### High-leverage, ungated — buildable now

1. **Make the filament actually read as light.** Both critics converged on this independently as
   the round's single biggest open gap and the same root cause: it's rendered in the same idiom as,
   and visually swamped by, the green forage beams. Concretely: brighten it (bright near-white
   core, brightness already scales with `eff` — push the floor up), and differentiate it from the
   beam — a hotter/distinct hue-tinted core and/or a brief pollination-flare pulse at the flower on
   contact, so it reads as a *spark of recognition* against the beam's *ambient traffic glow*
   rather than a fainter copy of it. This is the one fix both critics independently named as the
   thing that would rescue the round's marquee beat.
2. **Coordinate the three text channels so a murmur beat owns the screen.** The game-design critic
   names this a DNA #6 legibility regression, not mere density, on mobile (drifting murmur +
   milestone toast + bottom hint overlapping into "text soup"); the UX critic confirms the same
   three-layer stack at native fit on desktop, calling it "text-busy." Fix: when a murmur drifts in,
   suppress the toast and the bottom hint for that beat so only one narrator speaks at a time.
3. **Fix the mobile dashboard strip** — UX-critic-sourced, not cross-checked by the other critic but
   backed with exact viewport evidence (`mob844-w0.png`, 390×844): the pinned merge strip is not
   compact (full-size dual grids + fit bar eat ~200px, letterboxing the garden to y295-630), and the
   same "THE LOCK & KEY — THE MERGE" widget renders a **second time** below the toolbar — the
   identical grid shown twice on one screen within one scroll. Shrink the pinned strip to a genuinely
   compact single row and remove or collapse the duplicate.
4. **Kill the sparkline glitches** (UX-critic-sourced): add the missing current-value end-dot to all
   three sparklines, and remove the population sparkline's spurious bright-blue vertical stroke
   pinned at the left edge — it reads as a rendering bug, not data, in every desktop capture taken.
5. **Add the missing mobile toolbar scroll-fade** so sun/cull/hedge (currently clipped off the
   390px viewport with no affordance) are discoverable — the grouping shipped, the scroll hint did
   not.
6. **Reconsider the stores panel's precision** (game-design-critic-sourced): two-decimal nectar/
   pollen labels display false precision on what is, per prior critique, one currency wearing a
   hat — a stat the player can't actually act on independently. Either merge the display or drop
   the decimal precision so the dashboard doesn't nudge toward a min-max headspace the rest of the
   game avoids.

### High-leverage, gated on Blaine — not ready to build without his sign-off

7. **Morphology.** Both prior audits, the morphology brief, and this round's game-design critic
   converge on this as the actual root: the form-space is one shape (a radial wedge that renders as
   a cross), the garden opens monocultural and ends on a settled T, and the flower-body item (#4
   above) can only ever be a half-fix because the genome pixels *are* the cross — no amount of
   render-layer glow changes that. The game-design critic's proposed smallest slice — seed
   `warmStart` from 2-3 founding forms instead of one near-clone patch, plus one `irregularity` gene
   that jitters petal size/angle per-lobe — is scoped to touch zero merge math and stay
   steward-only (coax, not command), so it's the smallest version of this ask. **This is explicitly
   not ready to build**: it is a design/data-model change to the genome and warm-start, it needs
   Blaine's yes/no, and it should be run through the soul test across seeds before it ships even
   after approval. Do not schedule this as a round-4 task until that conversation happens.

### Minor polish (only if time remains after the above)

8. Thin the three-simultaneous-prose-layer stack at native fit even outside the murmur-collision
   case (UX critic's density caveat on item 2) — a lower-priority version of action #2 for the
   steady-state (non-milestone) frame.
9. Tighten desktop toolbar group gaps slightly — the game-design critic notes clustering "barely
   reads as clusters" on desktop even though it landed; a small margin/divider tweak, not a redesign.
