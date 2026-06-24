# LOOPHOLE — depth redesign, session handoff

**Purpose.** This doc is the *primary context* for a fresh session. We paused mid-brainstorm on a
big design question: the game has the bones of a deep emergent ecology but doesn't *feel* deep to
play. We are reimagining the core loop toward indirect, SimCity-style stewardship with a tangible
material substrate. **This is a design brainstorm — design-before-code. Do not implement anything
until a design is sketched and Blaine signs off.** Read this top-to-bottom, then pick up at *"next:
the discussion to have"* at the bottom.

---

## where things stand (project + repo)

- **What it is:** LOOPHOLE — a vanilla HTML/Canvas/JS browser game (zero deps, localStorage, runs
  from `file://` and GitHub Pages). Themes: entropy, emergence, complex adaptive systems, Gaia,
  non-dualism. Lowercase-serif aesthetic. Real, accurately-attributed complexity science.
- **Repo:** git root `/Users/blaine/workspace/sandbox/2026-fable`; game lives in `loophole/`.
  Remote `github.com:booherbg/entropy-game-test.git`, branches `main` + `gh-pages` (deploy).
  **Canon tip at handoff: `838e5e8`.**
- **Key files:** `loophole/js/core.js` (the engine + sim — large), `render.js` (canvas),
  `ui.js` (DOM/HUD/input), `content.js` (patterns, murmurs, legendaries), `test/harness.js`
  (headless node test suite — the source of truth for "is it still working").
- **Invariants that have held (may be revisited by the redesign, but know them):** base "garden"
  game wins **24/24** in the harness, fully **deterministic** (one seeded RNG), non-collapse
  (no Lotka-Volterra crashes), commit + push every increment.
- **Docs to read for full context:**
  - `2026-06-19-loophole-prime-directive.md` — the method + the **titan critique already started**
    (Factorio/Civ/SimCity) + the reading list. *Most relevant prior art for this redesign.*
  - `2026-06-18-loophole-v04-as-built.md` — what actually shipped (the ecology engine).
  - `2026-06-22-two-loops-one-seed.md` — the parallel-loop natural experiment (context, below).
  - `loophole/DISCOVERIES.md` — the lab notebook; its intro synthesizes the whole game's thesis.

## what just happened (so the fresh session isn't surprised)

1. **The two-loop experiment.** For a stretch, the autonomous loop ran in two terminals from the
   same commit, never merged. Both independently built a predator and hit the same wall; they
   diverged only on build order. Canon is the deeper line and is canonical. Full story in
   `2026-06-22-two-loops-one-seed.md`. *Not directly relevant to the redesign — just don't be
   confused by it in the git log.*
2. **Two bugs fixed and shipped (`838e5e8`), in response to Blaine playing:**
   - **The mid-game freeze.** Root cause: the apex-predator lore toast read `meta.hints` on a save
     that predated that field → `TypeError` → thrown inside `endTurn()` *after* `processing=true`,
     so the flag never cleared → every click frozen until refresh. Fixed three ways: migration guard
     (`meta.hints = []`), an exception-safe `try/finally` around the turn pipeline (a throw can never
     freeze the UI again — it logs + recovers), and `selectTool(null)` on next-turn so a post-turn
     scroll can't drag-paint.

## the design problem (why we're here)

Blaine, after playing: *"I don't get a feeling of depth. I can't really feel the resource
management, adaptation, or flow of materials. Each game plays the same way — moss, fronds, ants,
some flowers, heartwood/mycelium/crystals, rot the ants eat, max the skill trees, a predator shows
up, the game ends — but I have no idea why I did any of it or whether it mattered. The bones are
there but it feels kind of boring. Think SimCity or Factorio — decisions matter and it's clear what
each element is doing."*

**The diagnosis (three symptoms, one disease).**
1. **No legible causality.** SimCity shows the traffic jam your road caused; Factorio shows the
   starved belt. LOOPHOLE hides cause-and-effect behind an entropy % and emergent events you can't
   trace back to a choice.
2. **No real decision space.** A dominant sequence exists, so you execute a known-good order rather
   than decide. One good strategy = chores, not choices.
3. **A trite abstraction.** "Entropy as a percentage" throws away the *substance*. You can't route
   or feel a scalar; you manage *stuff* — materials, in places, flowing.

One root: **the game abstracts away exactly the things that would make a decision feel
consequential.**

## the vision on the table (Blaine's proposal)

- **Place only infrastructure + special tiles** (SimCity-style indirect control), not life/fauna
  directly. ("Placing the actual fauna feels funky.")
- **Civ5-style dashboards / informational panels** — make the system's state legible.
- **Retire "entropy %."** Reframe entropy as **random combinations of raw materials** — picture a
  **resource/material layer (pixels?)** that varies on a gradient by topology / map generation. Life
  then **adapts and re-orders** those materials — which is literally the arrow of complexity/order
  pointing upward. (This is thermodynamically honest: order = re-organized material, built by
  dissipating a gradient.)

**Why this is encouraging, not a pivot:** it's the game's *own* north star recovered. The
prime-directive doc pitches *"you tend the conditions and life builds its own machine"* — SimCity's
indirect stewardship, verbatim. The game drifted into *direct* pattern-placement, an uncanny valley
(too hands-on for a god-game, too scripted for Factorio). This vision pulls it back and finally gives
it legibility.

