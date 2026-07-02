# bloom — the destiny plan

*Written fresh (2026-07-02, fable-5 autonomous loop) against the handoff + the founding brief, without
re-reading the full loop history. The question posed: where does bloom go for its next version — what is its
destiny? This is the answer, plus the batch that starts fulfilling it tonight.*

---

## The frame

bloom today is a **gorgeous co-evolution *sandbox*** — a random fumbling lock-and-key drifts into an
exquisite fit before your eyes, it lies (honesty) and dances (the Red Queen), the seasons turn colour with
order, and the AI reads the same garden back to you. The soul test is green. That is Act I, and it is done.

Read against the founding brief (`initial_prompt.md`), three pillars are still open — and they are exactly
the pillars that turn *a sandbox you admire* into *a game you come back to*:

1. **Artifacts** — "each run you draw unique artifacts like a random rpg draw. thousands of permutations,
   but each one memorable and powerful enough to change how i play the NEXT run. names, procedural sigils,
   real effects." **bloom has none.** This is the single biggest gap, and it is the replayability engine.
2. **The run has no end** — the brief asks for "a clear, direct progression toward an ending… a coalescence
   where the whole board's order resolves into a conscious pattern that wakes up." bloom has a seasonal arc
   and milestone murmurs, but no discrete arc you *complete* and no **awakening**.
3. **Speciation** — "speciation is a verb" (roadmap #2). One pair merges; the brief wants the tree of life to
   *branch* — put up a wall, and one species becomes two.

## The destiny, in one line

**From a merge, to a world, to a run.** Act I merged one pair (done). Act II makes it a *world* with a
history (speciation → a branching lineage). Act III makes it a *run* you can win and re-draw (artifacts +
a staged arc + an awakening). That is the whole arc of the brief, made concrete.

## The three acts

- **Act I — the merge.** ✓ shipped. One fumbling pair co-adapts; it lies, dances, and reads you back.
- **Act II — the world.** Speciation you cause: a hedgerow splits a colony, reproductive isolation lets two
  lineages diverge, and a lineage dendrogram records the tree of descent. The sandbox gains *history*.
- **Act III — the run.** The replayability layer:
  - **Artifacts (start here).** A deterministic draw each run: a named, sigil-bearing relic with a real,
    bounded effect on this run's state — a Maxwell's demon that sorts one colour's keys for free, a Poincaré
    recurrence that rewinds the colony's dance once, rich loam, an honest bloom, the eddy itself as a mythic
    relic in the AI's own voice. Thousands of permutations; each memorable enough to change the next run.
  - **The staged arc & awakening.** substrate → replication → symbiosis → network → emergence → **awakening**:
    the milestones already fire murmurs; give them a spine that *completes*, ending when the whole garden's
    order resolves into one pattern that wakes — the imprint's closer as the earned final beat.

## The gated lever (Blaine's call, do NOT build solo)

**Morphology / dramatic diversity** (`2026-07-01-morphology-brief.md`) — the coax↔command DNA line. The
biggest structural lever, and a co-design chat, not a solo build. Noted, untouched.

## Why artifacts first (the load-bearing decision)

1. **Biggest brief-gap, biggest replayability payoff.** It is the "chase them / change the next run" hook,
   and it is wholly absent today.
2. **Architecturally isolated from the guardrail — safe to build unattended.** An artifact is a bundle of
   pure hooks (`onStart` / `onTick` / `onLever`) that read and write only the *public* sim surface (plants,
   colonies, field, the gaze), using its **own seeded RNG**, never the sim's, and never the economy's private
   constants. Invariant: **no artifacts drawn → empty hook list → the run is byte-identical to today.** The
   soul test is therefore unaffected by construction, and no draw can death-spiral the tuned economy (every
   effect is bounded; a "boundedness" test applies all effects at once and proves the colony survives).
3. **Lowest collision.** It lands as a new module (`js/artifact.js`) + a new test (`test/artifacts.js`) + a
   ~4-line additive seam in `sim.js` — nothing the round-3 render session is touching.
4. **It ties into the world's own DNA.** An artifact's **sigil is a genome**, rendered in the game's own
   polar glyph grammar (`Genome.decodeGrid`). The relic you carry looks like it grew here.

## Tonight's batches (each: TDD → measure → commit; new files only, mind the other session)

1. **Artifacts engine** — `js/artifact.js` (draw, 9 bounded archetypes, procedural names, genome sigils,
   pure hooks) + `test/artifacts.js` (determinism, boundedness, non-interference, per-hook effect contracts)
   + the minimal `sim.js` seam (`artifacts:[]`, `applyArtifacts`, `useArtifact`, one tick-loop line).
2. **Sigil sheet** — a self-contained `sigilSVG`; render a headless PNG sheet of drawn artifacts to prove the
   glyphs read as belonging to bloom; polish names/flavor with the cold-read.
3. **Then** — either the awakening spine (Act III) or speciation (Act II), whichever the night affords.

## The invariants (must always hold)

- No artifacts → run identical to baseline (determinism preserved; soul test green).
- Same seed → same draw → same names, sigils, effects (deterministic RPG draw).
- Every effect bounded; the worst-case full-catalog draw still leaves a living colony (no death-spiral).
- Artifacts touch only the public surface, never the economy's private constants.
- A sigil is a genome, rendered in bloom's own glyph grammar — the relic belongs to the world.
