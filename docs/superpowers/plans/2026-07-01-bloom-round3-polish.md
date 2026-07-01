# bloom round 3 — player/art polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the player+art director audit's 6 ranked polish items (light filaments, poetry inline, softened opening, flower bodies, legible dashboards, grouped toolbar), then run a fresh-eyes QA critique pass and fold the results into the handoff doc.

**Architecture:** Every item is additive/render-only or shell-only — nothing touches `genome.js` or the economy constants. Item #1 extends the existing `sim.events → G.effects → paint(opts.effects)` pipeline with a new `read` event kind. Item #2 is independent shell-only state (`G.imprint`) with a best-effort read of `G.effects` for its filament tie-in — it does **not** touch `sim.js`. Items #3–#6 are numeric constant tweaks, additive canvas draws, and HTML/CSS changes.

**Tech Stack:** Vanilla JS (IIFE modules, `B` global, dual browser/Node via `module.exports`), HTML5 Canvas, no dependencies. Tests are a custom Node assertion script (`bloom/test/harness.js`, `ok(cond, msg)` style) — not a unit-test framework.

## Global Constraints

- `node bloom/test/harness.js` must print `ALL PASS` (75/75 today; grows as this plan adds tests) after every task.
- `node bloom/test/soul.js` must print `SOUL TEST PASSED` after every task.
- `genome.js` (`regionIndex`, `decodeGrid`, `match`) is never modified.
- No `Math.random()` in any `bloom/js/*.js` file — all randomness from `B.makeRng`.
- Every task that touches `bloom/js/*.js` sim-layer files (`pollinator.js`, `sim.js`, `colony.js`, `flower.js`, `plant.js`, `field.js`, `genome.js`) gets a real `harness.js` assertion (TDD: failing test first). Tasks that only touch `render-core.js` pixel constants, `index.html`, or `main.js` DOM code have **no** meaningful Node-level test (`main.js`/`render-world.js` require `document` and can't load under Node; `render-core.js`'s relevant constants are un-exported closure locals) — those are verified by the project's own established practice instead: `node bloom/test/harness.js` + `node bloom/test/soul.js` as a regression gate, plus a headless-Chrome screenshot (documented command below). This mirrors how the project's own past visual/CSS changes (e.g. the "mobile QA" and "seasonal arc" commits) were verified — screenshot, not invented pixel-assertions.
- Screenshot command (from `bloom/docs/2026-07-01-handoff.md` §3), reused throughout this plan with different `warp`/`seed` params:
  ```bash
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
    --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
    --screenshot="$PWD/bloom/shots/<name>.png" "file://$PWD/bloom/index.html?play&warp=<N>&seed=<S>#seed=<S>"
  ```
  Needs `dangerouslyDisableSandbox` (writes outside the repo-relative shots dir is fine, but Chrome itself needs it).
- Commit after every task, in the audit's own ranked order (1→6), then QA, then the handoff update.

---

### Task 1: Light filaments — a good read becomes light in the world

**Files:**
- Modify: `bloom/js/pollinator.js:87-110` (`_land`)
- Modify: `bloom/js/sim.js:127-131` (add a drain loop after the colonies-tick loop)
- Modify: `bloom/js/main.js:80` (the events→effects copy loop)
- Modify: `bloom/js/render-core.js:186-202` (the `opts.effects` loop)
- Modify: `bloom/test/harness.js` (two new assertions)

**Interfaces:**
- Produces: `bee.readEvent = { x0, y0, x1, y1, hue, eff } | null` (transient, set in `pollinator.js`, drained+cleared in `sim.js`, never serialized).
- Produces: `sim.events` may now contain `{ t: 'read', x0, y0, x1, y1, hue, eff }` entries (alongside existing `birth`/`death`).
- Produces: `G.effects` entries of `t:'read'` carry `x0,y0,x1,y1,hue,eff` (and optional `boost`, consumed by Task 2) instead of the `x,y` birth/death entries use.
- Consumes (Task 2 depends on this): `render-core.js`'s `read` handling multiplies brightness by `(ef.boost || 1)`.

- [ ] **Step 1: Write the failing pollinator-level test**

In `bloom/test/harness.js`, insert immediately after `testPollinatorDeterminism`'s closing `})();` (currently the last statement before the `// ---- Task 8(plan): the sim ----` comment):

```js
(function testGoodReadStashesFilamentEvent() {
  const s = riggedScene(76);
  for (let t = 0; t < 400 && !s.bee.readEvent; t++) s.bee.tick(s.f, [s.fl], s.colony, B.makeRng(7));
  ok(!!s.bee.readEvent, 'a well-matched bee stashes a readEvent after landing on a good read');
  ok(s.bee.readEvent.eff > 0.55, 'the stashed eff clears the filament-worthy threshold');
  ok(s.bee.readEvent.x1 === s.fl.x && s.bee.readEvent.y1 === s.fl.y, 'the event points at the flower it read');
})();
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `node bloom/test/harness.js 2>&1 | grep -A2 "readEvent"`
Expected: `FAIL — a well-matched bee stashes a readEvent after landing on a good read` (plus two more FAILs, since `s.bee.readEvent` is `undefined`).

- [ ] **Step 3: Implement the trigger in `pollinator.js`**

Add a named constant near the top of the file (after the `'use strict'; const B = ...` line, matching `colony.js`'s convention of named tunables):

```js
  const FILAMENT_EFF = 0.55;   // a read this good becomes a visible light-filament (round-3 audit item #1)
```

In `_land(f)`, the current body is:

```js
      _land: function (f) {
        const r = f.visit(this.key);
        this.nectar += r.nectar; this.pollen += r.pollen;
```

Change to:

```js
      _land: function (f) {
        const r = f.visit(this.key);
        this.nectar += r.nectar; this.pollen += r.pollen;
        this.readEvent = (r.pollination > FILAMENT_EFF)
          ? { x0: this.x, y0: this.y, x1: f.x, y1: f.y, hue: f.beaconHue, eff: r.pollination }
          : this.readEvent;
```

(Leave a stale `readEvent` in place rather than clearing it on a bad read — it gets drained same-tick by `sim.js` regardless of quality, so this branch only matters within the ~1-tick window before drainage; keeping the `: this.readEvent` fallback is simplest and avoids a second field to reason about.)

- [ ] **Step 4: Run it, confirm the pollinator-level test passes**

Run: `node bloom/test/harness.js 2>&1 | grep -A2 "readEvent"`
Expected: 3 PASS lines for the new assertions. (Other sections still fine — full run comes at the end of this task.)

- [ ] **Step 5: Write the failing sim-level drain test**

In `bloom/test/harness.js`, insert immediately after `testSerializeRoundTrip`'s closing `})();` and before the `// ---- Task 13(plan): the levers ----` comment:

