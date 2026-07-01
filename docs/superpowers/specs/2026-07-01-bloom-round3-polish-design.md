# bloom — round 3: player-feel + art polish
### design spec

*Status: approved direction, ready to plan. Date: 2026-07-01.*
*Scope: the full ranked list from `bloom/docs/2026-07-01-player-art-audit.md` (items 1–6), built in the
audit's own priority order. Explicitly NOT in scope: the morphology/dramatic-diversity redesign
(`bloom/docs/2026-07-01-morphology-brief.md`) — that's a separate, gated co-design track, Blaine's call, not
touched here.*

---

## 0. Why (context for a cold read)

Round 2 (living population & stewardship) shipped and is deployed; harness 75/75 green, soul test passing
(fumbling ~0.12 → native ~0.94 across 5 seeds). Three audits have now run against the game. The newest —
player + art director — verdict: the core is genuinely good ("the forage-beams are one of the loveliest
emergent visuals in a vanilla-canvas toy") but the *player* doesn't yet feel what the code earns. Its
ranked fix list is render/shell-only, soul-safe, and independent of the morphology redesign. This spec
turns that ranked list into a buildable design.

**The non-negotiables (carried from the project's own DNA, `bloom/docs/2026-07-01-handoff.md` §7, §10):**
- The soul test (`node bloom/test/soul.js`) and the harness (`node bloom/test/harness.js`, 75/75) must stay
  green after **every** item. This is the gate, not a suggestion.
- `genome.js` (`regionIndex`, `decodeGrid`, `match`) is the keystone shared between the world-render and the
  decode-grid match math. **Nothing in this round touches it.** Every change here is additive/render-only or
  a numeric tuning constant elsewhere.
- Determinism everywhere — no `Math.random()` in sim code. (Most of this round is render-only and doesn't
  touch sim state at all; the one item that does — #1's event trigger — reads existing deterministic sim
  values, it doesn't add randomness.)

## 1. Shared mechanism: extend the existing effects pipeline

Items #1 and #2 both ride the pipeline already used for birth/death visibility
(`sim.js` pushes to `this.events` → `main.js` copies into `G.effects` with `age:0`, ages/expires at 46
frames, splices to a cap of 80 → `render-core.js paint(sim, S, {effects})` consumes them). No new plumbing:
two new event kinds, `read` and `imprint`, follow the same lifecycle as the existing `birth`/`death` kinds.

## 2. Item #1 — light filaments (the merge, made a moment in the world)

**Trigger.** `pollinator.js _land(f)` already computes `r = f.visit(key)` and sets `this.lastEff =
r.pollination`. When `r.pollination > 0.55` (reusing the exact threshold `main.js`'s milestone table already
calls "specialising" — a read becomes filament-worthy once the pair is past pure fumbling), the bee stashes
a transient descriptor:
```js
this.readEvent = { x0: this.x, y0: this.y, x1: f.x, y1: f.y, hue: f.beaconHue, eff: r.pollination };
```
This is transient render-metadata, not serialized — same convention as the existing `watched` flag.

**Emission.** `sim.js`'s per-bee loop (where `bees[bi].tick(...)` is currently called, ~line 140) checks
`b.readEvent` immediately after the tick call, pushes `{t:'read', x0,y0,x1,y1,hue,eff}` onto `this.events`,
then clears the flag. Event ownership stays in `sim.js`, matching how birth/death are pushed today (neither
`plant.js` nor `pollinator.js` touch `events` directly).

**Render.** In `render-core.js`'s `opts.effects` loop (~line 188), handle `ef.t === 'read'`: `addPx` a lerp
from `(x0,y0)` to `(x1,y1)` at world scale `S`, tinted `hueRGB(ef.hue, ...)`, brightness ∝ `ef.eff`, fading
over the same `k = age/46` curve as birth/death, plus a brief `glow` flare at the flower end (reuse the
existing `glow` helper — same aesthetic as the forage-beams and the pollination sparkle already in that
file).

**Known tuning risk (resolve empirically, not in this doc):** at the landing instant the bee is within 1.5
cells of the flower (the land threshold in `pollinator.js tick()`), so the raw lerp is short — a spark, not
the "light you watch wire itself together" the audit describes. Before calling this item done: screenshot it
at a mid-fit seed and eyeball it. If it reads as too short, source `x0,y0` from the bee's position 2–3 ticks
before landing (its approach vector) instead of the landing instant, to lengthen the visible streak. Either
way it stays render-only.

**Volume note:** at native fit, most reads exceed 0.55, so many simultaneous filaments are possible. The
existing 80-effect cap (`main.js`) already bounds this gracefully (oldest drop first); confirm by screenshot
that it reads as "the garden lighting up" and not noise — if it's noisy, narrow the trigger (e.g. only the
single best read per tick per colony) rather than lowering the threshold.

## 3. Item #2 — surface the poetry inline (panel stays, per Blaine)

**Current path.** `main.js` ~line 137: when a milestone with a `murmur` key fires,
`toast('<b>✦ a murmur surfaced</b> — open ✦ murmurs to read it.')` — the actual text
(`B.Content.murmurs`) is never shown until the player opens the panel.

**New path.** Replace that one call site: look up the murmur's real `text`/`who` from `B.Content.murmurs` by
key, and drive a slow-fading, low-contrast, full-width HTML overlay (not canvas pixels — pixel-art-scale
canvas text would be illegible; this is a CSS overlay div, the same category of UI as `.toast` but
full-width and longer-lived) that drifts the line across the garden at the instant it's earned. **Best-effort
tie-in to the Item #1 light filament** (not guaranteed, and that's fine): if a `read` effect is already active in `G.effects` (age <
~10 frames) at the moment the imprint fires, boost its brightness for a few frames. Early murmurs (`begin`,
`firstMatch`) can fire before the pair ever clears the 0.55 filament threshold, so there may be nothing to
pulse yet — in that case the text drift-in alone carries the moment. Don't manufacture a filament just to
have something to pulse.

**What does NOT change:** the ✦ murmurs button and panel (`renderMurmurs()`) stay exactly as they are —
still the full browsable archive, so anything unlocked can be reread anytime (Blaine's call: keep panel,
drop toast). `m.codex` toasts (unrelated in-world discoveries) and all tool-feedback toasts (plant/lock/cull/
etc.) are a separate code path and are untouched — only the `else if (m.murmur)` branch changes.

## 4. Item #3 — soften the opening

Purely numeric, `render-core.js`:
- Desaturation cap: `const desat = (1 - season) * 0.6` → `* 0.375` (mid of the audit's 0.35–0.40 range).
- Warm the `gLo` (deep-ground floor) RGB slightly at `season=0` so the coldest frame isn't near-monochrome.
- Thicken opening motes: `render-core.js` line 176, `const MOTES = 10 + Math.round(season * 28)` → base `10`
  → `16` (at the audit's reference fit≈0.16, season≈0.07, so `MOTES` goes ~12→~18, matching the audit's
  suggested range exactly).

Verify by screenshot at fit≈0.16 (the audit's own reference point, matching `bloom/shots/open.png`),
before/after, and confirm the grey-dawn→gold-noon arc (§6 of the handoff) still reads as a climb, not just a
flatter start.

## 5. Item #4 — give flowers a body

**Root cause (confirmed in code):** `render-core.js`'s flower loop (~line 122) draws hard-edged pixels
straight from `B.Genome.regionIndex(fl.genome, dn, angle)` — core/petal/true-empty, no fill between thin
pointed lobes. That function lives in `genome.js`, the keystone shared with the decode-grid match math —
**not touched** (see §0).

**Fix (additive, render-only):** before the existing hard-pixel genome loop, draw a soft, low-alpha filled
disc/halo under the bloom — sized to roughly the petal reach, tinted toward the average petal colour or the
beacon hue — so the negative space between petal tips fills with a soft glow instead of bare loam. The sharp
genome pixels still draw on top afterward, unchanged: the shape is still honestly the genome, it just has a
body to sit in.

## 6. Item #5 — legible dashboards

Three independent, additive changes:
- `render-dash.js spark()`: add a current-value dot (small filled circle at the last point) and a text label
  to each sparkline panel — mechanical addition to the existing `panel()` wrapper, no data-model change.
- Promote the existing `#hgcap` lock-and-key headline (`index.html` ~line 141:
  `<div class="gcap" id="hgcap">lock-and-key fit · <b>—</b></div>`) — larger size/higher contrast, since the
  audit flags the dashboards as decorative rather than legible.
- Mobile (`@media (max-width:860px)`, where `.side` currently stacks *below* the world per the existing rule
  at `index.html` line ~123): pin a compact lock-and-key grid strip above the canvas so the payoff isn't
  below the fold.

## 7. Item #6 — group the toolbar

`index.html`'s `.toolbar` currently renders 8 flat `.tool` buttons (inspect, lock, plant, colony, niche,
light, cull, hedge). Changes:
- Cluster into **read** (inspect, lock) / **grow** (plant, colony, grow-niche) / **shape** (sun, cull, hedge)
  — the audit's own grouping — with a visual gap between clusters in the toolbar's flex row. No functional
  change to any tool's behavior.
- A scroll affordance (fade edge or arrow) for the mobile overflow case the audit flagged (sun/cull/hedge
  currently hide behind unscrolled overflow on small screens).
- A small mode-pip (dot/badge) on the sun and hedge buttons reflecting `G.lightMode` / `G.hedgeMode` — today
  the dual-toggle state (tap ☀ again → shade, tap 🧱 again → clear) is invisible until you tap and read the
  hint text.

## 8. Build order + verification gate

Build in the order above (1→6 — the audit's own ranking). After **every** item:
1. `node bloom/test/harness.js` — must stay 75/75.
2. `node bloom/test/soul.js` — must stay PASS (all seeds reach native, the lock lever still converges).
3. A headless screenshot (the documented Chrome command, `bloom/docs/2026-07-01-handoff.md` §3) at at least
   one low-fit and one high-fit seed, eyeballed before moving to the next item.

Each item is independent and revertible. If one doesn't land well visually (Item #1's known tuning risk,
above, is the most likely candidate), back it out without blocking the rest of the list — this is a ranked
list of six separable changes, not one atomic feature.

## 9. Explicitly out of scope

- The morphology/dramatic-diversity redesign (structure/drift/control) — `bloom/docs/2026-07-01-morphology-
  brief.md`. Gated on a separate co-design conversation with Blaine.
- Anything touching `genome.js` shape math, the economy constants (§6 of the handoff), or the
  reward/cost/spawn tuning — none of round 3 needs to, and the handoff's own gotchas (§10) warn any such
  change requires re-running `diag.js` across seeds, which is unnecessary risk for a purely cosmetic round.
