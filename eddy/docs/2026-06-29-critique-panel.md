# eddy — the critique panel (2026-06-29)

The developer played the current live build and said, honestly: *"this game just doesn't feel very
fun. I can't quite tell what is going on."* To find out why, three independent critics each played
through the same build (same evidence, same four live screenshots) from a different lens:

- **Iris Calder** — a UX / usability specialist, first-hour heuristic audit.
- **Cormac Wren** (*The Critical Path*) — a game critic whose gods are Civilization V and SimCity 3000.
- **Margo Sandoval** — a veteran Maxis systems designer (SimEarth Geosphere team).

They did not see each other's notes. They converged hard. Their full reports are below; the synthesis
is first.

---

## The synthesis

### The root cause is two layers, and they compound

**Layer 1 — there are no stakes (the "not fun" layer).** All three critics independently landed on the
same structural fact: **you cannot lose.** The opening lumen spring is *infinite* (`main.js:63`, no
reservoir), so the world is handed an eternal energy source and can never run down. The score only ever
rises. There is no clock, no opponent, no goal you accepted, no failure the world threatens. The
instrumentation proves choices *matter* (a thoughtful layout out-gardens a lazy one **3.65×** in
flourish) — but it never proves they matter *to you*, because neglect ends just as alive (the `neglect`
profile finishes with 109 species, thriving). Wren: *"it doesn't matter whether you can tell what's
going on — because it doesn't matter whether you act."* Sandoval: *"a beautiful dissipative aquarium…
a screensaver with excellent instrumentation."*

**Layer 2 — the world is unreadable (the "can't tell what's going on" layer).** The simulation's depth
is real but the player can't see it: cause and effect are separated by *minutes* (first cascade ~t400,
first decomposer ~t540) and mediated by material fields the player can't read. The one "read the world"
tool — the rawfield lens — is **debug-grade and actively miscolored** (verified, see below). The seven
"turns" are cryptic unlabeled glyphs. The prominent number ("witnessed 97 kinds") is meaningless
procedural-variant noise while the meaningful one (turns drawn out) crawls. There's no demand/opportunity
prompt, no time-series, no anchor on any number.

**Why they compound:** with no stakes, the player has no reason to push *through* the confusion. A
legible-but-pointless toy is at least pretty; an *illegible* AND pointless one reads as "I poked it and
nothing I understood happened." That is exactly the developer's sentence.

### What I verified in the code (honest audit)

- **REAL BUG — the lens swaps the world's colors.** World view (`render.js:37`) maps lumen→gold,
  mineral→**blue**, humus→**green**. The rawfield lens (`render.js:35`, commented *"debug — untinted"*)
  dumps raw channels: lumen→red, mineral→**green**, humus→**blue**. Toggling the one "reading the world"
  tool recolors lumen gold→red and swaps mineral/humus. Both Calder and Sandoval caught this. It is real.
- **NOT a bug — the "frozen instruments" the critics saw.** All three flagged "turns 0/7 and advisor
  'nearly bare' over a teeming world." That was an **artifact of my screenshot method** (I fast-forwarded
  the sim directly, which bypasses the frame loop's `observe`/advice calls). Verified in a real frame
  loop: turnsSeen rises, codex grows, advisor updates to "5 niches, 19 lives — the web is finding its
  shape." *However* — the critics' instinct points at a real, milder problem: the meaningful counter
  (turns) updates slowly and cryptically while a meaningless one ("witnessed N kinds") dominates, and no
  instrument is bound to the moment/place of the player's action. The guidance stands.
- **CONFIRMED — pacing is slow.** Even with 2 springs, 1400 ticks yields ~19 alive and only 1/7 turns.
  The drama is back-loaded; the opening is dead air.

### The roadmap (prioritized)

