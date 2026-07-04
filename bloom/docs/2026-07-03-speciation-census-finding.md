# finding — Act II (speciation) is blocked on divergent selection, not on legibility

*fable-5 autonomous loop, 2026-07-03. A measured redirection of the destiny plan's Act II ("the world —
speciation you cause"). Backed by data, not assumption.*

## What I set out to build

Act II of the destiny plan was **speciation as a measured world-feature**: a census that reads how many
species live in the garden, so the player can wall off two patches and *watch* one lineage become two —
"speciation is a verb." I built the census as a read-only clustering of the live flowers by reproductive
compatibility (`js/census.js`, `test/census.js` — 9/9, provably touches no rng and mutates no sim state).

## What the measurement showed (the reason to stop)

Before wiring it, I probed whether a hedgerow actually splits a garden into species the census can see
(`test/census-probe.js`, mean over seeds 7/21/42, 6000 ticks):

| scenario | species @ t0.4–0.6 | isolation |
|---|---|---|
| warmStart (1 founder) | 1.0 everywhere | 0.00 |
| 2 clusters, no wall | 1.0 everywhere | 0.00 |
| 2 clusters + **wall** | 1.0 (1.3 only at t0.6) | 0.00 |
| 2 clusters + wall + divergent light | 1.0 everywhere | 0.00 |

**A hedgerow does not produce a second species.** The wall cuts gene flow (that part is real — proven in
`test/speciation.js`), but the two isolated sides sit under *identical selection pressure* (each co-adapts to
a colony whose keys started from the same ancestor hue), so they **converge** on the same genetic solution
instead of diverging. Parallel evolution, not speciation. Cross-cluster fertility never falls below the
"freely fertile" line, so an honest census reads "1 species" no matter how long you wall the garden.

This corroborates the note `test/speciation.js` already closes with: *"strong divergence into fully-distinct
species is deepened next by frequency-dependent selection."*

## Why I did not push through it

Making speciation real needs **divergent selection** — the two walled sides must be pulled toward *different*
genetic solutions (character displacement: different colony key-targets, or a wall that assigns a new
`speciesId` so cross-side pollen stops setting seed and the sides drift apart for real). Every version of that
is a change to the core co-evolution / the coax↔command DNA line — i.e. the **gated "dramatic diversity /
morphology" decision** reserved for Blaine (`2026-07-01-morphology-brief.md`), not a solo overnight build.
So Act II is **blocked on a gated design decision**, and shipping the census now would ship a feature that
always says "1."

## What's ready for when it's unblocked

- `js/census.js` — correct, tested, read-only. The moment divergent selection makes two species real, this
  reports the count + isolation with zero further work, and a self-contained species-dendrogram SVG (like the
  artifact sigil) is a small follow-on.
- The one honest lever that could unblock it *without* touching the merge: a **speciation event** — after a
  patch has been walled off long enough, assign it a fresh `speciesId` (the sim already gates seed-set by
  `speciesId`, so this *enforces* the split and real divergence follows). That's a clean additive mechanic,
  but *when/how it triggers* (automatic vs. a lever) is a coax-vs-command design call — Blaine's.

## Recommendation

Keep Act III (artifacts, shipped) as the live arc. Bring Act II to Blaine as a co-design chat alongside
morphology — the census is the legibility half, already built; the missing half is the divergent-selection
mechanic, which is his DNA call. Do not build it solo.