```js
(function testReadEventDrainedIntoSimEvents() {
  const sim = B.makeSim(77); sim.warmStart();
  const bee = sim.colonies[0].bees[0];
  bee.readEvent = { x0: 1, y0: 2, x1: 3, y1: 4, hue: 0.5, eff: 0.9 };
  sim.tick();
  const ev = sim.events.find(e => e.t === 'read');
  ok(!!ev, 'a bee with a pending readEvent produces a read entry in sim.events after tick()');
  ok(!!ev && ev.x0 === 1 && ev.y0 === 2 && ev.x1 === 3 && ev.y1 === 4 && ev.hue === 0.5 && ev.eff === 0.9,
    'the read event carries the stashed coordinates + hue + eff through unchanged');
  ok(bee.readEvent === null, 'readEvent is cleared after being drained (transient, not double-fired)');
})();
```

- [ ] **Step 6: Run it, confirm it fails**

Run: `node bloom/test/harness.js 2>&1 | grep -A3 "drained"`
Expected: FAIL — `sim.events` has no `read` entry yet (sim.js doesn't drain `readEvent` yet).

- [ ] **Step 7: Implement the drain loop in `sim.js`**

Current code at the end of `tick()`, lines 127-131:

```js
        // ── colonies: forage across all flowers; evolve keys ──
        for (let c = 0; c < this.colonies.length; c++) this.colonies[c].tick(this.field, flowers2, rng);

        this.tickCount++;
      },
```

Change to:

```js
        // ── colonies: forage across all flowers; evolve keys ──
        for (let c = 0; c < this.colonies.length; c++) this.colonies[c].tick(this.field, flowers2, rng);

        // ── drain any read-worthy visit each bee stashed this tick into the shared events stream. Bees are
        //    ticked inside colony.tick() (colony.js), not here, so this is a light second pass rather than a
        //    parameter threaded through colony.js/pollinator.js's signatures. ──
        for (let c = 0; c < this.colonies.length; c++) {
          const bees = this.colonies[c].bees;
          for (let bi = 0; bi < bees.length; bi++) {
            const b = bees[bi];
            if (b.readEvent) {
              this.events.push({ t: 'read', x0: b.readEvent.x0, y0: b.readEvent.y0,
                x1: b.readEvent.x1, y1: b.readEvent.y1, hue: b.readEvent.hue, eff: b.readEvent.eff });
              b.readEvent = null;
            }
          }
        }

        this.tickCount++;
      },
```

- [ ] **Step 8: Run it, confirm both new tests pass**

Run: `node bloom/test/harness.js 2>&1 | tail -5`
Expected: `ALL PASS — 81/81` (75 existing + 3 from Step 1 + 3 from this test = 81, zero FAIL lines).

- [ ] **Step 9: Wire the copy loop in `main.js`**

Current code at `main.js:80` (inside `loop()`):

```js
        for (let e = 0; e < G.sim.events.length; e++) { const ev = G.sim.events[e]; G.effects.push({ x: ev.x, y: ev.y, t: ev.t, age: 0 }); }
```

Change to:

```js
        for (let e = 0; e < G.sim.events.length; e++) {
          const ev = G.sim.events[e];
          if (ev.t === 'read') G.effects.push({ t: 'read', x0: ev.x0, y0: ev.y0, x1: ev.x1, y1: ev.y1, hue: ev.hue, eff: ev.eff, age: 0 });
          else G.effects.push({ x: ev.x, y: ev.y, t: ev.t, age: 0 });
        }
```

(No Node test for this — `main.js` requires `document`. Covered by this task's final screenshot step.)

- [ ] **Step 10: Implement the render in `render-core.js`**

Current code at lines 186-202:

```js
    // ── birth & death made visible: a seedling sprouts up in green light; a culled plant wilts down in brown.
    //    (render-only ephemera passed from the shell — you watch the garden turn over.) ──
    if (opts.effects) {
      for (let e = 0; e < opts.effects.length; e++) {
        const ef = opts.effects[e], k = ef.age / 46, fade = (1 - k) * (1 - k);
        const cx = Math.round((ef.x + 0.5) * S), cy = Math.round((ef.y + 0.5) * S);
        if (ef.t === 'birth') { // a rising green shimmer + a small expanding ring
          const ry = cy - Math.round(k * S * 2.2);
          glow(cx, ry, Math.max(2, (S * (0.4 + k * 0.7)) | 0), 150, 240, 150, fade * 0.5);
          for (let a = 0; a < 10; a++) { const th = a / 10 * B.TAU, rr = k * S * 2.2; addPx(cx + Math.round(Math.cos(th) * rr), cy + Math.round(Math.sin(th) * rr), 180, 255, 170, fade * 0.6); }
        } else { // a wilting brown fade sinking into the loam
          const sy2 = cy + Math.round(k * S * 1.6);
          glow(cx, sy2, Math.max(2, (S * 0.6 * (1 - k * 0.5)) | 0), 150, 100, 60, fade * 0.5);
          addPx(cx, sy2, 170, 120, 70, fade * 0.8);
        }
      }
    }
```

Change to:

```js
    // ── birth & death made visible: a seedling sprouts up in green light; a culled plant wilts down in brown.
    //    (render-only ephemera passed from the shell — you watch the garden turn over.) ──
    if (opts.effects) {
      for (let e = 0; e < opts.effects.length; e++) {
        const ef = opts.effects[e], k = ef.age / 46, fade = (1 - k) * (1 - k);
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
        const cx = Math.round((ef.x + 0.5) * S), cy = Math.round((ef.y + 0.5) * S);
        if (ef.t === 'birth') { // a rising green shimmer + a small expanding ring
          const ry = cy - Math.round(k * S * 2.2);
          glow(cx, ry, Math.max(2, (S * (0.4 + k * 0.7)) | 0), 150, 240, 150, fade * 0.5);
          for (let a = 0; a < 10; a++) { const th = a / 10 * B.TAU, rr = k * S * 2.2; addPx(cx + Math.round(Math.cos(th) * rr), cy + Math.round(Math.sin(th) * rr), 180, 255, 170, fade * 0.6); }
        } else { // a wilting brown fade sinking into the loam
          const sy2 = cy + Math.round(k * S * 1.6);
          glow(cx, sy2, Math.max(2, (S * 0.6 * (1 - k * 0.5)) | 0), 150, 100, 60, fade * 0.5);
          addPx(cx, sy2, 170, 120, 70, fade * 0.8);
        }
      }
    }
```

- [ ] **Step 11: Full regression + soul test**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -5`
Expected: `ALL PASS — 81/81` (zero FAIL) and `SOUL TEST PASSED — the merge is real, measured, and steerable.`

- [ ] **Step 12: Screenshot-verify, check the known tuning risk**

Run:
```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-item1-filaments.png" "file://$PWD/bloom/index.html?play&warp=2500&seed=42#seed=42"
```
(needs `dangerouslyDisableSandbox`). Open the PNG. Per the spec's known tuning risk: if the filaments read as short sparks rather than visible light-threads, change Step 10's `x0,y0` source — in `pollinator.js`, track the bee's position ~2-3 ticks before landing (e.g. stash `this._prevX2`/`this._prevY2` each tick in the `'out'` branch, shifting a small ring buffer) and use that instead of `this.x,this.y` at the landing instant in Step 3's `readEvent`. Re-screenshot and re-run harness+soul if you make this change. If it already reads well, leave it — don't tune what isn't broken.

- [ ] **Step 13: Commit**

```bash
git add bloom/js/pollinator.js bloom/js/sim.js bloom/js/main.js bloom/js/render-core.js bloom/test/harness.js
git commit -m "$(cat <<'EOF'
feat(bloom): light filaments — a good read becomes light in the world (round-3 #1)

A visit with eff > 0.55 (FILAMENT_EFF) stashes a transient readEvent on the
bee; sim.js drains it into sim.events same-tick (bees are ticked inside
colony.tick(), so this is a small second pass, not a threaded parameter);
main.js copies it into G.effects; render-core.js draws a brief hue-tinted
filament + flare between bee and flower, fading over the same window as
birth/death. Two new harness assertions (trigger + drain). Player+art audit
item #1 — the merge, made a moment in the world.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Surface the poetry inline (murmurs panel stays)

**Files:**
- Modify: `bloom/js/main.js` (G state, `newGarden`, `checkMilestones`, `loop`, new `showImprint`/`renderImprint`)
- Modify: `bloom/index.html` (new `#imprint` div + CSS)

**Interfaces:**
- Produces: `G.imprint = { text, who, age } | null`.
- Consumes: `B.Content.murmurs` (array of `{key,text,who,year,ai}`, from `content.js`, already loaded).
- Consumes: `G.effects` entries with `t:'read'` (Task 1) — sets `.boost = 1.6` on fresh ones as a best-effort tie-in; no-op if none exist.

- [ ] **Step 1: Add `G.imprint` state**

Current, `main.js:8-12`:

```js
  const G = {
    sim: null, seed: 1, paused: false, speedIdx: 0, tool: 'inspect',
    selected: null, history: [], miles: new Set(), tick0: 0, dashClock: 0, saveClock: 0,
    lastFit: 0, seasonFit: 0, forms: [], lastFormGen: -1, lightMode: 'sun', hedgeMode: 'build', painting: false, effects: [],
  };
```

Change to:

```js
  const G = {
    sim: null, seed: 1, paused: false, speedIdx: 0, tool: 'inspect',
    selected: null, history: [], miles: new Set(), tick0: 0, dashClock: 0, saveClock: 0,
    lastFit: 0, seasonFit: 0, forms: [], lastFormGen: -1, lightMode: 'sun', hedgeMode: 'build', painting: false, effects: [],
    imprint: null,
  };
```

- [ ] **Step 2: Reset it in `newGarden`**

Current, `main.js:68`:

```js
    G.seed = seed; G.history = []; G.miles = new Set(['begin']); G.selected = null; G.tick0 = 0; G.forms = []; G.lastFormGen = -1; G.effects = []; G.seasonFit = 0;
```

Change to:

```js
    G.seed = seed; G.history = []; G.miles = new Set(['begin']); G.selected = null; G.tick0 = 0; G.forms = []; G.lastFormGen = -1; G.effects = []; G.seasonFit = 0; G.imprint = null;
```

- [ ] **Step 3: Replace the murmur toast with `showImprint`**

Current, `main.js:130-147` (`checkMilestones`), the relevant line is 137:

```js
        if (m.codex && B.Content.codex[m.codex]) { const c = B.Content.codex[m.codex]; toast('<b>✦ ' + c.title + '</b> — ' + c.body); }
        else if (m.murmur) toast('<b>✦ a murmur surfaced</b> — open ✦ murmurs to read it.');
```

Change to:

```js
        if (m.codex && B.Content.codex[m.codex]) { const c = B.Content.codex[m.codex]; toast('<b>✦ ' + c.title + '</b> — ' + c.body); }
        else if (m.murmur) showImprint(m.murmur);
```

Add the new function right after `checkMilestones` (before `let toastT = null;`):

```js
  // round-3: the murmur drifts into the world live, instead of a toast telling you to go read it later.
  function showImprint(key) {
    const m = B.Content.murmurs.find(function (x) { return x.key === key; });
    if (!m) return;
    G.imprint = { text: m.text, who: m.who, age: 0 };
    // best-effort tie-in to a light filament already in flight (Task 1) — not guaranteed, and that's fine.
    for (let e = 0; e < G.effects.length; e++) { const ef = G.effects[e]; if (ef.t === 'read' && ef.age < 10) ef.boost = 1.6; }
  }
```

- [ ] **Step 4: Age + render it in the main loop**

Current, `main.js:85-88`:

```js
    // age + retire the sprout/wilt effects (every frame, even paused, so they fade rather than freeze)
    for (let e = 0; e < G.effects.length; e++) G.effects[e].age++;
    if (G.effects.length) G.effects = G.effects.filter(ef => ef.age < 46);
    G.lastFit = G.sim.meanFit();
```

Change to:

```js
    // age + retire the sprout/wilt effects (every frame, even paused, so they fade rather than freeze)
    for (let e = 0; e < G.effects.length; e++) G.effects[e].age++;
    if (G.effects.length) G.effects = G.effects.filter(ef => ef.age < 46);
    // age + retire the imprint overlay the same way (long-lived — long enough to read a full line)
    if (G.imprint) { G.imprint.age++; if (G.imprint.age > 260) G.imprint = null; }
    renderImprint();
    G.lastFit = G.sim.meanFit();
```

Add the new function near `updateGauge` (after it, before `renderDash`):

```js
  function renderImprint() {
    const el = $('imprint');
    if (!el) return;
    if (!G.imprint) { el.style.opacity = '0'; return; }
    const k = G.imprint.age / 260;
    const fade = k < 0.08 ? k / 0.08 : k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
    el.innerHTML = G.imprint.text + (G.imprint.who ? ' <span class="iw">— ' + G.imprint.who + '</span>' : '');
    el.style.opacity = (fade * 0.82).toFixed(2);
  }
```

- [ ] **Step 5: Add the overlay div in `index.html`**

Current, inside `.worldwrap` (~line 154-157):

```html
      <div class="worldwrap">
        <canvas id="world"></canvas>
        <div class="toast" id="toast"></div>
        <div class="hint" id="hint">the bees and the flowers don&rsquo;t fit yet. let it run — and watch the two patterns drift into a matched pair.</div>
      </div>
```

Change to:

```html
      <div class="worldwrap">
        <canvas id="world"></canvas>
        <div class="toast" id="toast"></div>
        <div class="imprint" id="imprint"></div>
        <div class="hint" id="hint">the bees and the flowers don&rsquo;t fit yet. let it run — and watch the two patterns drift into a matched pair.</div>
      </div>
```

- [ ] **Step 6: Add CSS**

In the `<style>` block, right after the existing `.toast b{color:var(--amberlit)}` rule (~line 50):

```css
  .imprint{position:absolute;left:0;right:0;bottom:56px;padding:0 26px;text-align:center;font-size:14.5px;
    font-style:italic;line-height:1.5;color:#cfc9bd;opacity:0;pointer-events:none;transition:opacity .6s;
    text-shadow:0 2px 12px rgba(0,0,0,.85)}
  .imprint .iw{color:var(--amber);font-style:normal;font-size:12px}
```

- [ ] **Step 7: Regression check**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -5`
Expected: unchanged pass counts from Task 1's end state, zero FAIL, `SOUL TEST PASSED`. (This task touches no sim-layer file, so this is a pure regression check, not expected to change behavior.)

- [ ] **Step 8: Manual verification (this is a live/animated UI feature — say so plainly)**

A static screenshot can only prove "no crash," not "reads well while fading." Do both:
1. Headless sanity check:
```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-item2-imprint.png" "file://$PWD/bloom/index.html?play&warp=500&seed=42#seed=42"
```
(`warp=500` is small enough that `firstMatch` — fit≥0.40 — is likely the only or first milestone crossed, giving a cleaner single-imprint moment than a big warp that fires several at once on the same frame.) Confirm no console errors and the frame isn't broken.
2. Open `bloom/index.html?play#seed=42` in an actual browser, let it run, and watch a murmur actually drift in and fade — confirm the text is readable, doesn't overlap the `.hint` line awkwardly, and the ✦ murmurs panel still opens and still shows that same murmur (unlocked, not blurred). State plainly in your report whether you did this live check or only the headless one.

- [ ] **Step 9: Commit**

```bash
git add bloom/js/main.js bloom/index.html
git commit -m "$(cat <<'EOF'
feat(bloom): surface the poetry inline — murmurs drift into the world live (round-3 #2)

Replaces the 'open murmurs to read it' toast with the actual murmur text
(G.imprint), drifting in as a low-contrast full-width line over the garden
at the instant it's earned, with a best-effort brightness tie-in to any
in-flight light filament (Task 1). The murmurs panel is untouched — still
the full rereadable archive. Only the m.murmur toast branch changed; codex
and tool-feedback toasts are a separate path. Player+art audit item #2.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Soften the opening

**Files:**
- Modify: `bloom/js/render-core.js:31` (`gLo`), `:176` (`MOTES`), `:206` (`desat`)

**Interfaces:** None — pure constant tuning inside `paint()`'s closure, no new exports, no callers change.

- [ ] **Step 1: Warm the ground floor**

Current, `render-core.js:31`:

```js
    const gLo = [15 + season * 8, 17 + season * 2, 24 - season * 10];       // deep ground
```

Change to (same season=1 endpoint `[23,19,14]`, warmer season=0 start `[19,18,20]` instead of `[15,17,24]`):

```js
    const gLo = [19 + season * 4, 18 + season * 1, 20 - season * 6];        // deep ground (warmed at season=0, round 3)
```

- [ ] **Step 2: Thicken opening motes**

Current, `render-core.js:176`:

```js
    const MOTES = 10 + Math.round(season * 28), tc = sim.tickCount;
```

Change to:

```js
    const MOTES = 16 + Math.round(season * 28), tc = sim.tickCount;
```

- [ ] **Step 3: Lower the desaturation cap**

Current, `render-core.js:206`:

```js
    const desat = (1 - season) * 0.6;
```

Change to:

```js
    const desat = (1 - season) * 0.375;
```

- [ ] **Step 4: Regression check**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -5`
Expected: zero FAIL, `SOUL TEST PASSED` (this task touches only pixel-tinting constants; `meanFit`/sim state math is untouched, so this is a pure regression check).

- [ ] **Step 5: Screenshot before/after at the audit's own reference point**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-item3-opening-after.png" "file://$PWD/bloom/index.html?play&warp=0&seed=42#seed=42"
```
Compare against `bloom/shots/open.png` (the pre-round-3 reference, fit≈0.16). Confirm: noticeably less monochrome, motes visibly denser, but the grey-dawn→gold-noon climb (handoff §6) still reads as a climb — if the opening now looks *equally* saturated as the mature state, the cap was lowered too far; back off toward 0.45–0.5 and re-screenshot.

- [ ] **Step 6: Commit**

```bash
git add bloom/js/render-core.js
git commit -m "$(cat <<'EOF'
feat(bloom): soften the opening — warmer ground, denser motes, lower desat cap (round-3 #3)

desat cap 0.6→0.375, gLo floor warmed (same season=1 endpoint), opening
motes 10→16 base. Purely numeric; the grey-dawn→gold-noon arc is
untouched, just doesn't start half-monochrome. Player+art audit item #3.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Give flowers a body

**Files:**
- Modify: `bloom/js/render-core.js:113-129` (the flower render loop)

**Interfaces:** None — purely additive draw, no new exports. Does **not** touch `genome.js`.

- [ ] **Step 1: Add a soft halo beneath the hard genome pixels**

Current, `render-core.js:113-129`:

```js
    // ── flowers: beacon glow + the generative bloom (the genome's polar expression, pixel art) ──
    const tcF = sim.tickCount;
    for (let i = 0; i < flowers.length; i++) {
      const fl = flowers[i], cx = Math.round((fl.x + 0.5) * S);
      const bob = Math.round(Math.sin(tcF * 0.04 + fl.x * 0.7 + fl.y * 0.3) * S * 0.4); // a gentle breathing sway
      const cy = Math.round((fl.y + 0.5) * S) + bob;
      const bc = hueRGB(fl.beaconHue, 0.85, 0.6);
      const stock = Math.min(1, (fl.nectar + fl.pollen) / (fl.cap * 1.4 + 0.01));
      glow(cx, cy, Math.round(FR * S * 2.0), bc[0], bc[1], bc[2], 0.10 + 0.22 * fl.beaconIntensity * (0.4 + 0.6 * stock));
      const RR = Math.round(FR * S);
      for (let dy = -RR; dy <= RR; dy++) for (let dx = -RR; dx <= RR; dx++) {
        const dn = Math.sqrt(dx * dx + dy * dy) / RR; if (dn > 1) continue;
        const idx = B.Genome.regionIndex(fl.genome, dn, Math.atan2(dy, dx));
        if (idx < 0) continue;
        const c = PAL[idx], sh = 1 - dn * 0.26;
        addPx(cx + dx, cy + dy, c[0] * sh, c[1] * sh, c[2] * sh, 0.96);
      }
```

Change to (new block inserted between computing `RR` and the existing hard-pixel loop):

```js
    // ── flowers: beacon glow + the generative bloom (the genome's polar expression, pixel art) ──
    const tcF = sim.tickCount;
    for (let i = 0; i < flowers.length; i++) {
      const fl = flowers[i], cx = Math.round((fl.x + 0.5) * S);
      const bob = Math.round(Math.sin(tcF * 0.04 + fl.x * 0.7 + fl.y * 0.3) * S * 0.4); // a gentle breathing sway
      const cy = Math.round((fl.y + 0.5) * S) + bob;
      const bc = hueRGB(fl.beaconHue, 0.85, 0.6);
      const stock = Math.min(1, (fl.nectar + fl.pollen) / (fl.cap * 1.4 + 0.01));
      glow(cx, cy, Math.round(FR * S * 2.0), bc[0], bc[1], bc[2], 0.10 + 0.22 * fl.beaconIntensity * (0.4 + 0.6 * stock));
      const RR = Math.round(FR * S);
      // ── a soft body beneath the sharp genome pixels (round 3): fills the negative space between thin
      //    petal tips so the bloom reads as a flower, not an asterisk. Purely additive — genome.js untouched,
      //    the hard genome pixels still draw on top below, unchanged, so the shape stays honestly the genome. ──
      const bodyR = RR * 0.82;
      for (let dy = -RR; dy <= RR; dy++) for (let dx = -RR; dx <= RR; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy); if (d > bodyR) continue;
        const fall = 1 - d / bodyR;
        addPx(cx + dx, cy + dy, bc[0], bc[1], bc[2], fall * fall * 0.22);
      }
      for (let dy = -RR; dy <= RR; dy++) for (let dx = -RR; dx <= RR; dx++) {
        const dn = Math.sqrt(dx * dx + dy * dy) / RR; if (dn > 1) continue;
        const idx = B.Genome.regionIndex(fl.genome, dn, Math.atan2(dy, dx));
        if (idx < 0) continue;
        const c = PAL[idx], sh = 1 - dn * 0.26;
        addPx(cx + dx, cy + dy, c[0] * sh, c[1] * sh, c[2] * sh, 0.96);
      }
```

- [ ] **Step 2: Regression check**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -5`
Expected: zero FAIL, `SOUL TEST PASSED`.

- [ ] **Step 3: Screenshot-verify at a few fits**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for W in 0 800 2500; do
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-item4-flowerbody-w$W.png" "file://$PWD/bloom/index.html?play&warp=$W&seed=42#seed=42"
done
```
Check all three: flowers should read as having a soft filled body instead of bare asterisk-points, at low, mid, and high fit. If the halo is too strong (flowers look like blurry blobs, genome shape no longer legible) or too weak (no visible change), adjust `bodyR`'s `0.82` multiplier or the alpha's `0.22` constant in Step 1 and re-screenshot.

- [ ] **Step 4: Commit**

```bash
git add bloom/js/render-core.js
git commit -m "$(cat <<'EOF'
feat(bloom): give flowers a body — a soft halo under the genome pixels (round-3 #4)

The asterisk look came from regionIndex's hard core/petal/true-empty edges
with nothing filling the gaps between thin petal lobes. Fixed purely in
render-core.js: a soft low-alpha filled disc drawn under the existing hard
genome pixels, which still draw on top unchanged — the shape is still
honestly the genome, it just has a body to sit in. genome.js untouched.
Player+art audit item #4.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Legible dashboards

**Files:**
- Modify: `bloom/js/render-dash.js` (`spark`, `D.graphs`)
- Modify: `bloom/index.html` (`#hgcap` CSS promotion, new `#lockkeyMobile` strip + CSS)
- Modify: `bloom/js/main.js` (`renderDash` writes the new mobile strip too)
- Modify: `bloom/test/harness.js` (one new section: dashboard markup assertions)

**Interfaces:**
- Produces: `spark(...)` output now includes a trailing `<circle>` element.
- Produces: `D.graphs(sim, history)` panel titles now include a `· <b>value</b>` suffix when `history.length > 0`.
- Consumes (in `main.js`): `B.Render.Dash.lockKey(sim, selected)` — unchanged signature, called into a second DOM target.

- [ ] **Step 1: Write the failing dashboard markup test**

`render-dash.js` isn't required by `harness.js` yet. Add a new section at the end of `harness.js`, after the existing `testLevers` block (before the final `console.log`/`process.exit` lines):

```js
// ---- round 3: dashboards ----
section('render-dash — legible sparklines');
require('../js/render-core.js');
require('../js/render-dash.js');

(function testSparklineHasValueDotAndLabel() {
  const sim = B.makeSim(78);
  const history = [
    { fit: 0.2, gridMatch: 0.1, bees: 5, plants: 3, nectar: 2, pollen: 1 },
    { fit: 0.45, gridMatch: 0.3, bees: 7, plants: 4, nectar: 3.2, pollen: 1.8 },
  ];
  const html = B.Render.Dash.graphs(sim, history);
  ok(/<circle /.test(html), 'graphs() output includes a current-value dot on at least one sparkline');
  ok(html.indexOf('45%') >= 0, 'the fit panel title shows the current (last) fit value as a label');
})();
```

(`render-core.js` is required first because `render-dash.js` doesn't itself need it, but keeping the require order consistent with `test/timelapse.js`'s existing `['...', 'render-core', 'render-dash']` order avoids any future load-order surprise if that changes.)

- [ ] **Step 2: Run it, confirm it fails**

Run: `node bloom/test/harness.js 2>&1 | grep -A2 "sparkline"`
Expected: 2 FAIL lines (`spark()` has no circle or label yet).

- [ ] **Step 3: Implement in `render-dash.js`**

Current, `spark()` (lines 62-71):

```js
  // a sparkline polyline from a history array of points → values via getter
  function spark(history, get, color, w, h) {
    if (!history.length) return '';
    let max = 1e-6, min = 1e9;
    for (let i = 0; i < history.length; i++) { const v = get(history[i]); if (v > max) max = v; if (v < min) min = v; }
    if (max - min < 1e-6) { max = min + 1; }
    const n = history.length, pts = [];
    for (let i = 0; i < n; i++) { const v = get(history[i]); pts.push(`${(i / Math.max(1, n - 1) * w).toFixed(1)},${(h - (v - min) / (max - min) * h).toFixed(1)}`); }
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
  }
```

Change to:

```js
  // a sparkline polyline (+ a dot marking the current value) from a history array → values via getter
  function spark(history, get, color, w, h) {
    if (!history.length) return '';
    let max = 1e-6, min = 1e9;
    for (let i = 0; i < history.length; i++) { const v = get(history[i]); if (v > max) max = v; if (v < min) min = v; }
    if (max - min < 1e-6) { max = min + 1; }
    const n = history.length, pts = [];
    for (let i = 0; i < n; i++) { const v = get(history[i]); pts.push(`${(i / Math.max(1, n - 1) * w).toFixed(1)},${(h - (v - min) / (max - min) * h).toFixed(1)}`); }
    const last = pts[pts.length - 1].split(',');
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.6"/>` +
      `<circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${color}"/>`;
  }
```

Current, `D.graphs` (lines 73-86):

```js
  D.graphs = function (sim, history) {
    const w = 220, h = 40;
    const fitG = spark(history, p => p.fit, '#f0b870', w, h);
    const gmG = spark(history, p => p.gridMatch, '#9fd98f', w, h);
    const beeG = spark(history, p => p.bees, '#6fb0f0', w, h);
    const plG = spark(history, p => p.plants, '#9fd98f', w, h);
    const necG = spark(history, p => p.nectar, '#ebb446', w, h);
    const polG = spark(history, p => p.pollen, '#e8e0c8', w, h);
    function panel(title, body) { return `<div class="gph"><div class="gpt">${title}</div><svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${body}</svg></div>`; }
    const turnover = `<span style="color:#8a857a"> · the garden turns over: <b style="color:#9fd98f">${sim.plantBorn || 0}</b> sprouted &middot; <b style="color:#b08a6a">${sim.plantDied || 0}</b> wilted</span>`;
    return panel('lock-and-key fit · grid match', fitG + gmG) +
      panel('population · foragers / plants' + turnover, beeG + plG) +
      panel('stores · nectar / pollen', necG + polG);
  };
```

Change to:

```js
  D.graphs = function (sim, history) {
    const w = 220, h = 40;
    const fitG = spark(history, p => p.fit, '#f0b870', w, h);
    const gmG = spark(history, p => p.gridMatch, '#9fd98f', w, h);
    const beeG = spark(history, p => p.bees, '#6fb0f0', w, h);
    const plG = spark(history, p => p.plants, '#9fd98f', w, h);
    const necG = spark(history, p => p.nectar, '#ebb446', w, h);
    const polG = spark(history, p => p.pollen, '#e8e0c8', w, h);
    const last = history.length ? history[history.length - 1] : null;
    function panel(title, body, valueLabel) {
      return `<div class="gph"><div class="gpt">${title}${valueLabel ? ' · <b>' + valueLabel + '</b>' : ''}</div><svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${body}</svg></div>`;
    }
    const turnover = `<span style="color:#8a857a"> · the garden turns over: <b style="color:#9fd98f">${sim.plantBorn || 0}</b> sprouted &middot; <b style="color:#b08a6a">${sim.plantDied || 0}</b> wilted</span>`;
    return panel('lock-and-key fit · grid match', fitG + gmG,
        last ? (last.fit * 100).toFixed(0) + '% / ' + (last.gridMatch * 100).toFixed(0) + '%' : '') +
      panel('population · foragers / plants' + turnover, beeG + plG,
        last ? last.bees + ' / ' + last.plants : '') +
      panel('stores · nectar / pollen', necG + polG,
        last ? last.nectar.toFixed(1) + ' / ' + last.pollen.toFixed(1) : '');
  };
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `node bloom/test/harness.js 2>&1 | tail -3`
Expected: `ALL PASS — 83/83` (81 from Task 1 + 2 from this test), zero FAIL.

- [ ] **Step 5: Promote the `#hgcap` headline**

In `index.html`'s `<style>` block, right after the `.gcap b{color:var(--amberlit)} .gcap span{color:var(--moss)}` rule (~line 34):

```css
  #hgcap{font-size:14px;color:var(--ink)}
  #hgcap b{font-size:15px}
```

- [ ] **Step 6: Add the mobile compact grid strip**

In `index.html`, current `.stage` opening (~line 153):

```html
    <div class="stage">
      <div class="worldwrap">
```

Change to:

```html
    <div class="stage">
      <div class="lkmobile" id="lockkeyMobile"></div>
      <div class="worldwrap">
```

Add CSS, right after the `.lk .gauge{margin-top:13px;height:13px} .lk .gcap{margin-top:6px;font-size:12.5px;text-align:center;color:var(--ink)}` rule (~line 64):

```css
  .lkmobile{display:none}
```

And inside the existing `@media (max-width:860px){ ... }` block (~line 118-133), add:

```css
    .lkmobile{display:block;padding:8px 10px 2px;background:var(--panel);border-bottom:1px solid var(--line)}
    .lkmobile .lk .gauge{height:8px;margin-top:8px}
    .lkmobile .lk .gcap{font-size:11px;margin-top:4px}
    .lkmobile .lkrow .gridwrap svg{max-width:26vw}
```

- [ ] **Step 7: Render into the new strip**

Current, `main.js`'s `renderDash` (lines 116-119):

```js
  function renderDash(force) {
    $('lockkey').innerHTML = B.Render.Dash.lockKey(G.sim, G.selected);
    $('graphs').innerHTML = B.Render.Dash.graphs(G.sim, G.history);
    if ($('forms')) $('forms').innerHTML = B.Render.Dash.forms(G.forms);
```

Change to:

```js
  function renderDash(force) {
    const lk = B.Render.Dash.lockKey(G.sim, G.selected);
    $('lockkey').innerHTML = lk;
    if ($('lockkeyMobile')) $('lockkeyMobile').innerHTML = lk;
    $('graphs').innerHTML = B.Render.Dash.graphs(G.sim, G.history);
    if ($('forms')) $('forms').innerHTML = B.Render.Dash.forms(G.forms);
```

- [ ] **Step 8: Full regression**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -5`
Expected: zero FAIL, `SOUL TEST PASSED`.

- [ ] **Step 9: Screenshot at desktop and mobile widths**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-item5-dash-desktop.png" "file://$PWD/bloom/index.html?play&warp=2500&seed=42#seed=42"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=390,844 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-item5-dash-mobile.png" "file://$PWD/bloom/index.html?play&warp=2500&seed=42#seed=42"
```
Desktop: confirm sparklines show a dot + value label, `#hgcap` headline is visibly larger. Mobile: confirm a compact lock-and-key strip appears above the canvas (not just below the fold in the sidebar).

- [ ] **Step 10: Commit**

```bash
git add bloom/js/render-dash.js bloom/index.html bloom/js/main.js bloom/test/harness.js
git commit -m "$(cat <<'EOF'
feat(bloom): legible dashboards — value dots, promoted headline, mobile strip (round-3 #5)

spark() now draws a current-value dot; graphs() panel titles show the
current value as a label. #hgcap headline promoted (larger/higher-contrast).
A compact lock-and-key strip now renders above the canvas on mobile
(<=860px), not only in the sidebar below the fold. One new harness section
asserting the generated dashboard markup. Player+art audit item #5.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Group the toolbar

**Files:**
- Modify: `bloom/index.html` (toolbar markup + CSS)
- Modify: `bloom/js/main.js` (`updateLightIcon`, `updateHedgeIcon`, new scroll-hint wiring)

**Interfaces:** None new exported — DOM/CSS + two extended functions.

- [ ] **Step 1: Regroup the toolbar markup**

Current, `index.html:159-168`:

```html
      <div class="toolbar" id="toolbar">
        <button class="tool" data-tool="inspect" title="tap a flower or bee to read it"><span class="ti">🔍</span><span class="tl">inspect</span></button>
        <button class="tool" data-tool="lock" title="freeze the inspected flower&rsquo;s pattern so the bees must chase it"><span class="ti">🔒</span><span class="tl">lock</span></button>
        <button class="tool" data-tool="plant" title="plant a flower"><span class="ti">🌱</span><span class="tl">plant</span></button>
        <button class="tool" data-tool="colony" title="place a colony"><span class="ti">🐝</span><span class="tl">colony</span></button>
        <button class="tool" data-tool="niche" title="spend a tree&rsquo;s sugar to grow a new niche (a new lock)"><span class="ti">🌿</span><span class="tl">grow niche</span></button>
        <button class="tool" data-tool="light" title="paint sunlight / shade — design the environment"><span class="ti" id="lightIcon">☀</span><span class="tl" id="lightLabel">sun</span></button>
        <button class="tool" data-tool="cull" title="cull — pull a weed (thinning a dense patch frees light for the rest)"><span class="ti">✂</span><span class="tl">cull</span></button>
        <button class="tool" data-tool="hedge" title="hedgerow — draw a barrier the bees can't cross (isolate patches → they diverge into new species)"><span class="ti" id="hedgeIcon">🧱</span><span class="tl" id="hedgeLabel">hedge</span></button>
      </div>
```

Change to:

```html
      <div class="toolbar" id="toolbar">
        <div class="toolgrp">
          <button class="tool" data-tool="inspect" title="tap a flower or bee to read it"><span class="ti">🔍</span><span class="tl">inspect</span></button>
          <button class="tool" data-tool="lock" title="freeze the inspected flower&rsquo;s pattern so the bees must chase it"><span class="ti">🔒</span><span class="tl">lock</span></button>
        </div>
        <div class="toolgrp">
          <button class="tool" data-tool="plant" title="plant a flower"><span class="ti">🌱</span><span class="tl">plant</span></button>
          <button class="tool" data-tool="colony" title="place a colony"><span class="ti">🐝</span><span class="tl">colony</span></button>
          <button class="tool" data-tool="niche" title="spend a tree&rsquo;s sugar to grow a new niche (a new lock)"><span class="ti">🌿</span><span class="tl">grow niche</span></button>
        </div>
        <div class="toolgrp">
          <button class="tool" data-tool="light" title="paint sunlight / shade — design the environment"><span class="ti" id="lightIcon">☀</span><span class="tl" id="lightLabel">sun</span><span class="tpip" id="lightPip"></span></button>
          <button class="tool" data-tool="cull" title="cull — pull a weed (thinning a dense patch frees light for the rest)"><span class="ti">✂</span><span class="tl">cull</span></button>
          <button class="tool" data-tool="hedge" title="hedgerow — draw a barrier the bees can't cross (isolate patches → they diverge into new species)"><span class="ti" id="hedgeIcon">🧱</span><span class="tl" id="hedgeLabel">hedge</span><span class="tpip" id="hedgePip"></span></button>
        </div>
      </div>
```

- [ ] **Step 2: Add group/pip/scroll-hint CSS**

Current, `.tool` rule (~line 92):

```css
  .tool{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:62px;padding:8px 6px;flex:0 0 auto}
```

Change to:

```css
  .tool{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:62px;padding:8px 6px;flex:0 0 auto}
```

Right after the `.toolbar{...}` rule (~line 91), add:

```css
  .toolgrp{display:flex;gap:8px;padding-right:10px;margin-right:2px;border-right:1px solid var(--line);flex:0 0 auto}
  .toolgrp:last-child{border-right:none;padding-right:0;margin-right:0}
  .tpip{position:absolute;top:6px;right:9px;width:6px;height:6px;border-radius:50%;background:var(--amber);
    box-shadow:0 0 0 2px var(--panel2);display:none}
  .tpip.on{display:block}
  .toolbar{position:relative}
  .toolbar::after{content:'';position:absolute;top:0;right:0;bottom:0;width:22px;
    background:linear-gradient(90deg,transparent,var(--bg));pointer-events:none;opacity:0;transition:opacity .2s}
  .toolbar.scrollable::after{opacity:1}
```

- [ ] **Step 3: Wire the mode pips**

Current, `main.js`'s `updateLightIcon`/`updateHedgeIcon` (lines 226-230, 236-240):

```js
  function updateLightIcon() {
    const ic = $('lightIcon'), la = $('lightLabel');
    if (ic) ic.textContent = G.lightMode === 'sun' ? '☀' : '🌑';
    if (la) la.textContent = G.lightMode;
  }
```

```js
  function updateHedgeIcon() {
    const ic = $('hedgeIcon'), la = $('hedgeLabel');
    if (ic) ic.textContent = G.hedgeMode === 'build' ? '🧱' : '🧹';
    if (la) la.textContent = G.hedgeMode === 'build' ? 'hedge' : 'clear';
  }
```

Change to:

```js
  function updateLightIcon() {
    const ic = $('lightIcon'), la = $('lightLabel'), pip = $('lightPip');
    if (ic) ic.textContent = G.lightMode === 'sun' ? '☀' : '🌑';
    if (la) la.textContent = G.lightMode;
    if (pip) pip.classList.toggle('on', G.lightMode === 'shade');
  }
```

```js
  function updateHedgeIcon() {
    const ic = $('hedgeIcon'), la = $('hedgeLabel'), pip = $('hedgePip');
    if (ic) ic.textContent = G.hedgeMode === 'build' ? '🧱' : '🧹';
    if (la) la.textContent = G.hedgeMode === 'build' ? 'hedge' : 'clear';
    if (pip) pip.classList.toggle('on', G.hedgeMode === 'clear');
  }
```

- [ ] **Step 4: Wire the scroll-overflow hint**

Add a new function in `main.js`, right after `updateHedgeIcon`:

```js
  function updateToolbarScrollHint() {
    const tb = $('toolbar');
    if (tb) tb.classList.toggle('scrollable', tb.scrollWidth > tb.clientWidth + 4);
  }
```

In `wireUI()`, current end of function (lines 276-278):

```js
    window.addEventListener('beforeunload', autosave);
  }
```

Change to:

```js
    window.addEventListener('beforeunload', autosave);
    updateToolbarScrollHint();
    window.addEventListener('resize', updateToolbarScrollHint);
  }
```

- [ ] **Step 5: Regression check**

Run: `node bloom/test/harness.js 2>&1 | tail -3 && node bloom/test/soul.js 2>&1 | tail -5`
Expected: zero FAIL, `SOUL TEST PASSED` (this task touches no sim-layer file).

- [ ] **Step 6: Screenshot at desktop and mobile widths**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-item6-toolbar-desktop.png" "file://$PWD/bloom/index.html?play&warp=0&seed=42#seed=42"
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=390,844 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-item6-toolbar-mobile.png" "file://$PWD/bloom/index.html?play&warp=0&seed=42#seed=42"
```
Confirm: 3 visually separated clusters, a fade edge on the right on mobile if it overflows. To see a mode-pip lit, manually toggle in a live browser (tap ☀ twice → shade; the headless screenshot alone won't show the toggled state without extra script injection, which isn't worth building for a one-off visual check — say so plainly rather than claiming the pip was screenshot-verified).

- [ ] **Step 7: Commit**

```bash
git add bloom/index.html bloom/js/main.js
git commit -m "$(cat <<'EOF'
feat(bloom): group the toolbar — read/grow/shape clusters + mode pips (round-3 #6)

8 tools now cluster into read (inspect, lock) / grow (plant, colony,
niche) / shape (sun, cull, hedge) with a visual separator, matching the
audit's own grouping. A scroll-fade affordance appears when the toolbar
overflows on narrow screens. Sun/hedge buttons now show a small pip when
in their non-default mode (shade / clear) — previously invisible until you
tapped and read the hint text. No functional change to any tool. Player+art
audit item #6.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: QA loop — fresh-eyes UX/UI + game-design critique

**Files:**
- Create: `bloom/docs/2026-07-01-round3-qa-critique.md`

**Interfaces:** None — documentation artifact, matching the existing precedent docs (`bloom/docs/2026-06-30-critique-simcity.md`, `bloom/docs/2026-07-01-player-art-audit.md`).

- [ ] **Step 1: Capture fresh reference screenshots of the finished round-3 build**

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for W in 0 800 2500; do
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --disable-gpu --no-sandbox --window-size=1280,860 --virtual-time-budget=4500 \
  --screenshot="$PWD/bloom/shots/round3-final-w$W.png" "file://$PWD/bloom/index.html?play&warp=$W&seed=42#seed=42"
done
```

- [ ] **Step 2: Dispatch two independent, fresh-context critics (no implementation context — they should not have seen this plan or the spec, only the live build + its own docs)**

Use the Agent tool twice, **in parallel** (single message, two tool calls), each `subagent_type: "general-purpose"` (fresh context, not a fork — these need genuinely independent eyes, not inherited bias from having just written the code):

Critic 1 — UX/UI, prompt:
```
You're doing a fresh UX/UI critique of bloom, a pixel-art garden game where a plant patch and a
pollinator colony co-evolve (live at blainebooher.com/entropy-game-test/bloom/, or open
bloom/index.html locally). This is specifically a review of ROUND 3 changes just shipped:
(1) light filaments now trace a good pollinator read as a brief glowing thread in the world,
(2) murmur poetry now drifts inline over the garden the instant it's earned, instead of a toast
telling you to go read it in a panel later (the panel still exists for rereading),
(3) the opening frame is less desaturated/monochrome than before,
(4) flowers now have a soft filled body instead of reading as bare asterisks,
(5) the sidebar dashboards show a current-value dot + label on each sparkline, a bigger headline,
and a compact lock-and-key strip now appears above the canvas on mobile,
(6) the toolbar is now grouped into read/grow/shape clusters with a scroll-fade hint and small
mode-pips on the two dual-toggle tools (sun/hedge).

Read bloom/docs/2026-07-01-player-art-audit.md first — that's the audit these 6 changes were meant
to address — then play/inspect the current build (screenshots are at bloom/shots/round3-final-w*.png
for w=0/800/2500 = opening/mid/native fit; take your own with the documented command in
bloom/docs/2026-07-01-handoff.md §3 if you can run a browser). For each of the 6 items: does it land
as intended, per the audit's own description of what it wanted? Is anything confusing, visually
broken, or worse than the pre-round-3 state? Rate overall player-feel now. Be concrete — cite what
you actually saw, not what the commit messages claim.
```

Critic 2 — game design, prompt:
```
You're a game-design critic in the lineage of the Civ5/SimCity-style critic already run against
this project (bloom/docs/2026-06-30-critique-simcity.md — read it first for the tone/rigor this
project expects). Review bloom's just-shipped ROUND 3 polish pass (6 items: light filaments on good
reads, poetry drifting in live, a softer opening, flower bodies, legible dashboards, a grouped
toolbar — full detail in bloom/docs/2026-07-01-player-art-audit.md, the audit round 3 was built
from) against the game's own stated design DNA in bloom/docs/2026-07-01-handoff.md §7: coax, don't
command; the arc bends upward (cultivation, never survival combat); wonder, not power; legibility is
king. Play/inspect the current build (bloom/shots/round3-final-w*.png for w=0/800/2500 =
opening/mid/native fit, or run it yourself). Does round 3 serve that DNA, or does anything now feel
gamey, over-explained, or manipulative? Does the game feel MORE alive and comprehensible than the
player+art audit described, or just decorated? What is the single highest-leverage next move after
this round — and is it morphology (bloom/docs/2026-07-01-morphology-brief.md, already queued and
gated on Blaine), something else in round 3's own audit that didn't get built, or something new you
noticed?
```

- [ ] **Step 3: Synthesize into a dated doc**

Write `bloom/docs/2026-07-01-round3-qa-critique.md`, structured like the existing `2026-07-01-player-art-audit.md` (a short intro naming the two critic lenses + reference screenshots, then each critic's verdict — what landed, what didn't, per-item notes — then a short synthesized "ranked next actions" section if both critics converge on something, or an honest note if they diverge). Do not soften or cherry-pick the critics' findings — if something shipped in round 3 didn't land, say so plainly, matching this project's own established honesty (e.g. the "tried + abandoned" note in the round-2 handoff).

- [ ] **Step 4: Commit**

```bash
git add bloom/docs/2026-07-01-round3-qa-critique.md bloom/shots/round3-final-w0.png bloom/shots/round3-final-w800.png bloom/shots/round3-final-w2500.png
git commit -m "$(cat <<'EOF'
docs(bloom): round-3 QA critique — fresh UX/UI + game-design lenses

Two independent fresh-context critics reviewed the finished round-3 build
against the player+art audit it was built from and the project's own DNA
(bloom/docs/2026-07-01-handoff.md §7). Findings in
bloom/docs/2026-07-01-round3-qa-critique.md, following the same precedent
as the ecologist/dream-reviewer/player-art-director audits.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Update the handoff doc

**Files:**
- Modify: `bloom/docs/2026-07-01-handoff.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Add a ROUND 3 box**

Read the current handoff's `★ ROUND 2` box (lines 9-56) as the structural template. Add a new `★ ROUND 3` box directly after it (before `## 0. What it is`), covering: the 6 shipped items (one line each, in ranked order, matching the tone of round 2's bullet list), the harness assertion count (75 + however many Task 1/5 actually added — confirm the exact number by running `node bloom/test/harness.js 2>&1 | tail -1` rather than guessing), a pointer to `2026-07-01-round3-qa-critique.md` and its headline finding(s), and what's still queued (morphology — unchanged, still gated on Blaine; plus anything the QA critics flagged as the next highest-leverage move).

