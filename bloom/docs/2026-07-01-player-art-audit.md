# bloom — player-feel + art-director audit (2026-07-01)

*Third critic of the loop (player-UX + aesthetics lens; the game-design and evolutionary-biology audits came
first). Rendered the live game at fit 0.16 / 0.96 / 0.83 to ground it. Full verdict was strong — headline:
"a genuinely beautiful, unusual thing; the forage-beams are one of the loveliest emergent visuals in a
vanilla-canvas toy; everything below is about getting the PLAYER to feel what the code already earns."*

## What genuinely delights (keep + amplify)
1. **The forage beams — stigmergy rendered as light.** The colony throws a living green V of light up into the
   flower field, thick where traffic is heavy. Emergent, readable, gorgeous — the honest visual thesis. THE
   standout; reuse this aesthetic everywhere.
2. **The seasonal turn** (cold blue-grey → warm gold) genuinely feels like the room warming — *if* you watch it climb.
3. **The two grids becoming one** + the forms filmstrip — the "it did that on its own?" beat, for players who look.

## The real problems (player-feel, mostly separable from the morphology redesign)
- **The opening frame is the game at its least inviting** — at fit≈0.16 the whole frame is ~56% desaturated
  (`render-core.js` desat `(1-season)*0.6`), so a first-timer's FIRST sight is near-monochrome + sparse. The
  gold payoff is gated behind a climb they haven't watched.
- **Flowers read as asterisks / plus-signs**, not flowers (FR=2.7, pointed petalSharp, symmetry-4 = a literal
  cross). They glow but read as *sparkles*. There's a cheap render-only fix (a soft filled petal-body / core halo).
- **The poetry is buried** — murmur-only milestones fire a toast that says *"open ✦ murmurs to read it"*. The
  best content in the game (Boltzmann/Darwin/Schrödinger, the AI-as-eddy closer) is delivered as HOMEWORK.
- **The merge lives in the sidebar, not the world** — the emotional core (two grids snapping into one shape) is
  abstract, in the corner, below the fold on mobile.
- **Dashboards are decorative, not legible** — 40px sparklines, no axes/labels/current-value dot.
- **8 undifferentiated tools**, no grouping; mobile hides sun/cull/hedge behind an unscrolled overflow; dual-mode
  toggles (tap ☀ again→shade, 🧱 again→clear) are undiscoverable.
- **Pacing** — native arrives in ~40s at 1× (no time-delta clamp; 2× as fast at 120Hz). Post-native "now what?" gap.

## THE #1 highest-leverage change (render-only, soul-safe, do this first)
**Make the merge a moment IN THE WORLD:** when a forager reads a flower well (high `lastEff` / a seed-set), emit
a `{t:'read', x0,y0,x1,y1,hue,strength}` event through the EXISTING effects pipeline (`sim.events` → `G.effects`
→ `opts.effects` in `paint()` — already used for birth/death). In `paint()`, draw a brief bright filament between
bee↔flower (or flower→colony) via `addPx` along a lerp, tinted `hueRGB(hue)`, brightness ∝ eff, fading ~30
frames + a soft pollination flare (reuse `glow`). Result: the garden literally **lights up as it matches** —
the abstract sidebar grid becomes light you watch wire itself together, in the same beloved aesthetic as the
forage beams. ~15 lines, zero sim/soul risk, headless-visible like the birth/death effects.

## Ranked next actions (round-3 candidates — all DNA-aligned)
1. **Surface the poetry inline** — replace the "open the panel" toast with the ACTUAL murmur line drifting in as
   a slow full-width low-contrast imprint over the garden, at the instant it's earned; pulse the §1 filament
   brighter for a beat. Turns the soul from homework into a chill. (Biggest content miss → biggest easy win.)
2. **Soften the opening** — cap desaturation ~0.35–0.40, warm the `gLo` floor, thicken opening motes ~12→18.
   Keep the grey→gold arc, just don't make the FIRST impression half-monochrome.
3. **Give flowers a body** (render-only) — a soft filled petal-fill / rounded core halo so a symmetry-4 bloom
   reads as a flower, not a plus-sign. The cheap, non-morphology half of the asterisk problem.
4. **Legible dashboards** — value labels + end-point dots on the sparklines; promote the lock-and-key headline;
   a compact merge-grid strip pinned ABOVE the canvas on mobile so the payoff isn't below the fold.
5. **Group the toolbar** (read / grow / shape) + a scroll affordance on mobile + a mode pip for the dual toggles.

*Note: #1 (the world-merge filament) + #1-ranked (inline poetry) + #2/#3 (opening warmth + flower bodies) are
all cheap render/shell changes with no soul risk — a high-delight round-3 that's independent of the morphology
redesign. The morphology/dramatic-diversity work (see `2026-07-01-morphology-brief.md`) remains the biggest
structural lever and Blaine's co-design call.*
