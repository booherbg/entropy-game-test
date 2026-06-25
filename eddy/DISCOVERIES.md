# eddy — discoveries

*A lab notebook for the autonomous loop, inherited from LOOPHOLE. Findings about the **simulation's
own behaviour** — what it does that nobody designed — newest first. Not a changelog of features.
Design & soul: `docs/superpowers/specs/2026-06-24-loophole-successor-genesis.md`.*

---

## 2026-06-25 · matter cannot leave by the back door

The first thing the simulation taught its builder was a correction. The plan let an organism's
**upkeep** simply decrement its biomass each tick — a number going down, the spent matter going
nowhere. The death-conservation test refused it: matter was vanishing. The fix was not a fudge factor
but the physics — **upkeep is respiration, and respiration returns matter to the world as humus.**
Once spent biomass was excreted rather than deleted, the whole cycle balanced to floating-point
precision: eat → keep your ratio → excrete the surplus → respire upkeep → split → die back into the
soil, and the books always close. The honesty wasn't decoration; it was load-bearing. *Boltzmann:
the struggle for existence is a struggle for entropy — and entropy is conserved bookkeeping, not free
lunch.*

## 2026-06-25 · upkeep is the carrying capacity

Left at its first guess, the world **exploded** — life reproduced to the population cap and pressed
against it, a green goo. The lever that tamed it was not a population limit (that is only a safety
net) but **upkeep**: the matter an organism must spend merely to persist. Raise it, and the
break-even intake rises with it, so the supply a region can offer divides into fewer sustainable
lives. At upkeep 0.15 the same two springs that produced goo now hold a **stable band — about fifty
lives, six coexisting diets, neither collapsing nor exploding, across four hundred ticks and every
seed tried.** The edge of chaos turned out to have an address, and it was metabolic cost. *Schneider
& Kay: life is a means of dissipating a gradient — and it can only dissipate as much as flows.*

## 2026-06-25 · the world is reproducible, and that is the point

Same seed, same moves, identical world — hashed and checked. This is not a nicety. A world you can
re-run is a world whose surprises you can **trust**: when something strange emerges, you can replay
it, trace it, and know it was the rules and not a fluke. Determinism is what lets the loop tell signal
from noise.

---

*Open threads for the loop: does a humus-eater reliably arise from a lumen-eater's excreted waste
(the food web extending itself, unbidden)? Does the overlap of two generators breed a genuinely
distinct blend-diet species? Watch, and write it here.*
