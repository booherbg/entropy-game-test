# LOOPHOLE successor — loophole-loop prototype · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, hardware-accelerated browser game prototype that proves the core "loophole loop" — you shape a finite material field with tunable generators, seed life that locks order in against entropy, and read a living world you can trace back to your moves — feels like magic and not mush.

**Architecture:** A **pure-JS deterministic simulation core** (seeded RNG → material field with conserved diffusion → generators → life with conservation-grounded metabolism), driven by an authoritative `tick()`, fully testable headless in Node via a harness. On top, a **browser-only WebGL2 render + UI layer** (field texture + instanced entity sprites, toolbar, inspector) that draws sim state but never owns it. This split keeps the authoritative sim deterministic and harness-verifiable while still GPU-scaling the visuals. Persistence is localStorage behind a thin interface (backend-swappable later).

**Tech Stack:** Vanilla JS (no framework), WebGL2 for render, Node for the headless harness, localStorage for saves. Runs from `file://` and GitHub Pages. Module convention: classic-script global namespace `E` with a Node `module.exports` shim (so the same files load in the browser via `<script>` and in Node via `require`).

**Spec:** `docs/superpowers/specs/2026-06-24-loophole-loop-prototype-design.md` · **Soul:** `…-loophole-successor-genesis.md`. Read both first.

**Working directory:** `eddy/` — provisional name (from Wiener's "we are but… eddies," already in the parent's murmurs; an eddy *is* a dissipative structure). Rename freely with `git mv`; it never touches `loophole/`.

---

## File structure (locked decisions)

```
eddy/
  index.html            # page: canvas + minimal DOM (toolbar, inspector); loads js/* as classic scripts in order
  js/rng.js             # E.makeRng(seed) — deterministic mulberry32. The invariant's foundation.
  js/grid.js            # E.Grid — geometry helpers (idx, neighbors, W/H), element indices, constants
  js/field.js           # E.Field — material substrate: per-cell element amounts; conserved diffusion; deposit/consume API
  js/generators.js      # E.Generators — sources (element, rate, projection radial|vein); deposit finite flux into the field
  js/life.js            # E.Life — entities; spawn-from-primer (latch), Mode-1 metabolism (consume→retain→excrete), replicate, mutate, die→mineralize
  js/fertility.js       # E.Fertility — ambient: local surplus → probability of a spontaneous primer
  js/sim.js             # E.Sim — world state + authoritative tick(); orchestrates field→generators→life→fertility; serialize/deserialize
  js/persist.js         # E.Persist — save/load Sim state to localStorage behind a thin interface
  js/content.js         # E.Content — procedural names + a few attributed murmurs (the voice/lineage)
  js/render.js          # E.Render — WebGL2: field texture + instanced entity sprites; world view + field lens
  js/ui.js              # E.UI — toolbar, click-to-place generator / drop primer, lens toggle, inspector panel
  js/main.js            # E.Main — RAF loop (auto-tick + pause/step), wires sim+render+ui+persist
  test/harness.js       # Node headless suite: determinism, conservation, live-band/diversity. Source of truth.
  DISCOVERIES.md        # lab notebook — findings about the sim's own behaviour, newest first (lineage tradition)
  README.md             # what it is, how to run, how to test
```

**Module convention (every `js/*.js` file follows this exactly):**

```js
;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  // ... define E.Thing = {...} or E.makeThing = function(){...}

  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

In the browser, `index.html` loads files via ordered `<script src="js/rng.js"></script>` … (no ES modules — they break on `file://` in Chrome). In Node, the harness `require`s each file; they all attach to the shared `globalThis.E`. `render.js`/`ui.js`/`main.js` are browser-only and are **never** required by the harness, so WebGL never loads in Node.

**Constants (defined once in `grid.js`):** `E.W = 160`, `E.H = 100`, elements `E.LUM=0, E.MIN=1, E.HUM=2`, `E.NEL=3`. Plus a per-cell scalar **variant** field in [0,1] (a continuous local "flavor" specialists adapt to).

---

## Task 1: Scaffold + deterministic RNG + harness runner

**Files:**
- Create: `eddy/js/rng.js`
- Create: `eddy/test/harness.js`
- Create: `eddy/README.md`

- [ ] **Step 1: Write the failing test** — `eddy/test/harness.js`

```js
'use strict';
// Tiny assertion harness (no deps). Each check prints PASS/FAIL; process exits non-zero on any failure.
let fails = 0;
function ok(cond, msg) { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (!cond) fails++; }
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= (eps || 1e-9), msg + ` (${a} ~ ${b})`); }

const E = require('../js/rng.js');

(function testRngDeterminism() {
  const r1 = E.makeRng(12345), r2 = E.makeRng(12345);
  const a = [r1(), r1(), r1()], b = [r2(), r2(), r2()];
  ok(a.every((v, i) => v === b[i]), 'same seed → identical stream');
  ok(a.every(v => v >= 0 && v < 1), 'rng outputs in [0,1)');
  const r3 = E.makeRng(99);
  ok(r3() !== a[0], 'different seed → different stream');
})();

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node eddy/test/harness.js`
Expected: FAIL — `Cannot find module '../js/rng.js'`.

- [ ] **Step 3: Write the minimal implementation** — `eddy/js/rng.js`

```js
;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  // mulberry32 — fast, seedable, deterministic.
  E.makeRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node eddy/test/harness.js`
Expected: PASS on all three rng checks, `ALL PASS`.