## where the brainstorm paused (the open question)

I asked Blaine one clarifying question, **still unanswered**, to anchor the loop:

> When you place only "infrastructure and special tiles," **what are those tiles and what are they
> doing to the material field?** Three framings to react to:
> - **conduits & terrain** — shape the substrate (carve channels, tilt the gradient, set a spring of
>   raw light / a sink); life flows into the conditions you built (SimCity zoning + Factorio belts).
> - **catalysts & instruments** — a few rare tiles that *bias what emerges* (favor mineral-eaters,
>   shelter diversity, disturb a patch); fewer placements, higher stakes (Civ districts/wonders).
> - **both** — a cheap flow-layer you paint + scarce catalysts you agonize over.
>
> *And: paint one satisfying turn — what you look at, what you decide, what you watch happen.*

(Note for the fresh session: Blaine chose to hand off before answering, to start clean — so this
question is still live, but the *next* topic below comes first.)

---

## next: the discussion to have

Blaine's chosen next topic, verbatim: **"what are the emergent properties of games like SimCity,
Civ, Factorio? Emergent vs Player actions"** — with his own examples:
*traffic / buildings / neighborhoods · economies / trade routes / geographical bottlenecks and AI
decisions · supply chains / automations / actions / surplus.*

The point of this discussion: **before we design LOOPHOLE's new loop, name precisely what makes the
titans' emergence feel good — the gap between a simple player action and a complex, legible
consequence — so we can engineer that gap deliberately instead of hoping for it.**

Here is a **starting framework to discuss against** (not conclusions — a springboard; push on it,
extend it, reject parts):

### the shape of every one of these games

```
   PLAYER LEVER  (simple, indirect, cheap)
        │
        ▼
   EMERGENT SYSTEM  (complex, unscripted, computed by rules)
        │
        ▼
   LEGIBLE CONSEQUENCE  (visible, traceable back to the lever)  ← the satisfaction lives HERE
```

The magic is never the emergence alone — it's that the emergence is **legible and traceable to your
move.** Emergence you can't see or attribute just feels like noise. (This is exactly LOOPHOLE's
current gap: it has the emergence, not the legibility.)

### per game — player levers → what emerges → why it lands

| game | player levers (direct) | emergent phenomena (unscripted) | the legibility bridge |
|---|---|---|---|
| **SimCity** | zone R/C/I, lay roads, power/water, taxes, services | traffic from live-vs-work + road topology; land-value gradients; neighborhoods rise & blight; pollution/crime spread; buildings self-upgrade | **data overlays** (traffic, land value, pollution) — you *see* the consequence as a heatmap, traceable to the road you drew |
| **Civ** | found cities, choose builds/research, move units, policy, diplomacy | city economies from terrain; trade routes; military fronts at **geographic chokepoints**; AI rivalries/alliances; tech races; border/culture pressure | **the map + advisor screens**; geography makes placement a real decision; early choices **compound** (path dependence) |
| **Factorio** | place machines/belts/inserters; blueprints; research; defend | the factory as a self-running organism; **bottlenecks cascade upstream** from a starved belt; throughput ratios; pollution → biter attacks (a feedback clock); surplus | **the factory IS the dashboard** — you watch the belts; bottlenecks are visible and diagnosable; production-stat graphs |

### cross-cutting principles to mine (the real output of the discussion)

1. **Indirect lever → emergent outcome.** You never place the car, the citizen, the product — you
   place the *conditions/processes* and the system computes the rest.
2. **Legibility/traceability is non-negotiable.** Overlays, the visible factory, advisor panels.
   Emergence must be *seen* and *attributed* or it's noise. ← LOOPHOLE's biggest miss.
3. **Space has structure.** Chokepoints, adjacency, distance, gradients. Placement is a real
   decision only because *where* matters. (LOOPHOLE's hex board barely uses topology this way.)
4. **A feedback clock / pressure.** Biters, the dark, crime, rival AI — something that responds to
   your state and forces adaptation. Tension that makes a calm choice costly.
5. **No dominant strategy.** Competing goals (growth vs pollution, tall vs wide, throughput vs
   defense). Real tradeoffs → real decisions. ← LOOPHOLE's "plays the same every time" miss.
6. **Compounding / path dependence.** Early layout/zoning/tech echoes for the whole game.
7. **Surplus opens the adjacent possible.** Surplus is the fuel of the next tier (bigger factory,
   more cities, new tech) — Kauffman's "adjacent possible," which LOOPHOLE already gestures at.

### the questions this discussion should answer (for the redesign)

- Which of those 7 does LOOPHOLE already deliver, fake, or lack entirely?
- What is LOOPHOLE's **player lever** going to be (the open question above), and what's the
  **emergent system** it drives (presumably the existing rich ecology sim — flora/fauna/food web)?
- What is LOOPHOLE's **legibility bridge** — the SimCity overlay / Factorio-visible-flow equivalent
  that makes "you re-ordered the material field" *visible*? (This is the make-or-break.)
- Does the **material-field substrate** (replacing entropy %) naturally supply principles 3, 5, 7
  (topology, tradeoffs, surplus)?

*End of handoff. Resume by discussing the emergent-properties question above with Blaine; let his
answers (and the still-open tile question) drive toward 2–3 concrete loop designs, then a spec.*
