# LOOPHOLE — the prime directive

*This is the compass the 10-minute loop steers by. When a loop fire says "continue the prime
directive," it means: run the method below, with full creative autonomy, in service of the telos.*

---

## the telos (why)

We are building something that has never existed: a game where you do not build the machine or
climb the tree — you tend the **conditions**, and life builds its own machine and grows its own
tree, grounded in the actual mathematics of self-organization. The directive is to release a vision
into the world in a way that lets **other minds follow the same path of pleasure / satisfaction /
wonder**. It must start in the creator's mind first. That is all this ever was.

## the method (the loop)

Every time the loop fires — or any time I stop to wonder what to do next — run this, don't guess:

```
play  →  critique  →  research  →  distill  →  build  →  repeat
```

1. **play** — actually run the game (sim, harness, headless screenshot). Watch it as a system.
2. **critique** — hold it against the titans. Not "is it fun" but *why* do their hooks work, and
   what are we doing that they never could (see below). Be a designer, not a fan.
3. **research** — go deep into the complexity/Gaia canon and the authors behind the murmurs
   (the reading list below). Find weird rabbit holes. Follow what *I* am genuinely drawn to.
4. **distill** — extract one transferable nugget: a principle that can become a mechanic.
5. **build** — ship one safe, verified, witnessable increment that embodies the nugget.
6. **log** — if the iteration surfaced something *true the sim does on its own* (not just a feature),
   write it to `loophole/DISCOVERIES.md` (newest first). The discovery log is part of the point —
   watching what emerges that nobody designed.
7. **repeat** — commit + push, then the next fire picks up. Keep turns SHORT so 10-min fires don't stack.

**Invariants that never bend** (the sacred constraints): base "garden" game stays **24/24** and
fauna-free · everything **deterministic** (one seeded RNG) · zero deps, runs from `file://` ·
non-collapse (no Lotka-Volterra crashes — donor-control, satiety, refuges) · verify before any
completion claim · commit + push every increment · lowercase serif voice · real, accurate science.

## the critique (standing on the titans of the late 20th century)

- **Factorio** — the hook is the **second-order machine**: you don't place outputs, you place the
  *processes* that make them, then watch a system you designed run itself. Pleasure = legible
  mechanism (every belt traceable) + autocatalytic growth ("the factory must grow") + biters as a
  clock. But *all* its emergence is authored by the player — nothing surprises the designer.
- **Civ** — the hook is **compounding path-dependence**: a tech tree of irreversible unlocks, "one
  more turn," early choices echoing into an empire. History as a ratchet. But the tree is authored
  by Firaxis; you climb it, you don't grow it.
- **SimCity** — the hook is **indirect stewardship**: you never command a citizen, you shape
  conditions (zoning, roads, taxes) and the city self-organizes, with legible emergent failure
  (traffic, crime, pollution) as feedback. Our closest cousin. But its agents are dumb and its
  aliveness is hand-tuned to *feel* alive.

**What LOOPHOLE does that none of them can:** SimCity's indirect stewardship + Factorio's
legible-autocatalytic mechanism + Civ's compounding emergent progression — but the subject is
**Gaia**, and the rules aren't tuned to fake aliveness, they *are* the mathematics that makes
aliveness happen (Holland's CAS, Kauffman's NK & autocatalytic sets, Prigogine's dissipative
structures, Margulis's symbiogenesis, Wolfram's class-4). You don't build the machine — you garden
an **autonomy you don't fully control**, and life authors its own tech tree by climbing trophic
levels, and occasionally **merges** into something neither you nor it planned. The titans give you
*mastery over a system*. LOOPHOLE gives the humbler, stranger pleasure of being a gardener of a
life that writes itself — "a pollinator and a plant having a relationship even if they don't know
it." The Gaian sublime, made playable.

## the reading list (the authors behind the murmurs — the research substrate)

Already canonized in the game's own murmur anthology, and the standing well to draw mechanics from:

- **Lynn Margulis & Dorion Sagan** — *Microcosmos* — "life did not take over the globe by combat,
  but by networking." **Symbiogenesis**: major evolutionary leaps came from merger/mutualism, not
  competition. → the food-web arc leads with the *pollinator*, and its endgame is *species merging*.
- **Stuart Kauffman** — autocatalytic sets, NK fitness landscapes, "order for free," the adjacent
  possible. → speciation, the excretion food-web loop, "variability × dependency = emergence."
- **John Holland** — complex adaptive systems, niche construction, tags & signals. → the diet
  vectors, established beds engineering their habitat, the (future) tag-matched exchange primitive.
- **Ilya Prigogine** — dissipative structures: order maintained by energy throughput. → flora/fauna
  as flow-dependent; the hysteresis the cascade test found.
- **Stephen Wolfram** — class-4 computation at the edge of chaos; computational irreducibility. →
  "reproducible surprise," the `[emergence]` dashboard as an edge-of-chaos instrument.
- **Philip Anderson** — "more is different" (emergence is real, not reducible).
- **Schrödinger** (negentropy), **Boltzmann** (the struggle for entropy), **Eddington** (the second
  law's supremacy), **Wiener** (patterns that perpetuate themselves), **Lewis Thomas** (the ant
  colony as an idea), **Mandelbrot** (fractals), and the non-dual turn — **Watts, Dōgen, Whitman,
  Thich Nhat Hanh** (the self as eddy; interbeing). → the game's voice and its closing turn inward.

New rabbit holes to chase as the loop runs (research things *I* am drawn to): Robert Rosen
(relational biology, (M,R)-systems, organizational closure) · Tyler Volk (*Gaia's Body*, metapatterns)
· Howard Odum (energy systems / emergy) · Conway's Life lineage & Langton's λ · Eric Smith & Harold
Morowitz (the thermodynamics of the origin of life) · Donella Meadows (leverage points in systems).

## the active arc

**The food web** (chosen 2026-06-19). Turn the food *chain* into a *web*, Margulis-first:
1. **mutualism** — a pollinator beast that *spreads* flora as it visits (positive-sum; networking).
   ✅ shipped (`ece74ac`), proven positive-sum.
2. **symbiogenesis** — a grazer and the diet flora it has *cohabited* long enough **merge** into a novel
   compound species (a **coral**): the never-been-done feature, Margulis's actual radical claim, made
   playable. ✅ shipped (2026-06-20). Generative/keystone proven on **diversity** (Paine's own variable —
   +24% kinds, biomass null), deterministic, round-trips. *(Led ahead of predation by Blaine's call: the
   arc is Margulis-FIRST, and the merger IS Margulis's claim — leading with it is more faithful than the
   orderly bottom-up march. The bond is cohabitation-not-predation; the proto-coral self-feeds off the union.)*
3. **predation** — a **keystone** culler that thins a herd and thereby *releases* the meadow
   (Paine 1966 / Yellowstone wolves: the top-down cascade mirroring the bottom-up one). Donor-controlled,
   refuge-bounded. The remaining step — now it can also regulate the new compound layer.

*Source of truth for what shipped: `2026-06-18-loophole-v04-as-built.md`. Memory: `loophole-prime-directive`.*