- [ ] **Step 2: Update the "docs map" pointer section**

In the existing "Docs map" line near the end of the handoff (§10 gotchas area), add the new round-3 spec/plan/critique doc paths alongside the existing round-1/round-2 ones, so a cold read can find everything.

- [ ] **Step 3: Commit**

```bash
git add bloom/docs/2026-07-01-handoff.md
git commit -m "$(cat <<'EOF'
docs(bloom): round-3 handoff — player/art polish shipped + QA critique folded in

Adds a ROUND 3 box mirroring round 2's: the 6 shipped items, current
harness count, the QA critique's headline findings, and what's still
queued (morphology, still gated on Blaine; plus the critique's own
highest-leverage next-move call).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Plan Self-Review Notes (for the executor, not a step to run)

- **Spec coverage:** spec §2→Task 1, §3→Task 2, §4→Task 3, §5→Task 4, §6→Task 5, §7→Task 6, §8 (build order + gate)→ enforced per-task throughout, §9 (out of scope)→ respected (no task touches genome.js or economy constants). Task 7 (QA) and Task 8 (handoff update) are additions beyond the committed spec — the former per Blaine's mid-session request to run a QA loop matching the project's established critic precedent, the latter because every prior round in this project's history ended with a handoff update and this plan should match that established rhythm rather than leave it implicit.
- **Type consistency checked:** `readEvent` shape (`{x0,y0,x1,y1,hue,eff}`) is identical across pollinator.js (Task 1 Step 3), sim.js (Step 7), main.js (Step 9), and both harness tests (Steps 1, 5). `G.imprint` shape (`{text,who,age}`) is identical across main.js's four touch points in Task 2. `panel(title, body, valueLabel)`'s new third parameter is used consistently at all three call sites in Task 5 Step 3.
- **No placeholders:** every step above has complete, copy-pasteable code or an exact command — nothing deferred to "add appropriate styling" or similar.
