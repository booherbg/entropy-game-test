# bloom — a factory whose machines are alive
### plant & pollinator co-evolution prototype · design spec

*Status: approved direction, ready to build (prototype-first). Date: 2026-06-30.*
*Working codename: **bloom** (Blaine's to rename — alternatives: nectary · verdance · heartwood · mothertree).*
*Lineage: LOOPHOLE (v1/v2, shipped) → eddy (deep sim, shipped, "not fun") → **bloom**. This is a deliberate redirection. **Leave `loophole/` and `eddy/` intact**; build in a new directory `bloom/`. eddy's simulation primitives (conserved field, seeded RNG, mutation/selection, the node-test harness discipline) are a reference, not a dependency.*

---

## 0. Why we pivoted (read this first)

Three critics played eddy blind and agreed (see `eddy/docs/2026-06-29-critique-panel.md`): eddy has rare
**depth** but is **not fun** — no agency, no progress, illegible. The originals (loophole v1/v2) had
**mechanics / points / unlockables** ("meaningful progress") but lacked depth — and *weren't that fun
either.* Neither hit the target. We then ran a design-preference tournament with Blaine (A/B + intensity,
7 rounds) and a long design dialogue. The result is a clear, new identity that occupies the empty quadrant:
**depth + meaningful progress, fused.**

## 1. The design DNA (from the tournament — these are non-negotiable)

1. **Coax, don't command.** Emergence is the soul; you shape conditions and life surprises you — but through *deliberate* moves, so surprise feels *caused*. *(lean)*
2. **The arc bends upward.** 🔥 Cultivation and pride — "look what I grew." Pressure is gentle drift / upkeep, **never a fight for survival.** *(strong)*
3. **One world, deepened.** Progress = a persistent world + an in-world unlock tree (here: the mother tree literally grows new niches). Light cross-world meta is optional, not the point. *(lean)*
4. **Lives in real time, moves in pause.** The world breathes on its own; you pause to make weighed moves. Ambient — it should be wonderful to *let it run overnight and come back.* *(lean)*
5. **Wonder, not power.** 🔥 The reward is a beautiful living world you witness and collect — **not** a numbers/engine snowball. *(strong)*
6. **Legibility is king.** 🔥 You always understand *why*; comprehension is part of the wonder. Confusion is the enemy. *(strong)*
7. **A machine that needs maintenance.** Big strategic moves + ongoing tending; gentle entropy keeps your hands in. *(strong, Blaine's own words)*

**Decision (Blaine): the prototype is a PURE SANDBOX.** Build the deep, interactive mechanics; let the fun
reveal itself in play; the game (goals, codex-as-objective) falls out later. The lesson from eddy that
overrides everything: **deep must not mean passive — the depth must have levers you can grab.**

## 2. The one-line vision

> **bloom is a pixel-art garden where you coax two living machines — a flowering mother tree and a colony
> of pollinators — into a co-evolving symbiosis, and watch natural selection sculpt them into an
> exquisitely-fit pair before your eyes.** Determinism gives legibility; mutation gives wonder; the same
> system gives both. A metabolism is a Factorio recipe; the food web is a factory that builds and evolves itself.

## 3. The prototype core (THIS BUILD — the bright line)

Everything outside this section is the **Thread Map (§8)** — recorded, but NOT built now.

### 3.1 The two machines + the one exchange

- **The mother tree (plant machine).** Rooted, grows deterministically from a genome (procedural,
  branching/L-system form). Runs on **energy**: photosynthesis (light → sugar). Spends sugar to grow
  structure and to build & maintain **flowers**. A flower offers **nectar** (food for pollinators) and
  needs **pollen carried between flowers** to set **seed** (its reproduction).
- **The pollinator + colony (animal machine).** Mobile creatures with a heritable **key**. They find
  flowers by beacon, **decode** the flower to extract nectar (and incidentally carry pollen), haul food
  back to a **colony**, which stores it and **spawns** new pollinators. The colony coordinates by
  **stigmergy** (see 3.3).
- **The exchange (the mutualism):** nectar → pollinator food → more pollinators; pollinator visits →
  pollination → more plants. Each is the other's reproductive organ. Neither survives alone. *This is the
  stasis.*

### 3.2 The signal lock-and-key — THE centerpiece mechanic

This is the load-bearing idea. It must be built first and proven beautiful. It is *two scales*:

- **Far scale — the beacon.** The flower has a **beacon color** (hue + intensity), a long-range attractor.
  A pollinator has a heritable **preference** hue. Attraction probability ∝ how well preference matches
  beacon. This is how a pollinator *finds* a flower.
- **Near scale — the decode-maze (the "colourful grid").** On landing, the flower presents a small
  **N×N colour grid** (e.g. 5×5) — its pattern/code, *literally rendered as pixel art* (the flower's
  petals/nectar-guides). To extract reward the pollinator must **decode** it with its heritable **decoder**
  (a complementary N×N template — its "reading apparatus"). **Reward ∝ match(decoder, grid)** (pattern
  correlation/overlap). A good match → fast, rich nectar + strong pollination. A mismatch → fumbling,
  little nectar, weak pollination.

**Net reward to a visit ≈ beaconMatch × gridMatch.** Pollination delivered to the plant scales the same
way (a well-matched visitor pollinates well).

**Why this mechanic earns everything we want:**
- **Rewards niche/specialization for free.** A pollinator whose decoder fits *this* flower's grid out-eats
  generalists → it proliferates → the pair tightens into a matched lock-and-key.
- **Co-evolution is VISIBLE.** Selection drifts flower grids toward pollinator decoders *and* decoders
  toward grids → the two pixel patterns **converge ("merge")** over generations, *on screen.* This visible
  merge is the prototype's proof-of-soul. **If watching the two grids drift into a matched pair gives
  Blaine chills, the whole project is earned.**
- **Speciation is a verb** (emergent): split a population (§3.5) and the grids/decoders diverge into two
  matched pairs → two species. The player caused it.
- **"Barely surviving → exquisitely fit" is the whole arc:** start with a *random* flower grid and a
  *random* decoder, badly matched (fumbling, colony starving at the edge). Play = watching/steering them
  co-adapt until the pollinator reads the flower like a native.

**Genome → flower → decode-grid (the expression, nailed down — see the live reference in
`docs/bloom-mechanisms.html`, "Mechanism 1·b"):**
- **The genome is ~8 genes, two kinds.** *Form:* `symmetry` (petal count), `petalLength`, `petalSharp`
  (round↔pointed), `coreSize`. *Signal:* `petalColor`, `guideColor`, `coreColor` (indices into a shared
  pixel-art palette), `guidePattern` (which radial bands carry the nectar-guide colour). That's the whole
  heritable code. **The grid is not separate from the flower — the grid IS the genome, the flower is its
  bloom.**
- **Expression is a polar function.** For every pixel, its distance `r` + angle `θ` from the centre decides:
  inside `coreSize` → core; out along a petal lobe (`reach = coreSize + (petalLength−coreSize)·
  petalWave^petalSharp`, where `petalWave = (cos(θ·symmetry)+1)/2`) → petal, with guide-colour bands where
  `guidePattern` says; beyond → empty. Colours are palette indices → pixel art. The `symmetry`-fold radial
  repeat is *why a flower looks like a flower.*
- **The decode-grid = one petal-wedge, unrolled.** Because the bloom is radially symmetric, all its signal
  lives in one pie-slice. Take the wedge centred on a petal (θ ∈ [−π/symmetry, +π/symmetry]) and flatten it:
  **radius → rows (core→tip), angle → columns (gap→petal→gap)**, then downsample to a 6×6 of palette
  indices. *That* is the fingerprint the pollinator's `key` matches. One genome, two renderings — bloom
  (world view) and grid (inspect view).
- **Match → reward.** A random key vs a random grid matches ≈ 1/palette (genuinely "fumbling"); the climb to
  ~100% ("native") is the visible co-evolution. Discrete palette + exact-ish match keeps the start low and
  the merge dramatic (and pixel-art). Mutation nudges one gene → the bloom *and* the fingerprint shift a
  little → smooth, visible drift.

### 3.3 The pollinator & colony — operations (see `docs/2026-06-30-pollinator-colony-operations.svg`)

**The pollinator (the animal machine).** Genome (heritable, mutable): `preference` (beacon hue it's drawn
to), `key` (its decode template; its body markings *express* the key → specialization you can read /
camouflage), `forageRange`/`speed` (cost trade-off), `dietBias` (nectar vs pollen priority); later
`tolerance` (poison). State: position, mode, nectar carried, pollen carried, pollen-on-body, target, age.

**The forage loop (operations):**
1. **Leave** the colony (search).
2. **Find** a flower: scan within range for beacons matching `preference`, weighted by trail strength.
3. **Approach** the chosen flower.
4. **Decode** on landing: `match(key, flower.grid)` → extraction efficiency.
5. **Collect**: take **nectar** + **pollen** scaled by efficiency; **deposit** pollen-on-body carried from
   the *previous* flower → **pollination** (same species → that plant sets seed); pick up fresh pollen.
6. **Return** to the colony, laying a **recruitment trail** tagged by the flower's beacon + quality (stigmergy).
7. **Deposit** nectar + pollen into the colony stores; rest; repeat. Die of age / if unfed.

**The colony (the emergent machine).** State: position, **nectar store**, **pollen store**, population.
Per tick: **intake** from foragers; **upkeep** spends nectar (empty → foragers starve — the gentle
maintenance pressure); **build** spends pollen to raise **larvae → new pollinators** (inherit a well-fed
parent's genome + mutation — *pollen is the machinery*); **recruit** via trails → emergent collective
foraging, no leader. (Budding, castes, the navigable comb = Thread Map.)

**How it closes (co-evolution).** Well-fed keys raise more larvae → the colony's keys drift toward the
flowers; pollinated flowers set more seed → grids drift toward the keys → the lock-and-key **merges**
(stasis). Perturb it (lock a trait, split the patch, grow a new niche) → it re-adapts.

### 3.4 Resources — TWO currencies (nectar + pollen), embodied as light & colour

*(Revised from a one-currency model — Blaine pushed for specific resources feeding machinery over a generic
"thanks for energy" reward, and it's the right call: it buys real optimization without a spreadsheet. The
biologically-true split is exactly the Factorio energy/material split.)*

- **Light → sugar** (the plant's photosynthesis recipe, deterministic). The tree spends sugar to grow and
  to build & stock flowers. A flower packages sugar into the two things pollinators collect:
  - **NECTAR = energy.** Runs the colony — flight, foraging, upkeep. The fuel. Empty → foragers starve
    (the gentle maintenance pressure; you tend it, you don't fight it).
  - **POLLEN = material.** Builds the colony — larvae (new pollinators) and structure. **This is the
    machinery currency:** pollen literally builds bodies.
- **Pollen is the shared hinge of the mutualism.** The pollinator wants to *eat* it (protein → larvae);
  the plant wants it *carried* (→ pollination → seed). So a flower co-evolves how much pollen to hand over
  vs. how much to ensure leaves on the visitor. The tension *is* the symbiosis.
- **The depth is the balance.** A colony needs *both* nectar and pollen; different flowers/niches offer
  different ratios (nectar-rich high flower vs pollen-rich low flower vs a resin sap-well later) → you must
  forage a *balanced diet* → which flowers to prioritise, which specialists to breed. Two legible meters,
  real optimisation, no spreadsheet.
- **Value gradation = the tension.** A richer flower (brighter beacon, sweeter nectar, more pollen, fancier
  grid) costs the tree *more sugar* → every flower trait is a real trade-off → selection has teeth. Trails
  encode "this flower pays."
- **Embodied, not abstract:** the resource *is* what you see — pixels of light, a nectar droplet, a pollen
  load on a pollinator's legs, sugar glowing in the trunk. **"Pixels are a prime resource" is literal:**
  colour = energy. Maintenance/respiration dissipates as heat (2nd law); the world is bounded by light in ÷
  losses (eddy's dissipative thesis, kept). (Do NOT reintroduce eddy's abstract lumen/mineral/humus —
  nectar + pollen, embodied, is the whole economy.)
- **Payload quality/toxicity is a Thread-Map layer, not the prototype** (see §8): a flower could lace its
  payload — toxic to a *mismatched* generalist, safe to its matched specialist (real biology) — flipping
  the lock-and-key from "match = more" to "match = safe / mismatch = poisoned," and enabling deception.
  Great, but it rides on top of the two-resource base. Build the base first.

### 3.5 The player — steward of selection (the levers; sandbox)

You never paint a flower. You set the conditions under which it paints *itself* over generations:
- **Lock / release a trait.** Freeze a flower's grid (force pollinators to chase it) or release it (let it
  drift). This is the minimum viable lever and must exist in v1.
- **Plant / seed** a tree; **place** a colony. (Where you put them shapes the world.)
- **Wall / open** (high value, include if cheap): a barrier isolates populations → they diverge →
  speciation; reopen → competition/hybridization. (The lab→release toolset is §8.)

### 3.6 The dashboards (SVG) — comprehension is the wonder

Beautiful, legible instrumentation (Principle 6). At minimum:
- **The lock-and-key fit** — the headline gauge: mismatch → match over generations (the "merge," quantified).
- **Trait-drift over time** — flower hue / grid / nectar, pollinator preference / decoder (line graphs).
- **Population over time** — trees, pollinators, colony size.
- **A lineage view** — the genealogy of forms (doubles as the **codex** of wonders drawn out).
- **Inspect-a-creature** — the "living machine": its recipe (eats → process → makes) + its grid/key, and
  *why it looks the way it does* (form/colour/camouflage as a record of adaptation). See mockup:
  `docs/2026-06-30-living-machine-mockup.svg`.

### 3.7 The progression seed — the mother tree grows niches

Even in the sandbox, prove the keystone progression idea: the tree starts as a sapling with **one** crude
flower-niche; investing sugar lets it **grow a second niche** (a new flower at a different height/colour/
grid). Each niche = a new lock awaiting a key → a new specialization to discover → the web widens. *The
unlock tree is literally a tree.* Prototype proves it with **1 → 2 niches**; the full progression is §8.

## 4. The aesthetic — pixel art + generative + lots of colour

- **The living world is generative pixel art on a low-res canvas, scaled up crisp** (nearest-neighbour).
  The resource field is colored pixels (light/sugar). Plants grow as procedural pixel structures
  (L-system / CA on the pixel grid). Flowers are generative pixel sprites whose pattern **is** the decode-
  grid. Pollinators are small **animated** pixel creatures (a few frames = "actuation"), their body colour
  partly **reflecting their specialization** (a red-flower specialist reads reddish → camouflage +
  legibility at a glance). Nectar/pollen/trails are pixels.
- **The instrumentation is SVG** — crisp, scalable, generative dashboards and the inspect "machine"
  diagrams. (SVG also fits Blaine's love of generative SVG and renders/verifies well headless.)
- **Palette:** warm, organic, saturated-but-not-garish; the dark loam ground of the lineage, colour =
  life/order against gray entropy. Beauty is a first-class requirement, not polish.

## 5. Technical approach

- **Vanilla HTML / Canvas / JS. Zero dependencies. No build step. No server.** (Project tradition.)
- **Deterministic, seeded RNG; CPU-authoritative sim; node-testable core** separated from the browser
  render (the eddy discipline: logic in modules that load under Node, render/UI as thin browser layers).
- **Rendering:** 2D canvas for the pixel world (offscreen low-res buffer → scaled draw); inline SVG (or
  lightweight SVG-string build) for dashboards/inspect. (WebGL only if perf demands; prototype shouldn't.)
- **Persistence:** localStorage (serialize the world); deterministic seeds are shareable.
- **Deploy:** gh-pages, beside eddy (`bloom/` → `<gh-pages>/bloom/`), via the git-worktree method used for
  eddy (see the `loophole-roadmap` memory / eddy deploy commits). Re-deploy after meaningful changes so
  Blaine can play on any device.
- **Loop discipline:** finding-per-commit; a `bloom/test/harness.js` of node assertions; headless-Chrome
  screenshots for visual verification (the eddy method: `--headless=new --use-angle=swiftshader
  --enable-unsafe-swiftshader`, an autobegin temp HTML, run with `dangerouslyDisableSandbox`).

## 6. Components (each a unit with one purpose)

- **field** — the pixel resource grid (light, sugar deposits, nectar, pheromone/trail channels). Conserved
  + dissipative. *Interface:* sample/deposit/diffuse. *Depends on:* grid, rng.
- **genome** — compact heritable trait vector for plants (form, beacon, grid, nectar/cost) and pollinators
  (preference, decoder, behavior). *Interface:* random(), mutate(), express(). *Depends on:* rng.
- **plant** — grows form from genome on the field; photosynthesizes; builds/maintains flowers; sets seed on
  pollination. *Interface:* tick(field), flowers(), reproduce(). *Depends on:* field, genome.
- **flower / signal** — beacon (hue,intensity) + N×N grid; nectar pool; pollen. *Interface:* match(key),
  visit() → reward + pollen transfer. *Depends on:* genome.
- **pollinator** — key (preference, decoder) + state (energy, pollen, location, target). Forage → decode →
  return → deposit. *Interface:* tick(field, flowers, colony). *Depends on:* field, flower, genome.
- **colony** — store; stigmergic recruitment; spawn. *Interface:* deposit(food, trailTag), spawn().
- **sim** — owns field + plants + pollinators + colonies; tick(); selection/repro/mutation; serialize.
- **genetics/selection** — fitness from realized reward/pollination → reproduction with mutation → drift.
- **render-world** (canvas pixel) and **render-dash** (SVG) — pure-ish views of sim state.
- **tools** — lock/release trait, plant, place colony, wall/open. Mutate sim via clear calls.
- **harness** — node assertions on the deep behaviors (see §7).

## 7. Verification (what "it works" means)

Node harness assertions (deterministic):
- **Energy is bounded** (no runaway / no silent death from a bug; light-in ≈ work + dissipation).
- **The exchange closes:** with a matched-ish pair, plants and pollinators both persist (stasis), neither
  alone.
- **Co-evolution reduces mismatch:** starting from random flower-grid + random decoder, mean lock-and-key
  mismatch *decreases* over generations under selection (the soul, measured). Quantify the "merge."
- **The lever works:** locking a flower grid makes the pollinator decoder converge toward it (one-sided).
- **Speciation is reachable:** a walled split yields two divergent matched pairs (if walling is in v1).
- **Determinism:** same seed → same world; serialize→load is identical.

Visual verification (headless Chrome, the documented method): the world renders as colourful pixel art;
flowers/plants are generatively varied; the dashboards read; the two grids visibly converge over a run.

**Prototype success = the soul test:** running it (or letting it run), Blaine watches a random, fumbling,
barely-surviving pair co-adapt into an exquisitely-matched, beautiful lock-and-key — and it gives him
chills, it's legible, it's gorgeous, and he can grab a lever and steer it. If yes → build the Thread Map.
If no → we learned cheaply what's missing.

## 8. The Thread Map (LATER — the vision we build toward, in rough order)

Recorded so it isn't lost; **out of scope for the prototype.**
1. **Niches-as-progression, deepened** — many tree niches (high/low flowers, sap-wells, shelter, fruit);
   investing sugar to grow them is the core progression; each is a new emergent relationship.
2. **Honest vs. cheating signals + payload toxicity** (Blaine's) — deceptive flowers (no reward),
   nectar-robbers, and **laced payloads**: a flower's nectar/pollen can be toxic to a *mismatched*
   generalist but safe to its matched specialist (real biology — nicotine nectar, "mad honey"). Flips the
   lock-and-key from "match = more" to "match = safe / mismatch = poisoned" → rewards specialisation harder,
   enables deception. Trust + tolerance co-evolve. The deep engine of drama, on the same channel.
3. **Predator-mimic** (Blaine's) — a predator wearing the flower's code to ambush foragers; exploits the
   signal channel → Red Queen. Just another niche.
4. **Castes & quorum** — forager/nurse/scout roles differentiate from simple rules; colony decisions by
   quorum; the navigable interior (route pollen through built structure). The colony as a mind.
5. **Temporal niche (phenology)** — flowering *time* as a trait → isolation/speciation in time, not space.
6. **Mycorrhizal web (Simard's literal "Mother Tree")** — underground fungal network sharing sugar, the
   hub tree nursing seedlings. A hidden second economy.
7. **Seed dispersal** — fruit → frugivores carrying seed → a second mutualism; the web extends past pollination.
8. **Symbiogenesis** — obligate one-to-one fusion (figs & fig-wasps) → two becoming one compound being.
   The far horizon of "the two apparatus merge," and the canon endgame.
9. **The lab** — a contained bench to design niche-adapters / nudge genetics / run trials → release into
   the wild. Richer steward-of-selection tooling.
10. **The game falls out** — once the sandbox is fun, distill goals/objectives/codex *from observed play*
    (NOT imposed up front).

## 9. Open questions (Blaine's calls)
- **Name** (codename `bloom`; alternatives listed up top).
- Grid size N (start 5×5? — tune for legibility vs. expressiveness in the build).
- Whether walling/opening is in the prototype or the first post-prototype thread.

## 10. First on-ramp (for the fresh session)
Suggested build order (turn into a proper plan via the writing-plans skill):
1. Scaffold `bloom/` (index.html, js modules, test/harness.js) + the pixel canvas + seeded RNG + field.
2. The **plant**: genome → procedural pixel growth + photosynthesis/sugar + one flower (beacon + N×N grid).
3. The **pollinator + colony**: forage (beacon attraction) → decode (grid match → nectar+pollination) →
   return (stigmergic trail) → store → spawn. Energy economy closed.
4. **Genetics**: heritable traits + mutation + selection (reward → reproduction). Harness: the exchange
   closes; energy bounded; determinism.
5. **Co-evolution proof**: random start → measured mismatch decrease (the soul test, in the harness).
6. **Render it beautiful**: generative pixel flowers/plants/pollinators, colour, animation; the grids
   visible. Headless screenshot verification.
7. **The lever**: lock/release a trait + the lock-and-key fit dashboard (SVG). Then the soul test *by eye*.
8. Deploy to gh-pages. Show Blaine. Iterate from his eyes.
