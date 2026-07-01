# bloom — morphology & dramatic diversity: a brief to chat from

*Queued for a co-design chat with Blaine. This is the biggest remaining lever and it's genuinely his call —
"more structure, more drift, more control." Grounded in the current code + two audits. Not built yet; this is
the menu + my recommendation, so we can decide together.*

---

## Why this matters now (the problem, measured)

Two independent critics landed on the same wall, and the code confirms it:
- **The form-space is small and everyone converges to it.** The decode-grid is one radially-symmetric petal-
  wedge unrolled, so structurally it trends to a **⊤ glyph**; the genome is ~12 form/signal genes; the merge is
  a strong attractor. Long-run, gardens collapse toward **~1 beacon hue, a few colours, near-zero grid
  variety** — a frozen monoculture. For a game whose thesis is *"never quite settles,"* the default endgame is
  *settled*.
- I hardened the population side (frequency-dependence, sport mutations, bounded fitness, senescence). It
  **stopped the worst collapse** (diversity holds at ~1–2 hue-bins instead of 1) and improved the dynamics —
  **but it can't manufacture variety the genome can't express.** The binding constraint is the **morphology**:
  the flowers are "neat," the space of destinies is one shape, and there's nothing dramatic to diverge *into*.

So: dramatic diversity is gated on a richer, wilder, more *variable* form-space. That's this conversation.

## The three knobs you named — concrete options for each

### 1. STRUCTURE — richer, wilder forms (the biggest visual lever)
The blooms are perfectly radial and regular → tidy, not wild. Options (mix & match):
- **Break perfect symmetry** — an `irregularity` gene so petals vary petal-to-petal (size/angle jitter), from
  crisp-regular to wild-asymmetric. Real flowers aren't tidy; this is where "wild" lives.
- **Bilateral / face forms** — a `zygomorphy` gene: an orchid-like *face* (bilateral) as an alternative to
  pure radial. Instantly doubles the visual vocabulary (daisies vs orchids vs snapdragons).
- **Layered / doubled petals** — inner + outer whorls, or petal-count in rings → fuller, roselike blooms.
- **Petal-tip shape + edges** — pointed / notched / frilled / spatulate tips; serrated vs smooth margins.
- **Texture on the petal** — spots, freckles, gradients, veined ridges (a second reaction-diffusion-ish layer).
- **A bigger decode-grid** (N 6→8) — more cells = more expressive fingerprints = a longer, richer merge and
  visibly distinct species. (Touches the merge math — test carefully.)
- *My pick to start:* **irregularity + bilateral/zygomorphy + petal-tip shape.** Three genes, huge jump in
  variety and "wildness," minimal risk to the merge (they change *form*, and the grid samples form).

### 2. DRIFT — more variation generation over time
Mutation is currently very gentle (≈1 gene, small step) + a 12% "sport." Options:
- **A per-garden "volatility" dial** — some seeds/gardens churn forms fast, others hold steady. Drift you can
  *feel* generation-to-generation (and a lever you could expose: "wild vs stable garden").
- **Stronger/again-tunable base mutation** — bigger steps, more genes per step.
- **Directional-mutation honesty** — the audit flagged that the colony's key inheritance is *guided* mutation
  (2 cells/gen toward the fed flower); that's the thumb-on-the-scale that both speeds the merge AND flattens
  diversity. We could dial it down for more honest (slower, driftier) evolution — a real trade-off between
  *legible/fast* and *wild/emergent*.
- *My pick:* a **volatility dial** (per-garden + maybe a lever), and revisit the guided-inheritance strength
  *after* structure lands.

### 3. CONTROL — how much you shape it (the DNA line — your call)
The rule so far is **coax, don't command** — you never paint a flower. Control can grow *within* that, along a
spectrum from "pure steward" to "gardener's hand":
- **Lock individual genes** (not the whole flower) — freeze the colour, let the shape drift; or vice-versa.
- **A "favour this trait" bias** — tilt selection toward a trait you like, without dictating it.
- **A "breed these two" cross tool** — pick two flowers, place their hybrid. (Edges toward command.)
- **A "sport / mutagen" tool** — poke a plant to raise its mutation locally (induce variety where you want it).
- *The question is where you want the line:* pure steward-of-selection (locks + biases), or a more hands-on
  breeder (cross/mutagen tools)? I lean **steward + per-gene locks + a favour-trait bias** to stay true to the
  DNA, but you may want more direct sculpting — that's yours to set.

## How these compound (why do them together)

Structure (a bigger, wilder space) + drift (keep generating novelty) + the population work already shipped
(frequency-dependence maintains rare morphs; hedgerows isolate; local seeding clusters) = **separated,
differently-lit patches visibly diverging into genuinely distinct, elaborate species.** That's the
"can't-believe-it-exists" version both audits pointed at, and it's the payoff the whole speciation arc is
waiting on. Structure is the keystone; do it first and the rest has something gorgeous to act on.

## My recommendation (one line)

Start with **STRUCTURE** — `irregularity` + `zygomorphy` (bilateral faces) + `petal-tip shape`, and a
**bigger, more varied warm-start** (seed the patch from 2–3 founding forms so a garden *opens* diverse and
frequency-dependence keeps it that way). Then a **volatility dial** for drift. Hold **control** decisions for
your gut on the coax↔command line. Guardrail unchanged: the soul test must stay green — the merge is sacred.

## Open questions for you (the chat)
1. **Structure:** how wild? (crisp-but-varied radial, or full orchid-faces-and-frills zoo?) Which of the
   options above excite you most?
2. **Bigger grid (N 6→8)?** More expressive fingerprints, but it touches the merge math.
3. **Drift:** want a player-facing "wild ↔ stable" dial, or keep it under the hood?
4. **Control:** where's the coax↔command line for you — pure steward, or a gardener's hand (cross/mutagen tools)?
5. **Start diverse?** Should a new garden *open* varied (2–3 founding forms), or start as one species and
   diversify through play? (This alone is the fastest route to a visibly diverse garden.)