**P0 — give the world stakes (turns the toy into a game). [all three critics, unanimous #1]**
1. Make the opening lumen spring **finite** (a reservoir like every other spring).
2. Arm the already-simulated **brightening sun** (Gaia forcing) as a real deadline — clime rises, and if
   diversity (the albedo buffer) collapses, the sun *wins* and the world cooks.
3. Frame it as a scenario with a **win line**: *draw out all 7 turns before the world runs down.* Now the
   score can fall, neglect has a cost that arrives, and the measured 3.65× skill gap becomes the
   difference between surviving and not.
> This is core-balance: it must be built carefully and **measured** (does the world still sit at the edge
> of chaos? does careful play survive while neglect fails?). It is the highest-impact, highest-care change.

**P1 — make the world readable (kills "can't tell what's going on"). [Calder + Sandoval]**
4. **Fix the lens:** tint the rawfield through the *same* gold/blue/green palette as the creatures, and
   add an on-canvas **legend** (3 swatches). (real bug fix)
5. **The surplus contour:** draw the line on the field where fertility crosses the spark-life threshold —
   it turns "let surplus pool a while" into "seed inside the line." (Sandoval's single best legibility idea)
6. **Label the 7 turns:** a permanent 1–2 word caption under each glyph; pulse + surface the chronicle
   line the instant one lights, bound to where it happened.
7. **Anchor the numbers:** give flourish a par/target (you measured it — 121 lazy, 443 mosaic), show
   ▲/▼ deltas, and promote *turns drawn out* over the meaningless "witnessed N kinds."

**P2 — make it readable over time + invite the hand. [Wren + Sandoval]**
8. **Time-series graphs** (population / diversity / burn / clime) with cascade ticks marked — makes the
   edge-of-chaos visible.
9. **Demand / opportunity prompts** (RCI-style): "an unworked humus surplus is pooling at the north seam."
10. **ETAs / anticipation** ("decomposer 80% to emerging") for the Civ5 "one more turn" pull.
11. **Visible economy** (animate flow spend, show regen) so the budget is felt.

**P3 — the first 60 seconds (depends on P0/P1). [Calder + Sandoval]**
12. Warm-start with a **pre-grown living patch** (life on screen at second zero, food-web card populated
    on frame 1) + time-compress the early game until the first turn lights, then a 3-beat scripted teach:
    *seed inside the contour → add a second element → a blend-eater arises at the seam → 1/7 lights.*

See `docs/svg/` for visual mockups of the proposed HUD, the feedback-loop fix, and the redesigned opening.

---

## The three critiques (verbatim)

### 1 — UX / Usability Audit — Iris Calder, the First-Hour Lens

**The core diagnosis.** eddy fails the player at *what just happened* and *am I doing well* because its
entire feedback-and-progress layer is decoupled from its simulation. In the developed screenshots the
food web card lists "18 hunt the living" and "27 two as one," yet the objective reads THE WORLD'S TURNS ·
0/7, the status card reads "witnessed 0 kinds," and the advisor is frozen on its empty-world line. The
world is teeming while every instrument says *nothing is happening*. That contradiction — not the depth
of the sim — is the literal source of "I can't tell what's going on." Layered on top: a cold-open with no
feedback for ~25 seconds and a "reading the world" lens that is debug-grade and miscolored.

> *[Note from the dev side: the frozen-instruments contradiction was a screenshot-capture artifact; in
> real play they update. But the rest of Iris's findings are verified real. — synthesis]*

**Findings.**
- **BLOCKER — narration/objective/advisor read empty while the world is full.** (artifact in capture; but
  the deeper point — bind instruments tightly to state, light each glyph the instant its condition holds — holds.)
- **BLOCKER — the cold open is one seed in a black void with no feedback for ~25s.** Warm-start with a
  pre-seeded patch and time-compress the early game until the first turn lights.
- **MAJOR — the 7-glyph turns row is cryptic and silent** (⚔♻☣⚡∞✷⊕, hover-only titles, invisible on
  touch). Add a permanent 1–2 word caption under each; pulse + surface the chronicle line on lighting.
- **MAJOR — the rawfield lens is debug-grade and contradicts the world's colors** (world maps mineral→blue,
  humus→green; the lens dumps raw channels → mineral→green, humus→blue). Re-tint to the world palette; add a legend.
- **MAJOR — dashboard numbers have no anchor** (no units, no target, no direction; flourish only climbs).
  Give flourish a par/target, show ▲/▼ deltas, add downward pressure.
- **MAJOR — the advisor copy is abstract and over-writes.** One imperative verb + a location per line.
- **MINOR — toolbar grouping ambiguous** (generator's lumen/radial sub-options read like two more tools).
- **MINOR — floating black "staircase" artifacts** read as render glitches (they're procedural terrain ridges).
- **MINOR — the flow economy is invisible** (flow 200 in all shots; scarcity never felt).
- *Bright spot:* the inspector is genuinely legible ("it adapted to the lumen you fed here — that is why
  it reads gold"). That explanatory model is the best thing in the build; promote it.

**Top 3:** (1) wire feedback to the sim + light glyphs on condition; (2) fix the cold open (warm-start +
time-compress); (3) make the world readable (caption the glyphs; re-tint the lens to gold/blue/green + legend).

### 2 — Critic's Review — Cormac Wren, *The Critical Path* — **5/10**

*"eddy is the most beautiful thing I've ever been bored by — a verified edge-of-chaos simulation wearing
the costume of a game it hasn't built yet."* Half the score is earned by genuine rare achievement (a food
web that writes itself, power-law cascades, a self-thermostatting planet). The other half is missing
because after twenty minutes he made decisions that mattered and *felt nothing* — no stakes, no clock, no
loss, no reason for one more turn.

**The playthrough:** the cold open is gorgeous and inert (one seed, "let surplus pool a while" — Civ5
never opens by telling you to wait; it hands you a Settler). The rawfield lens is the best screen in the
game and it's *hidden behind a toggle*. By the mature world he has 53 creatures and a climbing flourish —
and notices the score is "lying" (the frozen instruments; capture artifact, but his felt point: the
instruments must visibly move). He ran `neglect`: 109 species, alive. *He cannot lose.*

**The Civ5 / SimCity 3000 playbook he wants borrowed:**
1. **RCI demand bars** — the food web shows *supply*; add *demand* (which niche starves, which material
   pools with no eater).
2. **A fail state with teeth** — finite opening spring; let neglect kill the world.
3. **A clock + victory conditions** — weaponize the brightening sun as the deadline.
4. **Per-turn cadence + budget brinkmanship** — pause by default, make flow squeeze.
5. **Imminent-payoff progress bars** — "decomposer 80% to emerging" (the one-more-turn pull).
6. **A par line / rival** — draw the measured 121-lazy / 443-mosaic ghost on screen; race the lazy gardener.

**To earn an 8/10:** one change above all — **let entropy win.** Cap the infinite spring, arm the sun.
"The instant the world can die, every borrowed mechanic snaps into focus."

### 3 — Design Teardown — Margo Sandoval, former lead designer, SimEarth Geosphere team

**The diagnosis:** *"I shipped a planet that simulated Daisyworld… and watched playtesters set it running
and walk away. eddy has the same disease, and it is not a UI disease."* eddy has **no game contract** — no
accepted goal, no threatened failure, no clock, a feedback loop open at both ends — and the cause→effect
that does exist is separated from action by minutes and mediated by invisible fields. The player can't
form the sentence a systems game lives on: *"if I do X, then Y."*

**The legibility layer eddy is missing:**
1. **A real lens suite with one shared legend** — not an RGB dump that recolors lumen gold→red. Three
   single-channel heatmaps in the *same* colors the creatures use, each with a gradient legend; plus the
   **surplus contour** (the line where fertility sparks life — "seed inside the line").
2. **Time-series graphs** (population/diversity/burn/clime) with extinction-cascade ticks — make the SOC
   you measured visible to someone other than the test harness.
3. **A demand readout** — "an unworked humus surplus is pooling at the north seam" (RCI rethought as niche demand).
4. **An advisor + objective tracker that actually fire**, each turn a click-to-open card: a thumbnail +
   *"you caused this by placing two elements adjacent."*
5. **Event toasts at the moment and place of cause** — flash the affected cells; bind effect to location.
6. **A visible economy and a disaster with a clock** — surface income/expense; let the sun actually win
   if the albedo buffer (diversity) collapses. "A disaster that can't end the world is weather."

**The first 60 seconds, redesigned:** kill the void and the "wait." Open on a pre-grown starter patch
(motion at second zero). Then: *0–10s* lens snaps on, surplus contour glows, "seed here"; *10–30s* "give
the world a second element" → a blend-eater arises at the seam (the "if X then Y" sentence, demonstrated);
*30–60s* a turn lights, tracker ticks 1/7, the player understands the loop *and* the goal.

**The one structural change:** *"Make the opening spring finite and put the sun on a clock. Everything
else is downstream of this… You already built the depth. You have not yet let the player lose it."*

---

## Appendix — evidence

- Strategy bake-off (2000t, mean of 3 seeds): mosaic 443 / triad 283 / hunters 283 / overlap 195 / pair
  185 / single 121 flourish. 3.65× spread; diversity 2.3→14.7.
- Playstyles to 2000t: garden 149 / minimal 66 / neglect 109 species — all end alive (can't lose).
- Drama timing: first cascade ~t400–460; first decomposer ~t540–620.
- Live config by t4000: Class-4 + SOC, div ~18, clime regulated, 6/7 turns auto-drawn.
- Lens bug: `render.js:35` (raw dump) vs `render.js:37-38` (world palette) — material colors swap.
- Screenshots audited: after-open, after-mature, after-inspect2, after-lens (the current live build).
