# bloom — a SimCity/Maxis designer plays it blind

*Critique pass, overnight build. The critic is a systems-game designer in the Maxis lineage (SimCity 2000/3000,
SimEarth, SimLife, The Sims) — the people who made "a living system you poke" into a genre. They played the
prototype cold, then read the design DNA. Format follows `eddy/docs/2026-06-29-critique-panel.md`: what works,
what doesn't, and the ranked fixes. Cross-checked against the spec's seven DNA principles, the murmurs imprint,
and the two mockups (living-machine, colony-operations).*

---

## First impression (60 seconds, no instructions)

> "Oh — it's *alive* when it opens. That's the thing eddy got wrong and this gets right. There are flowers
> glowing, little foragers streaming up green trails to a hive at the bottom, and a number in the corner ticking
> up. I didn't do anything and it's already a system breathing at me. Within ten seconds I understood the loop
> without a tutorial: bees go to flowers, come back, the bar fills. That's a *toy* — I want to poke it. Good."

**What lands (measured against the DNA):**
- **The arc bends upward (DNA #2), legibly (DNA #6).** The fit gauge climbing from "fumbling" to "specialising"
  to "native" is the single best decision in the build. It's a progress bar for *evolution*, and it reads.
- **Wonder, not power (DNA #5).** The headline dashboard — the flower's maze and the colony's key drifting into
  the *same pixel pattern* — is genuinely a small chill. At gen 18 they were one cell apart. Nobody painted them.
  That's the soul, and it's on screen. This is the SimEarth "watch the planet regulate itself" feeling, but
  *tighter*, because you can see the exact two patterns converging.
- **Coax, don't command (DNA #1).** You cannot draw a flower. You lock one, or grow a niche, and *selection*
  does the rest. Correct and rare.
- **No cold open.** Warm-start fixed eddy's #1 sin. 

**The Maxis gut-check — is it a toy first?** Yes. You can just watch, and it pays off. That's the bar.

## Where it's thin (the honest part)

**T1 — "I made it to native… now what?" The second act is invisible.** The merge completes in well under a
minute at 1×, then the gauge wobbles in the 80s and the obvious goal is *done*. A Maxis sandbox lives or dies on
the **next** aspiration. The design HAS one — grow a niche → a new lock → a new specialist (DNA #3, the tree is
the unlock tree) — but the game never *points* at it. The `grow niche` tool sits there unexplained. **This is
the highest-value gap:** the prototype proves the merge and then doesn't invite the second loop.

**T2 — The levers don't show their own consequence.** I locked a flower and… the dashboard kept showing some
*other* flower (it picks the "best-matched" one for the headline). So my single most direct action had no direct
readout. In SimCity, when you bulldoze a block you see *that block* change. Here, lock should make the panel
follow the thing I locked, so I watch *its* key get chased. Right now cause and effect are decoupled at the
exact moment the player first exercises agency — the eddy disease, in miniature.

**T3 — The world is beautiful but lonely.** "The first warm week of the year" (spec §4) it is not — it's a
gorgeous *night* garden. The dark loam is on-theme (colour = order against grey entropy) but two-thirds of the
canvas is empty black, and the warmth/saturation the brief keeps asking for ("loam, moss, dew… real colour
blooming back as order takes hold") is muted. A Maxis world *fills*. It doesn't need clutter — it needs a little
ambient life and a warmer wash as fit climbs, so the screen literally blooms as you succeed.

**T4 — The two currencies are one currency wearing a hat.** The spec's depth bet (§3.4) is *balancing* nectar vs
pollen — "you must forage a balanced diet." In play, nectar limits and pollen overflows; I never once made a
decision *because* of pollen. The second meter is honest but inert. (The spec flags this as tunable; it's not a
prototype-blocker, but a Maxis designer notices a stat that never drives a choice.)

**T5 — Inspect wants a fat finger.** On the phone, tapping a 1-pixel bee to read it is fiddly. The "living
machine" card (the mockup's whole promise) is great when you hit it; the hitbox should be forgiving.

**T6 — Micro-legibility.** The header fit-word clips on a narrow phone ("specialis…"). The `grow niche` tool
gives no feedback when a tree lacks sugar beyond a toast. Small stuff.

## What the murmurs/imprint get right

Read the murmurs after playing: Eddington → Schrödinger → Darwin's tangled bank → **Darwin's orchid-and-moth
prediction** (the perfect co-evolution epigraph, earned exactly when you reach "a matched pair") → Margulis on
symbiosis-not-combat → the AI closer. The closer lands — it admits the words were arranged by an AI, "another
small eddy of order… paying for it in spent heat somewhere out of sight," without being a gimmick. That's the
original brief's whole soul, and it's intact. **Keep this. It's the best writing in the project.** Only note:
make sure the milestones that gate them are *reachable by normal play* (they are — fit thresholds + time).

## Ranked fixes (what I'd do before showing anyone)

**P0 — Point at the second act.** When the merge hits native, the toast/hint should say *what's next*: "they're
matched — now **grow a niche** (a new flower, a new lock) and watch a new specialist appear." Light the `grow
niche` tool. Turn the completed merge into the *start* of the next loop. (T1)

**P1 — Make the locked/selected flower the headline.** When a flower is selected or locked, the lock-and-key
panel shows *that* flower vs the colony's key, so the player watches their own intervention play out. (T2)

**P2 — Let the screen bloom.** Warm the ground a touch, add a few drifting pollen/light motes, and tie a gentle
warm wash to the fit (the world brightens as order takes hold — the spec's literal ask). (T3)

**P3 — Forgiving inspect + the micro-legibility nits.** Bigger tap radius; fit-word that doesn't clip; a clearer
niche-tool readout. (T5, T6)

**Deferred (correctly, per spec §8):** the nectar/pollen balance becoming a real decision (T4) rides on the
thread map (different flowers offering different ratios, sap-wells, toxicity). Don't force it into the prototype.

## Verdict

> "eddy was a deep simulation that wasn't a game. This is a game. The merge is the hook, it's legible, it's
> pretty, and you steer it. It needs a second thing to chase the moment after the first chill — point me at the
> niche and I'll keep playing. Fix that and the lever-feedback, warm it up a little, and you've got the rarest
> thing: a Maxis-grade living toy that's *about* something. Ship it and watch people make gardens."

**Prototype success (spec §7) — the soul test, by a stranger's eyes: met.** Watched a random fumbling pair
co-adapt into an exquisitely-matched, beautiful lock-and-key; it was legible, it was gorgeous, and the lever
steered it. The build earns its thread map.