- [ ] **Step 5: Write `eddy/README.md`** (what it is; `Run tests: node eddy/test/harness.js`; `Play: open eddy/index.html`) and **commit**

```bash
git add eddy/js/rng.js eddy/test/harness.js eddy/README.md
git commit -m "feat(eddy): scaffold + deterministic rng + headless harness"
```

---

## Task 2: The material field — geometry + conserved diffusion (entropy)

**Files:**
- Create: `eddy/js/grid.js`
- Create: `eddy/js/field.js`
- Modify: `eddy/test/harness.js` (append tests; add `require('../js/grid.js'); require('../js/field.js');`)

**Interface:** `E.makeField(rng)` → `{ el: Float32Array(W*H*NEL), variant: Float32Array(W*H), total(elIdx), diffuse() }`. `total(k)` sums element channel `k` across all cells. `diffuse()` runs one conserved diffusion step in place.

- [ ] **Step 1: Write the failing tests** — append to `harness.js`

```js
const FE = require('../js/field.js');

(function testFieldConservationAndSpread() {
  const f = E.makeField(E.makeRng(7));
  // seed a single hot cell of lumen so there is something to spread
  for (let i = 0; i < E.W * E.H; i++) { f.el[i * E.NEL + E.LUM] = 0; }
  const c = (E.H >> 1) * E.W + (E.W >> 1);
  f.el[c * E.NEL + E.LUM] = 100;
  const before = f.total(E.LUM);
  const centerBefore = f.el[c * E.NEL + E.LUM];
  for (let s = 0; s < 25; s++) f.diffuse();
  approx(f.total(E.LUM), before, 1e-3, 'diffusion conserves total lumen');
  ok(f.el[c * E.NEL + E.LUM] < centerBefore, 'diffusion lowers the peak (spreads)');
  // a neighbour gained some
  ok(f.el[(c + 1) * E.NEL + E.LUM] > 0, 'diffusion spread lumen to a neighbour');
})();

(function testFieldDeterminism() {
  const f1 = E.makeField(E.makeRng(7)), f2 = E.makeField(E.makeRng(7));
  for (let s = 0; s < 10; s++) { f1.diffuse(); f2.diffuse(); }
  let same = true;
  for (let i = 0; i < f1.el.length; i++) if (f1.el[i] !== f2.el[i]) { same = false; break; }
  ok(same, 'same seed → identical field after diffusion');
})();
```

- [ ] **Step 2: Run to verify failure** — Run: `node eddy/test/harness.js` → FAIL (`makeField` undefined).

- [ ] **Step 3: Implement `grid.js`**

