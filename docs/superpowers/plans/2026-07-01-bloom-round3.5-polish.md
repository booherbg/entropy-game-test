# bloom round 3.5 — the QA critique's ungated fixes Implementation Plan

> **For agentic workers:** executed via superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Act on the round-3 QA critique's convergent, UNGATED findings (`bloom/docs/2026-07-01-round3-qa-critique.md`): make the light filament actually read as LIGHT (both critics' #1 ungated move), and clean up the two mobile legibility regressions the final review + critics flagged (faint scroll-fade, uncoordinated text overlays). **Morphology stays GATED on Blaine** — not in this round.

**Architecture:** All three tasks are render-only or shell/CSS. Nothing touches `genome.js`, `sim.js`, the economy constants, or any sim-layer file. Task A rewrites the `t:'read'` branch inside `render-core.paint()`'s effects loop (a self-contained block; the `readEvent` plumbing from round-3 Task 1 is unchanged). Tasks D/E are `index.html` CSS + one `main.js` shell function.

**Tech Stack:** Vanilla JS (IIFE modules, `B` global, dual browser/Node), HTML5 Canvas, no deps. `bloom/test/harness.js` (custom `ok()` assertions).

## Global Constraints

- `node bloom/test/harness.js` must print `ALL PASS` (85/85 today) after every task; `node bloom/test/soul.js` must print `SOUL TEST PASSED`. All three tasks are render/shell-only, so these are pure regression gates (no behavior/count change expected).
- `genome.js` and all sim-layer files (`sim.js`, `pollinator.js`, `colony.js`, `flower.js`, `plant.js`, `field.js`) are NEVER modified. No `Math.random()` in any `bloom/js/*.js`.
- Screenshot command (needs `dangerouslyDisableSandbox: true` for Chrome; writing to `bloom/shots/` is fine):
  ```bash
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
    --disable-gpu --no-sandbox --window-size=<W>,<H> --virtual-time-budget=4500 \
    --screenshot="$PWD/bloom/shots/<name>.png" "file://$PWD/bloom/index.html?play&warp=<N>&seed=<S>#seed=<S>"
  ```
- Commit after every task.

---

### Task A: Filament reads as light — a traveling white-hot spark, not a static green line

**Files:**
- Modify: `bloom/js/render-core.js` (the `if (ef.t === 'read') { ... }` block, currently lines ~200–210, inside the `opts.effects` loop)

**Interfaces:** None changed. Consumes the same `G.effects` entry shape `{t:'read', x0,y0,x1,y1,hue,eff,age,boost?}` produced by round-3 Task 1. `x0,y0` is the bee's position ~2 ticks before landing (from `pollinator.js`'s `_prevX2/_prevY2` ring buffer), `x1,y1` the flower — so the bee→flower path has real length. No new export, no caller change, no sim touch.

**The problem (from the QA critique, code-confirmed):** the current draw renders `hueRGB(ef.hue, 0.85, 0.65)` — often greenish — as a static 8-step dotted line at ~0.7 alpha, which is visually identical to the forage recruitment-trail wash (`120,200,120` blended at up to 0.5 alpha, `render-core.js:44`). So "a good read becomes light" reads as ordinary green traffic. The fix differentiates on three axes the trail can't match: **whiteness** (a near-white hot core — nothing else on screen is white-hot), **motion** (the spark travels the path over the effect's life; the trail is static), and a **resolving arrival flare** at the flower.

- [ ] **Step 1: Replace the `read` branch**

Current, `render-core.js` (~lines 200–210):

```js
        if (ef.t === 'read') { // a bright filament tracing a good read — the merge, made a moment in the world
          const x0 = Math.round((ef.x0 + 0.5) * S), y0 = Math.round((ef.y0 + 0.5) * S);
          const x1 = Math.round((ef.x1 + 0.5) * S), y1 = Math.round((ef.y1 + 0.5) * S);
          const rc = hueRGB(ef.hue, 0.85, 0.65), boost = ef.boost || 1, steps = 8;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            addPx(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), rc[0], rc[1], rc[2], fade * ef.eff * boost * 0.7);
          }
          glow(x1, y1, Math.max(2, (S * 0.5) | 0), rc[0], rc[1], rc[2], fade * ef.eff * boost * 0.35);
          continue;
        }
```

