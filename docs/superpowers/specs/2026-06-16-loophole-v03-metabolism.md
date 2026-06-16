# LOOPHOLE v0.3 — "the metabolism"
### design spec · 2026-06-16

The garden stops being an accumulator and becomes a **dissipative structure**: order
flowing through it, doing work, leaving as heat. This cures idle-coast (a static garden
starves), opens the Factorio logistics layer, and lays an **extensible field substrate** so
later systems (genetics, weather, new resources, Civ eras) attach without rewrites. The
theme widens from *entropy* to *the complexity of interwoven systems and the surprises they
make*. Visuals become a pillar — the flows themselves must be beautiful, legible, and a
little psychedelic.

---

## 1. Two resources (start legible; more become "later layers")

- **order ✦** — capital. Spend to plant and to invoke rites. Earned as income. Heat-capped (kept).
- **sap** (a living flow, glyph ❧) — per-turn throughput. Produced, routed, consumed each turn;
  it is a *flow*, not a hoard. The surplus becomes order.

Light/nutrient/pheromone are deferred — they slot in later as new fields on the same engine.

## 2. The metabolism (the idle-coast fix, and the Factorio core)

Each turn, after behaviors (spread/grow/eat/CA/pulse) run:

**Producers** emit sap:
- **mature moss on a gradient** — sap ∝ gradient strength (a cleaned interior makes none).
- **ant colonies** — convert the entropy they eat into sap (eat disorder, excrete life).
- **crystals** — a small steady trickle (stored order leaks as life).

**Mycelium is the grid.** Each network pools its members' sap and shares it. Unnetworked
producers feed only their own cell + neighbors.

**Consumers** draw upkeep:
- **frond** — upkeep ∝ depth (deep fronds are hungry); fed → pays order ∝ depth²; starved → wilts.
- **bloom** — small upkeep; fed → births/pays; starved → fades.
- **heartwood** — large upkeep; fed → pulses (the pulse also pushes sap); starved → cannot pulse, decays.
- **mycelium** — a tiny upkeep to run the grid.

Per group, `fedRatio = clamp(sapProduced / sapUpkeep, 0, 1)`. Consumer order output scales by
fedRatio; below ~0.5 the group **starves** and its consumers wilt. **Order income** = Σ(fed
consumer output) + surplus·convRate + a small sunlit base.

Consequence: a static garden can't coast — producers need gradients (idle cleaning removes
them) and consumers need continuous supply. You must keep the flows balanced: spread producers
on the frontier, lay mycelium to carry sap, place hungry consumers within reach, and read the
ratio. That *is* the game now.

## 3. Action economy (Civ turns) — next pass, designed now

Per turn you get **action points** (base + stage + upgrades). Plant/tend/prune/rite cost AP;
when AP is spent you end the turn and **the environment acts between turns** (seep, spread,
blight, pulses, wilting). Turns become deliberate triage, not "do everything affordable."
Self-replication (moss spread, CA, pulses) happens in the environment phase, so AP is for your
intent. Tuned generously (≈8–12/turn). Built in its own pass to keep the metabolism stable.

## 4. Rites — expensive board-scale activations (where big order goes)

Powerful, costly, dramatic. Gated by stage, some unlocked via the tree. Examples:
- **Spring Surge** — a wave of order + sap across the whole board.
- **Terraform** — convert a region's soil to a chosen biome.
- **Genesis** — seed a balanced cluster of patterns at once.
- **Quell** — disperse an incoming squall / purge a blight bloom.
- **Coalesce-seed** — late, expensive, accelerates the waking.

Large order finally has a sink with weight.

## 5. Extensible field substrate (so later layers attach)

Generalize the board from "entropy per cell" toward **named fields** (entropy, sap, and later
nutrient/pheromone/heat/fertility) with shared diffusion/production/consumption machinery.
v0.3 establishes sap as the second field through this lens; new systems become *new fields +
rules*, not new spaghetti. Regions accrue persistent **fertility** from sustained life — the
"ecosystem that develops underneath," which weather/genetics/wonders can read.

## 6. Visuals — a pillar (legible + psychedelic)

- Sap visualized as **luminous pulses flowing along the mycelial grid**, brightness ∝ flow;
  producers glow warm, fed consumers shimmer, starving networks pulse a warning hue.
- HUD **sap meter**: net production vs upkeep, with a flow arrow.
- The reaction-diffusion substrate becomes **live and reactive**, blooming color where order
  deepens; aurora gradients; bioluminescent palette under high coherence.
- Per-cell tooltip names role (producer/consumer · fed/starved) so the system is readable.

## 7. Roadmap (phased)

1. **part 1 (this pass): the metabolism** — sap engine + idle-coast fix + sap visualization +
   rites. Harness retuned, serialized, shippable.
2. action economy (AP + environment-between-turns).
3. Civ layer — eras with civic forks, alternate win conditions (Gaia / monument / harmony).
4. micro-systems — genetics (mutating lineages), diffusing fields, weather fronts, pollinator allies.
5. full psychedelic visual overhaul + deeper skill trees / unlockables.

## 8. Verification

Harness stays green: idle now **decays** (new test — a built garden left alone loses coherence);
greedy bot, rewritten to balance producers:consumers and lay grid, wins ~50–65% in 45–90 turns;
chaos fuzz never throws/NaNs; serialize↔load identical with sap stats; determinism holds.
Screenshot-verify the sap flow reads clearly and looks gorgeous.