```js
;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  E.W = 160; E.H = 100;
  E.LUM = 0; E.MIN = 1; E.HUM = 2; E.NEL = 3;
  E.idx = function (x, y) { return y * E.W + x; };
  // visit existing 4-neighbours of cell index i (no wrap; domain is closed → conserves mass)
  E.forNeighbors = function (i, fn) {
    const x = i % E.W, y = (i / E.W) | 0;
    if (x > 0) fn(i - 1); if (x < E.W - 1) fn(i + 1);
    if (y > 0) fn(i - E.W); if (y < E.H - 1) fn(i + E.W);
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: Implement `field.js`** — conserved explicit diffusion (`new[i] = old[i] + D·Σ(old[j]-old[i])`, D≤0.2 for 4-neighbour stability; closed boundary ⇒ total conserved)

```js
;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  const D = 0.18; // diffusion rate (entropy). ≤0.25 for stability with 4 neighbours.

  E.makeField = function (rng) {
    const N = E.W * E.H;
    const el = new Float32Array(N * E.NEL);
    const variant = new Float32Array(N);
    const scratch = new Float32Array(N * E.NEL);
    // a calm, dull ambient blend everywhere (this is the "gray" the world relaxes toward)
    for (let i = 0; i < N; i++) {
      el[i * E.NEL + E.LUM] = 0.05 + rng() * 0.03;
      el[i * E.NEL + E.MIN] = 0.05 + rng() * 0.03;
      el[i * E.NEL + E.HUM] = 0.04 + rng() * 0.03;
      variant[i] = rng(); // static local flavour map
    }
    function total(k) { let s = 0; for (let i = 0; i < N; i++) s += el[i * E.NEL + k]; return s; }
    function diffuse() {
      for (let k = 0; k < E.NEL; k++) {
        for (let i = 0; i < N; i++) {
          const v = el[i * E.NEL + k];
          let acc = 0;
          E.forNeighbors(i, function (j) { acc += el[j * E.NEL + k] - v; });
          scratch[i * E.NEL + k] = v + D * acc;
        }
      }
      el.set(scratch);
    }
    return { el, variant, total, diffuse,
      // helpers used by later tasks:
      get(i, k) { return el[i * E.NEL + k]; },
      add(i, k, amt) { el[i * E.NEL + k] += amt; },
    };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 5: Run tests → PASS, then commit**

Run: `node eddy/test/harness.js` → Expected: PASS (conservation, spread, determinism).
```bash
git add eddy/js/grid.js eddy/js/field.js eddy/test/harness.js
git commit -m "feat(eddy): material field with conserved diffusion (entropy made visible)"
```

---

## Task 3: Generators — finite-flux sources with range-delivery + projections

**Files:**
- Create: `eddy/js/generators.js`
- Modify: `eddy/test/harness.js`

**Interface:** a generator is `{ x, y, el, rate, proj }` where `proj` ∈ `'radial' | 'vein'` (vein adds `{angle}`). `E.depositGenerators(field, gens)` adds each generator's finite `rate` of element `el`, distributed by its projection's normalized weight kernel, into the field. Overlap is automatically additive (two generators just add into the same cells). Total added per generator per call == `rate` exactly (conservation: the field's element total rises by exactly Σrate).

- [ ] **Step 1: Write failing tests**

```js
const GEN = require('../js/generators.js');

(function testGeneratorConservationAndShape() {
  const f = E.makeField(E.makeRng(1));
  const base = f.total(E.LUM);
  const g = { x: 80, y: 50, el: E.LUM, rate: 10, proj: 'radial', radius: 12 };
  E.depositGenerators(f, [g]);
  approx(f.total(E.LUM) - base, 10, 1e-4, 'radial generator adds exactly its rate (finite)');
  ok(f.get(E.idx(80, 50), E.LUM) > f.get(E.idx(80, 62), E.LUM), 'radial: more at the centre than the edge');
})();

(function testGeneratorOverlapAdds() {
  const f = E.makeField(E.makeRng(1));
  const c = E.idx(80, 50);
  const lumBefore = f.get(c, E.LUM), minBefore = f.get(c, E.MIN);
  E.depositGenerators(f, [
    { x: 80, y: 50, el: E.LUM, rate: 10, proj: 'radial', radius: 14 },
    { x: 80, y: 50, el: E.MIN, rate: 10, proj: 'radial', radius: 14 },
  ]);
  ok(f.get(c, E.LUM) > lumBefore && f.get(c, E.MIN) > minBefore,
     'overlap: the cell gains BOTH elements → a blend (combinatorial niche)');
})();
```

- [ ] **Step 2: Run → FAIL** (`depositGenerators` undefined).

- [ ] **Step 3: Implement `generators.js`** — build a normalized weight kernel per projection, then deposit `rate · weight`

```js
;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  function radialWeights(g) {
    const r = g.radius || 12, r2 = r * r, out = [];
    let sum = 0;
    for (let y = Math.max(0, g.y - r); y <= Math.min(E.H - 1, g.y + r); y++)
      for (let x = Math.max(0, g.x - r); x <= Math.min(E.W - 1, g.x + r); x++) {
        const d2 = (x - g.x) * (x - g.x) + (y - g.y) * (y - g.y);
        if (d2 > r2) continue;
        const w = Math.exp(-d2 / (2 * (r / 2) * (r / 2)));
        out.push([E.idx(x, y), w]); sum += w;
      }
    return { out, sum };
  }
  function veinWeights(g) {
    const len = g.length || 26, half = len / 2, ang = g.angle || 0;
    const dx = Math.cos(ang), dy = Math.sin(ang), out = []; let sum = 0;
    for (let t = -half; t <= half; t += 0.5) {
      const x = Math.round(g.x + dx * t), y = Math.round(g.y + dy * t);
      if (x < 0 || y < 0 || x >= E.W || y >= E.H) continue;
      const w = 1 - Math.abs(t) / (half + 1); // taper toward the ends
      out.push([E.idx(x, y), w]); sum += w;
    }
    return { out, sum };
  }
  E.depositGenerators = function (field, gens) {
    for (const g of gens) {
      const { out, sum } = (g.proj === 'vein' ? veinWeights(g) : radialWeights(g));
      if (sum <= 0) continue;
      for (const [i, w] of out) field.add(i, g.el, g.rate * (w / sum)); // Σ deposits == rate
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add eddy/js/generators.js eddy/test/harness.js
git commit -m "feat(eddy): tunable generators — finite-flux sources, range-delivered, additive overlap"
```

---

## Task 4: Life I — entities + spawn-from-primer (latch to local blend)

**Files:**
- Create: `eddy/js/life.js`
- Modify: `eddy/test/harness.js`

**Interface:** `E.makeLife(rng)` → `{ list:[], spawnFromPrimer(field, x, y), step(field) }` (step added in Tasks 5–6). An entity: `{ x, y, diet:Float32Array(NEL), biomass, age, gen, alive, id }`. `spawnFromPrimer` reads the cell's element proportions → the new entity's `diet` (it eats what's locally abundant) → "latched."

- [ ] **Step 1: Failing test**

```js
const LIFE = require('../js/life.js');

(function testPrimerLatchesToLocalBlend() {
  const f = E.makeField(E.makeRng(3));
  const c = E.idx(40, 40);
  f.add(c, E.MIN, 50); // make this spot strongly mineral
  const life = E.makeLife(E.makeRng(3));
  const ent = life.spawnFromPrimer(f, 40, 40);
  ok(ent && ent.alive, 'primer spawns a living entity');
  ok(ent.diet[E.MIN] > ent.diet[E.LUM] && ent.diet[E.MIN] > ent.diet[E.HUM],
     'latched: diet favours the locally abundant element (mineral)');
})();
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement the entity + spawn half of `life.js`**

```js
;(function (root) {
  'use strict';
  const E = root.E = root.E || {};

  E.makeLife = function (rng) {
    const list = [];
    let nextId = 1;

    function localBlend(field, i) {
      const v = [field.get(i, E.LUM), field.get(i, E.MIN), field.get(i, E.HUM)];
      const s = v[0] + v[1] + v[2] || 1;
      return new Float32Array([v[0] / s, v[1] / s, v[2] / s]);
    }
    function spawnFromPrimer(field, x, y) {
      const i = E.idx(x, y);
      const diet = localBlend(field, i);              // latch: eat what's in surplus here
      const ent = { id: nextId++, x, y, diet, biomass: 0.5, age: 0, gen: 1, alive: true };
      list.push(ent);
      return ent;
    }
    return { list, spawnFromPrimer, _rng: rng,
      // step() is implemented in Task 5–6
    };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit**

```bash
git add eddy/js/life.js eddy/test/harness.js
git commit -m "feat(eddy): life entities + primer that latches to the local blend"
```

---

## Task 5: Life II — Mode-1 metabolism (consume → retain ratio → excrete), conserved

**Files:**
- Modify: `eddy/js/life.js` (add `step(field)` consuming + excreting)
- Modify: `eddy/test/harness.js`

**Behaviour per entity per step:** eat up to `EAT=0.4` total from its cell, weighted by `diet`; keep a `RETAIN=0.5` fraction as biomass; **excrete the remainder as humus** back into the same cell. Conservation: `Δfield_total + Δbiomass_total == 0` over a step (nothing created or destroyed).

- [ ] **Step 1: Failing test**

```js
(function testMetabolismConserves() {
  const f = E.makeField(E.makeRng(5));
  const c = E.idx(40, 40);
  f.add(c, E.LUM, 20);
  const life = E.makeLife(E.makeRng(5));
  const ent = life.spawnFromPrimer(f, 40, 40); // lumen-eater
  const fieldBefore = f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM);
  const bioBefore = ent.biomass;
  life.step(f);
  const fieldAfter = f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM);
  const bioAfter = ent.biomass;
  approx((fieldAfter - fieldBefore) + (bioAfter - bioBefore), 0, 1e-4,
         'matter conserved: field loss == biomass gain (Mode-1)');
  ok(bioAfter > bioBefore, 'a fed entity gains biomass');
  ok(f.get(c, E.HUM) > 0, 'it excreted humus into its cell (waste = future food)');
})();
```

- [ ] **Step 2: Run → FAIL** (`life.step` undefined).

- [ ] **Step 3: Implement `step` consume/excrete** — add inside `makeLife`, and return it

```js
    const EAT = 0.4, RETAIN = 0.5;
    function metabolize(field, ent) {
      const i = E.idx(ent.x | 0, ent.y | 0);
      // how much of each element is here, and how much this diet wants
      let eaten = 0;
      for (let k = 0; k < E.NEL; k++) {
        const want = EAT * ent.diet[k];
        const have = field.get(i, k);
        const take = Math.min(want, have);
        field.add(i, k, -take);            // deplete the field
        eaten += take;
      }
      ent.biomass += eaten * RETAIN;        // keep its ratio as biomass
      field.add(i, E.HUM, eaten * (1 - RETAIN)); // excrete the surplus as humus (conserved)
    }
    function step(field) {
      for (const ent of list) if (ent.alive) { metabolize(field, ent); ent.age++; }
    }
```
Then add `step` to the returned object: `return { list, spawnFromPrimer, step, _rng: rng };`

> **Conservation note (load-bearing):** upkeep must put the spent biomass *somewhere*, or matter is destroyed and the death test fails. Respire it back to the field as humus: `const cost = Math.min(UPKEEP, ent.biomass); ent.biomass -= cost; field.add(i, E.HUM, cost);`. Then death adds any remaining biomass to humus. The full life cycle (eat → retain → excrete → upkeep → split → die) then conserves matter exactly.

- [ ] **Step 4: Run → PASS** (conservation, biomass gain, humus excreted).
- [ ] **Step 5: Commit**

```bash
git add eddy/js/life.js eddy/test/harness.js
git commit -m "feat(eddy): Mode-1 metabolism — eat, retain ratio, excrete humus; matter conserved"
```

---

## Task 6: Life III — replicate, mutate-to-local, die → mineralize

**Files:**
- Modify: `eddy/js/life.js` (extend `step`)
- Modify: `eddy/test/harness.js`

**Rules:** when `biomass ≥ REPRO=2.0`, split (halve biomass, spawn a child in a neighbouring cell whose `diet` is the parent's nudged toward the child cell's local blend by `MUT=0.25`; `gen = parent.gen+1`). Upkeep: `biomass -= UPKEEP=0.05` each step; if `biomass ≤ 0`, die and **return remaining biomass to the field as humus** (mineralize) and set `alive=false`. Live count capped at `LIFE_CAP=4000`.

- [ ] **Step 1: Failing tests**

```js
(function testDeathMineralizesAndConserves() {
  const f = E.makeField(E.makeRng(8));
  const c = E.idx(40, 40);
  const life = E.makeLife(E.makeRng(8));
  const ent = life.spawnFromPrimer(f, 40, 40);
  ent.biomass = 0.03; // about to starve
  // empty its cell so it cannot eat, forcing starvation
  for (let k = 0; k < E.NEL; k++) f.add(c, k, -f.get(c, k));
  // baseline AFTER the artificial emptying — only the death step's biomass→humus is under test
  const totalBefore = f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM) + ent.biomass;
  life.step(f); life.step(f);
  ok(!ent.alive, 'a starved entity dies');
  const totalAfter = f.total(E.LUM) + f.total(E.MIN) + f.total(E.HUM)
                   + life.list.filter(e => e.alive).reduce((s, e) => s + e.biomass, 0);
  approx(totalAfter, totalBefore, 1e-3, 'death returns biomass to the field (conserved)');
})();

(function testReplication() {
  const f = E.makeField(E.makeRng(9));
  for (let n = 0; n < E.W * E.H; n++) f.add(n, E.LUM, 5); // rich in lumen everywhere
  const life = E.makeLife(E.makeRng(9));
  life.spawnFromPrimer(f, 80, 50);
  for (let s = 0; s < 30; s++) life.step(f);
  ok(life.list.filter(e => e.alive).length > 1, 'a well-fed colony self-replicates');
})();
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Extend `step`** — add constants and reproduce/upkeep/death; thread the life `rng` for child placement

```js
    const REPRO = 2.0, MUT = 0.25, UPKEEP = 0.05, LIFE_CAP = 4000;
    function neighborCell(ent) {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const d = dirs[(rng() * 4) | 0];
      const nx = Math.min(E.W - 1, Math.max(0, (ent.x | 0) + d[0]));
      const ny = Math.min(E.H - 1, Math.max(0, (ent.y | 0) + d[1]));
      return { nx, ny };
    }
    function reproduce(field, ent) {
      if (list.length >= LIFE_CAP) return;
      const { nx, ny } = neighborCell(ent);
      const local = localBlend(field, E.idx(nx, ny));
      const diet = new Float32Array(E.NEL);
      let s = 0;
      for (let k = 0; k < E.NEL; k++) { diet[k] = ent.diet[k] * (1 - MUT) + local[k] * MUT; s += diet[k]; }
      for (let k = 0; k < E.NEL; k++) diet[k] /= s; // renormalize
      ent.biomass *= 0.5;
      list.push({ id: nextId++, x: nx, y: ny, diet, biomass: ent.biomass, age: 0, gen: ent.gen + 1, alive: true });
    }
```
Update `step` to: metabolize → `ent.biomass -= UPKEEP` → if `≥ REPRO` reproduce → if `≤ 0` die (`field.add(i, E.HUM, max(0, biomass)); ent.alive = false`). Compact dead entities occasionally (e.g. when `list.length` grows) to bound memory.

- [ ] **Step 4: Run → PASS** (death conserves, colony grows).
- [ ] **Step 5: Commit**

```bash
git add eddy/js/life.js eddy/test/harness.js
git commit -m "feat(eddy): life replicates, mutates toward local variant, dies into humus (conserved)"
```

---

## Task 7: Ambient fertility — spontaneous primers where surplus is rich

**Files:**
- Create: `eddy/js/fertility.js`
- Modify: `eddy/test/harness.js`

**Interface:** `E.fertilityStep(field, life, rng)` — scan a sample of cells; for a cell whose total element surplus exceeds `FERT_THRESH=3.0`, with probability `∝ surplus` spawn a primer there (calls `life.spawnFromPrimer`). Rate-limited (e.g. at most a few spawns per step) so it stays legible.

- [ ] **Step 1: Failing test**

```js
const FERT = require('../js/fertility.js');
(function testFertilitySparksLifeInSurplus() {
  const f = E.makeField(E.makeRng(2));
  for (let n = 0; n < E.W * E.H; n++) { f.add(n, E.LUM, 8); } // very fertile everywhere
  const life = E.makeLife(E.makeRng(2));
  let spawned = false;
  for (let s = 0; s < 20 && !spawned; s++) { E.fertilityStep(f, life, life._rng); spawned = life.list.length > 0; }
  ok(spawned, 'rich surplus eventually sparks life unbidden (ambient fertility)');
})();
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement `fertility.js`**

```js
;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  const FERT_THRESH = 3.0, MAX_SPAWN = 3, SAMPLE = 400;
  E.fertilityStep = function (field, life, rng) {
    let spawns = 0;
    for (let s = 0; s < SAMPLE && spawns < MAX_SPAWN; s++) {
      const i = (rng() * E.W * E.H) | 0;
      const surplus = field.get(i, E.LUM) + field.get(i, E.MIN) + field.get(i, E.HUM);
      if (surplus > FERT_THRESH && rng() < (surplus - FERT_THRESH) * 0.02) {
        life.spawnFromPrimer(field, i % E.W, (i / E.W) | 0); spawns++;
      }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: Run → PASS.** **Step 5: Commit**

```bash
git add eddy/js/fertility.js eddy/test/harness.js
git commit -m "feat(eddy): ambient fertility — life sparks unbidden where surplus is rich"
```

---

## Task 8: The sim orchestrator + the live-band / determinism assertions

**Files:**
- Create: `eddy/js/sim.js`
- Modify: `eddy/test/harness.js`

**Interface:** `E.makeSim(seed)` → `{ field, life, gens:[], tick(), addGenerator(g), dropPrimer(x,y), hash(), serialize(), stats() }`. `tick()` order: `field.diffuse()` → `depositGenerators(field, gens)` → `life.step(field)` → `fertilityStep(field, life, rng)`. `stats()` → `{ alive, speciesApprox, fieldTotal }` (speciesApprox = count of distinct rounded diet vectors among living entities). `hash()` → a cheap deterministic number over field+life for determinism tests.

- [ ] **Step 1: Failing tests** — the make-or-break behavioural assertions

```js
const SIM = require('../js/sim.js');

(function testDeterministicWorld() {
  function run() {
    const sim = E.makeSim(424242);
    sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
    sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
    sim.dropPrimer(60, 50);
    for (let t = 0; t < 200; t++) sim.tick();
    return sim.hash();
  }
  ok(run() === run(), 'same seed + same moves → identical world (determinism invariant)');
})();

(function testLiveBand() {
  const sim = E.makeSim(7);
  sim.addGenerator({ x: 60, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 16 });
  sim.addGenerator({ x: 100, y: 50, el: E.MIN, rate: 8, proj: 'radial', radius: 16 });
  sim.dropPrimer(60, 50); sim.dropPrimer(100, 50);
  let minAlive = Infinity, maxAlive = 0;
  for (let t = 0; t < 400; t++) { sim.tick(); const a = sim.stats().alive; minAlive = Math.min(minAlive, a); maxAlive = Math.max(maxAlive, a); }
  const end = sim.stats();
  ok(end.alive > 0, 'world does NOT collapse to nothing');
  ok(end.alive < 4000, 'world does NOT explode to the cap (goo)');
  ok(end.speciesApprox >= 2, 'diversity persists — at least two diets coexist (edge of chaos)');
})();
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Implement `sim.js`**

```js
;(function (root) {
  'use strict';
  const E = root.E = root.E || {};
  E.makeSim = function (seed) {
    const rng = E.makeRng(seed >>> 0);
    const field = E.makeField(E.makeRng((seed ^ 0x9e3779b9) >>> 0));
    const life = E.makeLife(E.makeRng((seed ^ 0x85ebca6b) >>> 0));
    const gens = [];
    function tick() {
      field.diffuse();
      E.depositGenerators(field, gens);
      life.step(field);
      E.fertilityStep(field, life, rng);
    }
    function addGenerator(g) { gens.push(g); }
    function dropPrimer(x, y) { return life.spawnFromPrimer(field, x | 0, y | 0); }
    function stats() {
      const live = life.list.filter(e => e.alive);
      const keys = new Set(live.map(e => e.diet.map(v => Math.round(v * 4)).join(',')));
      return { alive: live.length, speciesApprox: keys.size,
               fieldTotal: field.total(E.LUM) + field.total(E.MIN) + field.total(E.HUM) };
    }
    function hash() {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < field.el.length; i += 7) { h ^= Math.round(field.el[i] * 1000); h = Math.imul(h, 16777619) >>> 0; }
      for (const e of life.list) if (e.alive) { h ^= (e.x | 0) * 131 + (e.y | 0) + Math.round(e.biomass * 100); h = Math.imul(h, 16777619) >>> 0; }
      return h >>> 0;
    }
    return { field, life, gens, tick, addGenerator, dropPrimer, stats, hash,
             serialize() { return E.serializeSim(field, life, gens, seed); } };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

> **Tuning note (do not skip):** the live-band test is the heart of the proof. If it fails (collapse or explosion), tune `EAT/RETAIN/REPRO/UPKEEP` (life) and generator `rate` — this is the edge-of-chaos search the spec calls for. Record what band works in `DISCOVERIES.md`. Add `serializeSim` as a stub returning `{seed,gens, …}` now; Task 9 fills it.
>
> **TUNED (2026-06-25, first build):** the default scenario (two rate-8 radial generators) first exploded to the cap. Stable band found at `UPKEEP 0.15` (was 0.05; upkeep sets carrying capacity) + fertility `MAX_SPAWN 1` / prob factor `0.01` (was 3 / 0.02). Result: ~49 alive, 6 coexisting diets, deterministic, no collapse/explosion. The Task 6 replication unit test was enriched to `LUM 50` because that isolated test has no diffusion to refill the cell at the slower (higher-upkeep) growth rate.

- [ ] **Step 4: Run → PASS** (determinism + live band). Tune constants until the band test passes; commit the working values.
- [ ] **Step 5: Commit**

```bash
git add eddy/js/sim.js eddy/test/harness.js
git commit -m "feat(eddy): authoritative tick + live-band & determinism harness (the proof's spine)"
```

---

## Task 9: Persistence — serialize / localStorage round-trip

**Files:**
- Modify: `eddy/js/sim.js` (`E.serializeSim`, `E.deserializeSim`)
- Create: `eddy/js/persist.js`
- Modify: `eddy/test/harness.js`

**Interface:** `E.serializeSim(...)` → plain JSON-able object (seed, gens, field arrays as plain arrays, life list). `E.deserializeSim(obj)` → `{field, life, gens}` rebuilt. `E.Persist = { save(sim), load() }` wraps localStorage (guarded: `typeof localStorage !== 'undefined'`). Round-trip + load→tick determinism tested in Node (no localStorage needed for the serialize test).

- [ ] **Step 1: Failing test**

```js
(function testSerializeRoundTrip() {
  const sim = E.makeSim(11);
  sim.addGenerator({ x: 70, y: 50, el: E.LUM, rate: 8, proj: 'radial', radius: 14 });
  sim.dropPrimer(70, 50);
  for (let t = 0; t < 50; t++) sim.tick();
  const snap = sim.serialize();
  const h1 = sim.hash();
  const restored = E.deserializeSim(JSON.parse(JSON.stringify(snap)));
  let same = true;
  for (let i = 0; i < restored.field.el.length; i++) if (restored.field.el[i] !== sim.field.el[i]) { same = false; break; }
  ok(same, 'field survives serialize → deserialize exactly');
  ok(restored.life.list.filter(e=>e.alive).length === sim.life.list.filter(e=>e.alive).length, 'life count round-trips');
})();
```

- [ ] **Step 2: Run → FAIL. Step 3: Implement** `serializeSim`/`deserializeSim` in `sim.js` (copy typed arrays to/from plain arrays; rebuild `makeField`/`makeLife` then overwrite `el`/`variant`/`list`) and `persist.js` (localStorage `setItem`/`getItem` of `JSON.stringify(snap)` under key `eddy.save.v1`).

- [ ] **Step 4: Run → PASS. Step 5: Commit**

```bash
git add eddy/js/sim.js eddy/js/persist.js eddy/test/harness.js
git commit -m "feat(eddy): deterministic serialize + localStorage persistence (backend-swappable)"
```

---

## Task 10: Browser shell — index.html, WebGL2 bootstrap, RAF loop (pause/step)

**Files:**
- Create: `eddy/index.html`
- Create: `eddy/js/main.js`

> Browser tasks (10–15) are verified **manually** in a real browser (WebGL has no practical headless unit test here). Each step states exactly what to look for. Keep the Node harness green throughout — never import `render/ui/main` from it.

- [ ] **Step 1:** Write `index.html` — lowercase-serif aesthetic; a `<canvas id="gl">`; a `#toolbar` and `#inspector` DOM; ordered classic `<script>` tags: `rng, grid, field, generators, life, fertility, sim, persist, content, render, ui, main`.
- [ ] **Step 2:** Write `main.js` — get WebGL2 context (`canvas.getContext('webgl2')`; if null, show a message), `E.sim = E.makeSim(Date.now()>>>0)` (seed may be wall-clock here — this is the *app*, not the harness; the sim stays deterministic given a seed), then a RAF loop: if `playing`, `sim.tick()` at a fixed cadence (e.g. every frame, or every ~50ms accumulator); always `E.Render.draw(sim)`. Expose `space` = pause/play, `s` = single step when paused.
- [ ] **Step 3: Manual verify** — open `eddy/index.html`: canvas fills, no console errors, a turn counter advances while playing and freezes when paused; `s` advances one tick.
- [ ] **Step 4: Commit** `git add eddy/index.html eddy/js/main.js && git commit -m "feat(eddy): browser shell + webgl2 bootstrap + pause/step loop"`

---

## Task 11: Render I — the field as a GPU texture (world view + the "pixels" look)

**Files:**
- Create: `eddy/js/render.js`

- [ ] **Step 1:** Implement `E.Render.init(gl)` + `E.Render.draw(sim)`: upload the field as an `R32F`/`RGBA32F` texture sized `W×H` (pack lumen/mineral/humus into RGB of a float texture each frame from `sim.field.el`). Draw a fullscreen quad; fragment shader maps the element triple → color: hue from element proportions (lumen=gold, mineral=blue, humus=green), **vividness from local concentration/contrast** so a diffused flat field reads gray and concentrated gradients read vivid. Use `image-rendering: pixelated` feel via nearest sampling.

Fragment shader core (real code, not placeholder):
```glsl
#version 300 es
precision highp float;
in vec2 uv; out vec4 frag; uniform sampler2D field;
void main() {
  vec3 e = texture(field, uv).rgb;           // lumen, mineral, humus
  float t = e.r + e.g + e.b + 1e-4;
  vec3 p = e / t;                             // proportions
  vec3 gold = vec3(0.92,0.71,0.27), blue = vec3(0.27,0.55,0.85), green = vec3(0.35,0.69,0.33);
  vec3 hue = p.r*gold + p.g*blue + p.b*green;
  float dom = max(max(p.r,p.g),p.b);
  float sat = clamp((dom-0.333)/0.667, 0.0, 1.0);   // balanced → gray (disorder); dominant → vivid (order)
  vec3 gray = vec3(0.34);
  float bright = clamp(0.16 + 0.84*min(t,1.5)/1.5, 0.16, 1.0);
  frag = vec4(mix(gray, hue, sat) * bright, 1.0);
}
```

- [ ] **Step 2: Manual verify** — place no generators: field looks dim/gray and stays gray (entropy). With a generator (after Task 13) a colored gradient blooms and, if life is removed, slowly diffuses back toward gray.
- [ ] **Step 3: Commit** `git add eddy/js/render.js && git commit -m "feat(eddy): webgl2 field render — concentrated=vivid, diffuse=gray (entropy visible)"`

---

## Task 12: Render II — entities as distinct sprites above the field

**Files:**
- Modify: `eddy/js/render.js`

- [ ] **Step 1:** Add an instanced/point-sprite pass: one point per living entity at its `(x,y)`, sized > 1 field-pixel so it reads as a *thing*, colored by its `diet` (same hue map), with a dark rim so it sits above the substrate (depth = legibility, not height). Draw after the field pass.
- [ ] **Step 2: Manual verify** — after dropping a primer (Task 13), a distinct colored dot (then a spreading colony) is clearly visible above the field; lumen-eaters read gold, mineral-eaters blue, humus-eaters green.
- [ ] **Step 3: Commit** `git commit -am "feat(eddy): entity sprites — a world of distinct, readable things"`

---

## Task 13: UI — toolbar, place generator, drop primer, lens toggle

**Files:**
- Create: `eddy/js/ui.js`

- [ ] **Step 1:** Implement `E.UI.init(canvas, sim)`: a toolbar with tools `generator | primer | lens | play`. Canvas click maps pixel→cell. With `generator` active, click calls `sim.addGenerator({x,y,el:current,rate:8,proj:current,radius:16})` (a small element/projection selector chooses `el` and `radial|vein`). With `primer` active, click calls `sim.dropPrimer(x,y)`. `lens` toggles a render mode flag `E.Render.lens` between `'world'` and `'rawfield'` (raw shows the unmapped element channels). `play` toggles the loop's `playing`.
- [ ] **Step 2: Manual verify** — place a lumen generator (gradient blooms), drop a primer in it (a gold colony appears and consumes/spreads), place a second mineral generator overlapping the first and drop a primer in the overlap (a *different*, blend-diet entity appears — the combinatorial niche); toggle the lens.
- [ ] **Step 3: Commit** `git add eddy/js/ui.js && git commit -m "feat(eddy): toolbar — place generators, drop primers, toggle the lens"`

---

## Task 14: Inspector + the voice (content.js)

**Files:**
- Create: `eddy/js/content.js`
- Modify: `eddy/js/ui.js`

- [ ] **Step 1:** `content.js` — `E.Content.nameFor(diet, gen)` composes a procedural name from diet (e.g. dominant-element prefix + a suffix list, lowercase) so each entity reads as a named thing; and `E.Content.MURMURS` = a handful of **real, attributed** lines in the parent's voice (Boltzmann's "struggle for entropy," Schrödinger's "drinking orderliness," Prigogine's "order out of chaos," Schneider & Kay's dissipation line, plus one honest-AI line about gathering). Attribution on a second line, em-dash prefixed.
- [ ] **Step 2:** `ui.js` — clicking an entity (or its cell) opens the inspector showing: **name**, **eats** (top diet elements), **makes** (humus + behavior), **state** (thriving/starving from biomass trend), **why** (which nearby generator/element it adapted to), **gen/lineage**. Surface a murmur occasionally as a quiet line.
- [ ] **Step 3: Manual verify** — click any entity: you can read what it is, what it eats/makes, why it's that color, and its generation. The legibility test (spec §4.4.1) passes by eye.
- [ ] **Step 4: Commit** `git add eddy/js/content.js eddy/js/ui.js && git commit -m "feat(eddy): inspector + the murmurs — a world you can read, in the parent's voice"`

---

## Task 15: Persistence wiring + DISCOVERIES seed

**Files:**
- Modify: `eddy/js/main.js`
- Create: `eddy/DISCOVERIES.md`

- [ ] **Step 1:** In `main.js`, auto-save (`E.Persist.save(sim)`) every ~5s and on unload; on load, if a save exists, restore it (`E.deserializeSim`) else start fresh. Add a "new world" button that clears the save.
- [ ] **Step 2: Manual verify** — place some life, reload the page: the world is restored (same field + colonies).
- [ ] **Step 3:** Write `DISCOVERIES.md` opening (the lineage tradition: "a lab notebook for the autonomous loop… findings about the simulation's own behaviour, newest first") and the first entry: what live band the tuning landed on, and the first unscripted surprise observed (e.g. a humus-eater arising from a lumen-eater's waste).
- [ ] **Step 4: Commit** `git add eddy/js/main.js eddy/DISCOVERIES.md && git commit -m "feat(eddy): localStorage save/restore + DISCOVERIES lab-notebook opened"`

---

## Task 16: Prove it — tuning sweep + success-criteria checkpoint

**Files:**
- Modify: `eddy/test/harness.js` (add a small parameter sweep that prints alive/species over a few seeds)
- Modify: `eddy/DISCOVERIES.md`

- [ ] **Step 1:** Add a harness "dashboard" run: for 4 seeds, run 400 ticks with a standard two-generator setup and print `{seed, endAlive, peakSpecies, fieldTotalDrift}`. Assert all seeds end in the live band (alive>0, <cap, species≥2).
- [ ] **Step 2: Run** `node eddy/test/harness.js` — all green; the dashboard shows persistent diversity across seeds.
- [ ] **Step 3: Manual verify against spec §4.4** — by eye in the browser: **legible** (read anything), **causal** (trace a result to your move), **finite stakes** (a colony can outrun its source and crash), **surprise** (≥1 unscripted interaction — e.g. waste→second species, or an overlap-niche entity), **stable band**, **gut test** (fun; not a 2D CA). Record the verdict + any surprises in `DISCOVERIES.md`.
- [ ] **Step 4: Commit** `git add eddy/test/harness.js eddy/DISCOVERIES.md && git commit -m "test(eddy): edge-of-chaos sweep + success-criteria checkpoint — the loop proven"`

---

## Self-review (done)

- **Spec coverage:** finite material field + conserved diffusion (T2) · entropy-as-decay/gray (T2+T11) · one consume→produce primitive (T4–6) · generators finite-flow + range-delivery + radial/vein + additive interference (T3) · primer latch (T4) + ambient fertility (T7) · Mode-1 conservation: excretion + mineralization (T5–6) · legible entities + inspector (T12,T14) · one field lens (T13) · determinism + live-band harness (T8,T16) · WebGL2 render (T11–12) · localStorage/backend-ready persistence (T9,T15) · the one satisfying turn (T13 manual) · success criteria (T16) · lineage/voice (T14,T15) · its own dir, parent untouched (file structure). **Deferred per spec (NOT in plan, correctly):** compounds, Mode-2 accumulation, rules layer, multi-lens dashboards, big map/terraform, GPU-compute diffusion.
- **Placeholder scan:** none — every code step shows real code; browser tasks use explicit manual-verify criteria (WebGL is not headlessly unit-testable; this is a deliberate, stated choice, not a TODO).
- **Type consistency:** `E.makeField/makeLife/makeSim`, `field.get/add/total/diffuse`, `depositGenerators(field,gens)`, `life.spawnFromPrimer/step`, `fertilityStep(field,life,rng)`, entity `{x,y,diet,biomass,age,gen,alive,id}`, generator `{x,y,el,rate,proj,radius|angle|length}` — consistent across tasks.

**Open tuning risk (flagged):** the live-band constants (`EAT/RETAIN/REPRO/UPKEEP`, generator `rate`, `D`) are first guesses; Task 8/16 explicitly tune them to the edge-of-chaos band and record the result. This is expected work, not a defect.