Change to (a two-phase life: the spark RACES bee→flower over the first 72% of the effect's 46-frame life, then a flare BLOOMS + fades at the flower over the last 28%):

```js
        if (ef.t === 'read') { // the merge, made a moment: a white-hot spark races the read into the world, then flares
          const x0 = Math.round((ef.x0 + 0.5) * S), y0 = Math.round((ef.y0 + 0.5) * S);
          const x1 = Math.round((ef.x1 + 0.5) * S), y1 = Math.round((ef.y1 + 0.5) * S);
          const rc = hueRGB(ef.hue, 0.90, 0.72), boost = ef.boost || 1, eff = ef.eff * boost;
          const TRAVEL = 0.72;                       // fraction of the life spent racing to the flower
          if (k < TRAVEL) {
            const p = k / TRAVEL;                     // 0..1 along the path
            const hx = Math.round(x0 + (x1 - x0) * p), hy = Math.round(y0 + (y1 - y0) * p);
            // a hue-tinted comet tail trailing the head back toward the bee
            const TAIL = 7;
            for (let s = 1; s <= TAIL; s++) {
              const tp = Math.max(0, p - s * 0.05);
              addPx(Math.round(x0 + (x1 - x0) * tp), Math.round(y0 + (y1 - y0) * tp), rc[0], rc[1], rc[2], eff * (1 - s / (TAIL + 1)) * 0.5);
            }
            // the head: a hue bloom under a near-WHITE hot core — this is what reads as light, not a colored line
            glow(hx, hy, Math.max(2, (S * 0.55) | 0), rc[0], rc[1], rc[2], eff * 0.40);
            glow(hx, hy, Math.max(1, (S * 0.32) | 0), 255, 252, 240, eff * 0.60);
            addPx(hx, hy, 255, 253, 245, Math.min(0.95, eff * 1.1));
          } else {
            const q = (k - TRAVEL) / (1 - TRAVEL);    // 0..1 over the arrival
            const fl = (1 - q) * eff;                 // flare blooms bright then fades as the effect retires
            glow(x1, y1, Math.max(3, (S * (0.6 + q * 0.8)) | 0), rc[0], rc[1], rc[2], fl * 0.50);
            glow(x1, y1, Math.max(2, (S * 0.40) | 0), 255, 250, 235, fl * 0.60);
            addPx(x1, y1, 255, 252, 244, Math.min(0.90, fl));
          }
          continue;
        }
```

(Note: this branch no longer uses the loop's `fade` local — it computes its own `p`/`q` envelopes from `k`. `fade` is still used by the birth/death branches below, unchanged.)

- [ ] **Step 2: Regression gate**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -2`
Expected: `ALL PASS — 85/85` (zero FAIL), `SOUL TEST PASSED`. (Render-only; no test count change.)

- [ ] **Step 3: Screenshot-verify at native fit (many good reads → many sparks) and be honest about what a still can/can't prove**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for W in 1600 2500; do
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round35-A-filament-w$W.png" "file://$PWD/bloom/index.html?play&warp=$W&seed=42#seed=42"
done
```
Open both. A still captures whichever read-effects are mid-life on that frame, so at native fit (frequent good reads) you should see one or more **white-cored sparks with a short hue tail** and/or **hue+white flares at flowers** — distinctly brighter and WHITER than the diffuse green forage wash. Confirm the spark reads as *light* (a hot point), not as another green line. **The MOTION (the spark travelling bee→flower) cannot be proven by a single static frame** — say so plainly in your report; note it needs a live-browser check (open `bloom/index.html?play#seed=42`, watch a good read fire). If the sparks are too faint against the wash, raise the two white-core alphas (`eff*0.60` glow, `eff*1.1` addPx) and/or lengthen `TAIL`; if they blow out into white blobs when several fire at once, lower them. Re-run the regression gate if you retune. State what you saw and any tuning you did.

- [ ] **Step 4: Commit**

```bash
git add bloom/js/render-core.js
git commit -m "$(cat <<'EOF'
feat(bloom): the filament reads as light — a white-hot spark that races the read home (round-3.5)

The round-3 filament drew a static hue-tinted dotted line at the same alpha
and often the same green as the forage-trail wash, so "a good read becomes
light" read as ordinary traffic (both QA critics' #1 ungated finding). Now a
near-white hot core races bee->flower over the effect's life, trailing a hue
comet tail, then blooms into a flare at the flower — whiteness + motion +
arrival distinguish it from the diffuse green recruitment trail. Render-only;
genome/sim untouched; harness 85/85 + soul green.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task D: mobile toolbar scroll-fade — make the "more tools" affordance actually visible

**Files:**
- Modify: `bloom/index.html` (the `.toolbar::after` / `.toolbar.scrollable::after` CSS rule, ~line 105, and its `@media (max-width:860px)` context if needed)

**Interfaces:** None. The `.scrollable` class is already correctly toggled by `main.js`'s `updateToolbarScrollHint()` (final review confirmed it fires on overflow) — only the visual affordance is broken.

**The problem (final review, Minor):** the fade gradient ends in `var(--bg)` (`#0d0f13`), essentially the toolbar's own dark background, over a 22px band — so it's dark-on-dark and effectively invisible. Tools run off the mobile edge with no visible "there's more" cue.

- [ ] **Step 1: Make the affordance legible**

Read the current `.toolbar::after` / `.toolbar.scrollable::after` rule. Replace the invisible dark-on-dark fade with a genuinely visible "scroll for more" cue. Primary approach (pick by screenshot): a small right-edge **chevron** ("›" or a triangle) in a light/amber tone that appears only when `.scrollable`, optionally over a subtle darkening gradient — a standard, legible overflow affordance (legibility is king). Keep it `pointer-events:none`. Do NOT change the `.scrollable` toggle logic in `main.js`.

- [ ] **Step 2: Regression gate**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -2`
Expected: `ALL PASS — 85/85`, `SOUL TEST PASSED` (CSS-only; unchanged).

- [ ] **Step 3: Screenshot-verify on mobile (where the toolbar overflows)**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=390,844 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round35-D-toolbar-mobile.png" "file://$PWD/bloom/index.html?play&warp=0&seed=42#seed=42"
```
Confirm the affordance is now clearly visible at the right edge of the toolbar and reads as "scroll for more tools." Also screenshot desktop (1280×860) to confirm it does NOT show when the toolbar fits (no `.scrollable`). State what you saw.

- [ ] **Step 4: Commit**

```bash
git add bloom/index.html
git commit -m "$(cat <<'EOF'
fix(bloom): mobile toolbar scroll affordance is actually visible now (round-3.5)

The overflow fade faded to var(--bg) over the toolbar's own dark background —
dark-on-dark, invisible — so on mobile the shape/grow/read tools ran off the
edge with no cue. Replace it with a legible right-edge chevron shown only when
the toolbar overflows (.scrollable, already toggled correctly in main.js).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task E: one narrator at a time — a murmur beat owns the screen

**Files:**
- Modify: `bloom/js/main.js` (`renderImprint()`, added round-3 Task 2)
- Modify: `bloom/index.html` if a CSS hook is cleaner than inline style (optional)

**Interfaces:** None new. Reads existing `G.imprint` and the `#hint` element.

**The problem (QA critic E + final review Minor):** on the short, letterboxed mobile canvas the drifting murmur (`.imprint`, bottom:56), the milestone toast (`.toast`, top:16), and the persistent tip (`.hint`, bottom:14) can co-occur and crowd into unreadable soup. The murmur is the earned, once-per-milestone poetic beat — it should own the screen for its ~4-second drift; the `.hint` is a low-priority persistent tip and is the one that stacks directly under it.

- [ ] **Step 1: Suppress the low-priority tip while a murmur is showing**

In `main.js`'s `renderImprint()` (which already runs every frame and sets `#imprint` opacity from `G.imprint`), when `G.imprint` is active (non-null / opacity > 0), also drive the `#hint` element to `opacity:0` (and restore it when the imprint clears, so the hint returns for its normal early-game role). Keep it null-safe (`$('hint')` may be absent). This is the minimal "one narrator at a time" — the imprint and the hint no longer stack. Do not remove or reposition the hint; only fade it out during a murmur beat. (Leave the top toast as-is; it doesn't stack with the bottom pair and is itself brief.)

- [ ] **Step 2: Regression gate**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -2`
Expected: `ALL PASS — 85/85`, `SOUL TEST PASSED` (shell-only; `renderImprint` isn't Node-tested — `main.js` needs `document`).

- [ ] **Step 3: Manual/behavioral verification (this is a live, timed interaction — say so plainly)**

A static screenshot can catch at most a frozen instant. Do a headless sanity shot at a small warp likely to have crossed a murmur milestone:
```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=390,844 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round35-E-mobile.png" "file://$PWD/bloom/index.html?play&warp=500&seed=42#seed=42"
```
Confirm no console error and, if a murmur is mid-drift in the frame, that the `.hint` is not also showing under it. Because the timing is live, ALSO verify by reading the code path that when `G.imprint` is set the hint is driven to 0 and restored when it clears. State plainly whether you did a live check or only the headless one.

- [ ] **Step 4: Commit**

```bash
git add bloom/js/main.js bloom/index.html
git commit -m "$(cat <<'EOF'
fix(bloom): a murmur beat owns the screen — hide the tip line while it drifts (round-3.5)

On the short mobile canvas the drifting murmur (.imprint) and the persistent
.hint tip stacked into unreadable soup (QA critic finding E). While a murmur
is showing, fade the low-priority hint out and restore it after — one narrator
at a time. Shell-only; no sim touch.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Notes for the executor

- Task A is the load-bearing creative change and the only one with real design content; D and E are small, bounded polish. All three are render/shell/CSS — zero sim/genome/economy risk, soul stays green by construction.
- Order: A → D → E (A is the headline; D and E are quick mobile cleanups). Each is an independent commit.
- Honest verification: Tasks A and E involve live animation/timing a single still can't fully prove — report the live-vs-headless status plainly, matching the project's precedent (round-3 items 1 and 2 carried the same caveat).
- NOT in this round: morphology (gated on Blaine), the pre-existing harness `ok()` exception-safety nit, the T4 flower-body second-loop perf, the T6 amber-pip-on-amber cosmetic — all logged for later.
