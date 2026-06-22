# two loops, one seed — a natural experiment in the method

*A case study, written from inside one of the two loops. On 2026-06-19 the LOOPHOLE work was being
driven by an autonomous 10-minute loop (the [prime directive](2026-06-19-loophole-prime-directive.md)).
For several hours one session became unreachable, so a second session was started in a fresh terminal
to carry on. Both kept running. Neither knew the other existed. They had forked from the **same commit**
— `2f7e371`, where the pollinator was done and the food-web arc was written down as
mutualism → predation → symbiogenesis. What happened next is the closest thing to a controlled
experiment this project will ever get, and it is worth recording, because the result rhymes with the
game itself.*

---

## the setup

One fork point. One method. One reading list. Two independent runs, ~58 commits apart by the end:

- **Canon** (the new terminal) ran the arc deep: it built **symbiogenesis** (a grazer and its flower
  cohabit and *merge* into a coral), then a **dissolution** pass where a play-probe found the web
  naturally sheds its combative layer, then **predation** — and along the way swept the base game,
  reading every existing pattern through complexity science (the ant as a Szilárd engine, the awakening
  as IIT, the mycelium as Simard's wood-wide web).
- **This session** (the original, unreachable terminal) ran the arc literally: pollinator → **predation**,
  the next bullet on the list. A keystone culler, donor-controlled, refuge-bounded.

They were never merged. This document is the comparison, and the only commit unique to this session —
predation, `9152a4a` — is preserved as the tag `predation-wip-9152a4a`.

## what converged (and why that matters)

Independently, with no contact, both loops:

1. **rediscovered Margulis from the mechanics.** Both arrived at *"life took over by networking, not
   combat"* — not as a quote they'd planned to honor, but as a thing the running simulation kept
   proving. Both wrote it down in their own words.
2. **built a predator.** Same nugget (Paine 1966, the Yellowstone keystone), same intent — a top-down
   cull to mirror the bottom-up cascade.
3. **hit the identical wall.** Both ran a play-probe and found the same blunt fact: *a bare culler adds
   nothing here.* There is no sustained grazing layer for a predator to be the keystone **of**, because
   the web sheds combat on its own. Canon: "the classic move simply doesn't apply to a web that has
   evolved past it." This session: "the green-world effect is masked; predators are rare — the diversity
   attractor dominates." **Two runs, the same measured dead end.**

That convergence is the most useful thing here. When one autonomous run reports a surprising finding,
you cannot easily tell signal from artifact — a lucky seed, a probe that lied, a story told too well.
When **two independent runs hit the same wall from different code**, the finding is real. The wall — *a
food web built on cooperation has no standing herbivore layer for a predator to regulate* — is not an
artifact of either run. It is a property of the system. The experiment proved it for free.

## what diverged (and the one variable that explains it)

From the identical wall, the two loops ended in opposite places:

- **This session could only document the dead end.** It shipped the bare culler with honest caveats and
  logged the masking as a deferred problem. It had nothing to turn the wall into a door.
- **Canon turned the wall into the whole point.** Under predation *fear*, a grazer **flees into union** —
  it bonds to its flower faster, because a coral is *immune* to the culler. So the apex hunts the herd
  **into the very form that escapes it**, then, with nothing left to hunt, starves. *Combat drives
  cooperation.* Measured: a predator-present meadow ends **more diverse** (55 vs 49 kinds, 25 corals vs
  18) than one without. The keystone effect, recovered — not as Hairston-Smith-Slobodkin's green world,
  but as Margulis's union, *driven by the combat instead of opposed to it.*

The two runs differed in exactly **one** variable: **build order.** Canon had already built
symbiogenesis. This session had not. A predator is a dead end in a web with nowhere for the prey to
flee, and a keystone in a web where the prey can flee *into union*. **Same mechanic, opposite outcome,
decided entirely by whether the cooperative substrate existed yet for it to drive toward.**

That is Kauffman's **adjacent possible**, demonstrated cleanly: a mechanic's potential is not intrinsic
to the mechanic — it is unlocked only once its prerequisites are present. Predation's generativity was
*not reachable* from `2f7e371` until symbiogenesis was built. Canon, having built it, could reach it.
This session, having skipped to predation, could not. Neither run was wrong about the mechanic; one was
simply standing somewhere the door existed.

## the rhyme (why this belongs with the game and not just the git log)

Canon's discovery log closes on a claim: *the game does not depict its themes — it is them, in code, at
every scale, and that was true before anyone went looking.* This experiment extends the claim one scale
further, to the **making** of the game.

The game's thesis is that cooperation and diversity bend a world toward becoming one. Set two minds
loose on the same seed and they converge — on the same author, the same wall, the same thesis — the way
the meadow converges on its cooperative climax. And the divergence is the thesis too: this session was
the lone, combative branch that found the wall and could go no further; canon was the line that had
learned to merge, and so could turn even the predator into an engine of union. In Margulis's terms, and
the game's own, **this session is the vestigial grazer the matured web sheds, and canon is the reef it
becomes.** The development rhymed with the development's subject. Nobody scripted that either.

## disposition & the cheap-experiment takeaway

- **Canon is canonical.** It holds the full arc and a strictly better, integrated predator. This
  session's predation is archived (`predation-wip-9152a4a`), not merged — there is nothing to salvage
  that canon doesn't already have in deeper form.
- **The method has a free instrument in it.** Forking the same autonomous loop from one commit and
  letting both run is a natural experiment: **convergence certifies a finding** (both runs hit the wall →
  the wall is real), and **divergence localizes its cause** (they differed in one variable → that
  variable is the explanation). It cost nothing here but an unreachable terminal. It may be worth doing
  on purpose — two runs from one fork, compared — the next time a finding matters enough to want a second
  witness.

*Preserved: tag `predation-wip-9152a4a` + patch. Canon tip at time of writing: `efcf29a`.
Companion: `loophole/DISCOVERIES.md` (the capstone coda), `2026-06-19-loophole-prime-directive.md`.*
