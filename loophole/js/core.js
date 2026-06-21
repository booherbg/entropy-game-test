/* LOOPHOLE — core engine.
   DOM-free: runs in browser and node alike. All gameplay randomness flows
   through one seeded stream so a run is reproducible from (seed, actions). */
(function () {
  'use strict';
  const LP = globalThis.LP || (globalThis.LP = {});
  LP.VERSION = '0.2.0';
  LP.SAVE_V = 3; /* v3: cell entropy (c.e/eMin) and the sim's other floats stored at FULL precision, not
                    quantized — so save→load is exact, not a chaotically-divergent approximation. v2 still loads. */

  /* ───────────────────────── utils ───────────────────────── */
  const U = LP.U = {
    clamp: (x, a, b) => x < a ? a : (x > b ? b : x),
    lerp: (a, b, t) => a + (b - a) * t,
    hash32(str) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },
  };

  /* mulberry32 with exposed state (serializable) */
  class RNG {
    constructor(seed) { this.s = (typeof seed === 'string' ? U.hash32(seed) : seed) >>> 0; }
    f() {
      this.s = (this.s + 0x6D2B79F5) >>> 0;
      let t = this.s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    i(n) { return Math.floor(this.f() * n); }
    range(a, b) { return a + this.f() * (b - a); }
    chance(p) { return this.f() < p; }
    pick(arr) { return arr[this.i(arr.length)]; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = this.i(i + 1);
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  }
  LP.RNG = RNG;

  /* ───────────────────────── hex grid (axial, pointy-top) ───────────────────────── */
  const HEX = LP.HEX = {
    DIRS: [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]],
    key: (q, r) => q + ',' + r,
    parse(k) { const i = k.indexOf(','); return [+k.slice(0, i), +k.slice(i + 1)]; },
    dist: (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2,
    dist2(q1, r1, q2, r2) { return HEX.dist(q1 - q2, r1 - r2); },
    neighborsK(k) {
      const [q, r] = HEX.parse(k);
      return HEX.DIRS.map(d => HEX.key(q + d[0], r + d[1]));
    },
    coordsWithin(R) {
      const out = [];
      for (let q = -R; q <= R; q++)
        for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++)
          out.push([q, r]);
      return out;
    },
    ring(R) {
      if (R === 0) return [[0, 0]];
      const out = [];
      let q = -R, r = R; // start at direction 4 corner
      for (let side = 0; side < 6; side++)
        for (let step = 0; step < R; step++) {
          out.push([q, r]);
          q += HEX.DIRS[side][0]; r += HEX.DIRS[side][1];
        }
      return out;
    },
    /* all keys within dist d of (q,r) */
    disk(q, r, d) {
      const out = [];
      for (let dq = -d; dq <= d; dq++)
        for (let dr = Math.max(-d, -dq - d); dr <= Math.min(d, -dq + d); dr++)
          out.push(HEX.key(q + dq, r + dr));
      return out;
    },
  };

  /* ───────── the ecology layer: elements, flora, emergence ─────────
     resources are a 3-vector — lumen / mineral / humus (energy / structure /
     decay). a producer emits a blend; an UNEATEN surplus is a niche; a niche
     speciates a flora whose traits derive from it (fast natural selection).
     deterministic (one rng stream), browser-light (small vectors), capped.
     see docs/2026-06-17-loophole-emergence-engine.md + -foundations.md. */
  const PROD_BLEND = { moss: [1, 0, 0], ant: [0, 0, 1], crys: [0, 1, 0] };
  const ELEM_PRODUCER = ['moss', 'crys', 'ant'];      /* which pattern makes channel e */
  const ELEM_RGB = [[212, 232, 120], [120, 200, 236], [206, 122, 212]]; /* the colour of each element */
  const FLORA_PRE = [
    ['sun', 'dawn', 'ember', 'gold', 'flare', 'lumen', 'glow', 'sol'],   /* lumen-eaters */
    ['flint', 'slate', 'quartz', 'iron', 'bone', 'stone', 'frost', 'shale'], /* mineral-eaters */
    ['peat', 'rot', 'mire', 'dusk', 'ash', 'umbra', 'fen', 'loam'],      /* humus-eaters */
  ];
  const FLORA_SUF = ['bloom', 'petal', 'crown', 'bell', 'wort', 'spire', 'thorn', 'veil', 'lace', 'fern', 'star', 'cup'];
  function floraColor(bl) {
    let r = 0, g = 0, b = 0; const s = (bl[0] + bl[1] + bl[2]) || 1;
    for (let e = 0; e < 3; e++) { const w = bl[e] / s; r += ELEM_RGB[e][0] * w; g += ELEM_RGB[e][1] * w; b += ELEM_RGB[e][2] * w; }
    const hx = n => ('0' + (Math.round(n) & 255).toString(16)).slice(-2);
    return '#' + hx(r) + hx(g) + hx(b);
  }

  /* ───────── megafauna: the next trophic level ─────────
     a RICH MEADOW (many established flora) is itself a surplus — of LIFE. it summons a
     grazing beast that roams the meadow eating flora, and lives only while the meadow feeds
     it (a dissipative structure: it adapts to the surplus and depends on it). it grazes one
     flower at a time (donor-controlled — no annihilation), the non-collapsing predator-prey
     of the foundations doc. fauna are mobile agents (a separate list), not rooted patterns. */
  const FAUNA_SUF = ['grazer', 'strider', 'aurochs', 'elk', 'roan', 'lumberer', 'browser', 'wallow', 'horn', 'pacer'];
  /* a meadow rich AND varied enough summons not a consumer but a MUTUALIST — a pollinator that
     feeds on nectar and, in the same visit, carries a flower's kind into open ground. Margulis:
     "life did not take over the globe by combat, but by networking." the food web's positive-sum
     half — these are airy, light names, never the heavy grazer ones. */
  const FAUNA_POLLEN_SUF = ['drifter', 'sipper', 'flitter', 'mote', 'wisp', 'dancer', 'hummer', 'flutter'];
  /* SYMBIOGENESIS (Margulis's actual radical claim): a grazer and the flora it has grazed-and-fed
     long enough do not stay two — they MERGE. the eukaryotic cell is the fossil of such a union: a
     host that took in a free-living bacterium and never let go (mitochondria ← α-proteobacteria;
     chloroplasts ← cyanobacteria). here the combat becomes the network — the consumer internalises
     its producer and lies down as a sessile self-feeder: a CORAL (a cnidarian polyp wedded to its
     zooxanthellae), a zoöphyte, an "animal-plant." a compound KIND with a capability neither parent
     had — it makes its own food, so it stops depleting the meadow, and it BUILDS habitat (reef).
     "life did not take over the globe by combat, but by networking" — taken to its conclusion.
     these are union names — never the heavy grazer's, never the airy pollinator's. */
  const FAUNA_MERGE_SUF = ['coral', 'reef', 'zoophyte', 'chimera', 'meld', 'commons', 'polypary', 'symbiont'];
  /* the union's terms. BOND: diet-grazes of its OWN kind before a grazer is ready to merge (a long
     relationship, not a chance meeting). AGE: it must be mature. SP_CAP: a compound is a rare, sacred
     event — only a few unions hold at once. WIDEN: the emergent tolerance — the compound's entropy
     band is wider than either parent's (lichen colonising bare rock). REEF: a compound constructs
     habitat harder than an ordinary bed — coral building the reef that shelters the others. */
  const MERGE = { YOUTH: 20, YOUTH_FEAR: 8, BOND: 14, SP_CAP: 3, FEAR_CAP: 2, WIDEN: 0.12, REEF: 0.042 };
  /* PREDATION — the top-down counterpart to the bottom-up summoning chain. An abundance of GRAZERS (a
     herd) summons an APEX: a keystone culler that hunts the herd. The same hard-won NON-COLLAPSE
     discipline as grazing, one trophic level up — donor-controlled (one kill per satiety), refuge-bounded
     (never the last of the herd; the prey persists), dissipative (it starves without prey). It keeps the
     herd in check, so the web does not settle into a dead fixed point — predator & prey cycle (the
     lynx-hare oscillation, bounded). These are sharp, dark, hunting names — never prey names. */
  const FAUNA_PRED_SUF = ['stalker', 'culler', 'reaver', 'shrike', 'lurker', 'prowler', 'harrier', 'raptor'];
  const PRED = { THRESH: 3, SUSTAIN: 4, NEED: 6, REFUGE: 2, CAP: 3, STARVE: 18, BREED: 14 };

  /* ───────────────────────── game ───────────────────────── */
  class Game {
    /* opts: {ascension, echoCount, blank} */
    constructor(seed, opts) {
      opts = opts || {};
      this.seed = String(seed == null ? 'loophole' : seed);
      this.asc = opts.ascension || 0;
      this.mode = opts.mode || 'garden'; /* 'garden' (awaken) | 'longgame' (flourish by turn 100) */
      this.rng = new RNG(this.seed + '|world');
      this.turn = 1;
      this.stage = 1;
      this.order = 12;
      this.carry = 0;
      this.lowStreak = 0;
      this.finds = 0;
      this.tendsThisTurn = 0;
      this.echoOwned = new Set(opts.echoes || []);
      this.echoesThisRun = 0;
      this.widenReady = false;
      this.turnsInStage = 0;
      this.insight = 0;        /* evolution currency */
      this.insightFrac = 0;    /* heat condenses into insight slowly */
      this.evolutions = [];
      this.over = false;
      this.won = false;
      this.awakened = false;
      this.cells = new Map();
      this.artifacts = [];
      this.pendingOffer = null;
      this.pendingLegend = null;   /* a legendary you may claim by spending insight */
      this.legendsBought = 0;      /* each purchase escalates the next legendary's price */
      this.legendDiscount = 0;     /* relic fragments foragers dig up, off the next legendary */
      this.species = new Map();    /* id -> emergent flora species (summoned by surplus) */
      this.nextSpecies = 1;
      this.surplusRun = [0, 0, 0]; /* sustained per-channel surplus → opens a niche */
      this.elemProd = [0, 0, 0];   /* last element production vector (display) */
      this.fauna = [];             /* roaming megafauna agents { id, spId, q, r, age, hunger } */
      this.faunaSpecies = new Map();
      this.nextFauna = 1;
      this.faunaRun = 0;           /* sustained meadow-richness → opens a fauna niche */
      this.predRun = 0;            /* sustained grazer-herd abundance → opens an apex (predator) niche */
      this.onenessRun = 0;         /* sustained cooperative-climax → the meadow is recognised as ONE */
      this.autocatRun = 0;         /* sustained metabolic closure → the meadow's flora feed each other (Kauffman) */
      this.firedOcc = {};
      this.stormI = 0;
      this.stormQueue = [];
      this.blight = new Map();   /* cell key -> { kind, hp, age } */
      this.blightQueue = [];
      this.blightI = 0;
      this.history = [];
      this.aura = new Map();
      this.networks = [];
      this.netOf = new Map();
      this.stats = {
        planted: {}, tends: 0, prunes: 0, deaths: 0, eaten: 0, blooms: 0,
        cascadeBest: 0, netBest: 0, frondMaxed: 0, stormsSeen: 0,
        peakC: 0, spent: 0, income: 0,
      };
      this.series = []; /* per-turn [turn, coherence‰, order, patterns, blight] for the graph */
      if (!opts.blank) this._init();
    }

    get C() { return LP.CONTENT; }

    _init() {
      this._genTerra();
      const R = this.C.STAGES[0].radius;
      this.radius = R;
      for (const [q, r] of HEX.coordsWithin(R)) {
        this.cells.set(HEX.key(q, r), this._mkCellAt(q, r));
      }
      /* squall schedule for the whole run */
      let t = 9;
      while (t < 240) {
        this.stormQueue.push({
          turn: t, u: this.rng.f(),
          radius: 1 + Math.floor(t / 45),
          power: 0.20 + this.rng.f() * 0.10,
        });
        t += 6 + this.rng.i(6);
      }
      /* blight schedule — the decay that growth attracts. only bites from symbiosis (stage 3) on. */
      let bt = 15;
      while (bt < 240) {
        this.blightQueue.push({ turn: bt, u: this.rng.f(), wisp: this.rng.f() });
        bt += 7 + this.rng.i(5);
      }
      this._recompute();
    }

    /* clustered biomes via jittered voronoi seeds — deterministic, and
       continuous so rings added on widening inherit the same landscape */
    _genTerra() {
      this.terra = [];
      const R = 9;
      const palette = ['loam', 'loam', 'loam', 'wetland', 'stone', 'meadow', 'ash'];
      const n = 7 + this.rng.i(4);
      const present = new Set();
      for (let i = 0; i < n; i++) {
        const q = this.rng.i(2 * R + 1) - R, r = this.rng.i(2 * R + 1) - R;
        let b = this.rng.pick(palette);
        if (HEX.dist(q, r) < 3 && b === 'ash') b = 'meadow'; /* the burnt edge stays an edge */
        this.terra.push({ q, r, b });
        present.add(b);
      }
      /* guarantee the land has texture: at least one lush and one hard biome */
      if (!present.has('wetland')) this.terra.push({ q: this.rng.i(13) - 6, r: this.rng.i(13) - 6, b: 'wetland' });
      if (!present.has('stone')) this.terra.push({ q: this.rng.i(13) - 6, r: this.rng.i(13) - 6, b: 'stone' });
    }

    soilAt(q, r) {
      let best = 'loam', bd = 1e9;
      for (const s of this.terra) {
        const jitter = (U.hash32(s.q + '_' + s.r + ':' + q + '_' + r) % 1000) / 1000 * 1.4;
        const d = HEX.dist2(q, r, s.q, s.r) + jitter;
        if (d < bd) { bd = d; best = s.b; }
      }
      return best;
    }

    _mkCellAt(q, r) {
      const soil = this.soilAt(q, r);
      const d = HEX.dist(q, r) / Math.max(1, this.radius);
      const noise = (U.hash32('e:' + q + '_' + r + this.seed) % 1000) / 1000 - 0.5;
      const e = U.clamp(0.44 + 0.24 * d + this.C.soilMul(soil, 'e0') + noise * 0.16 + this.rng.range(-0.03, 0.03), 0.16, 0.96);
      return this._mkCell(q, r, e, soil);
    }

    _mkCell(q, r, e, soil) { return { q, r, e, eMin: e, pat: null, trail: 0, soil: soil || 'loam' }; }
    soilMul(c, key) { return this.C.soilMul(c.soil, key); }

    /* the placement puzzle: a pattern's income scales with its neighbors */
    _synergy(c) {
      if (!c.pat) return 1;
      const tbl = this.C.SYNERGY[c.pat.t];
      if (!tbl) return 1;
      let s = 0;
      for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
        const cc = this.cells.get(k);
        if (cc && cc.pat && tbl[cc.pat.t] != null) s += tbl[cc.pat.t];
      }
      return U.clamp(1 + s, 0.4, 2.6);
    }

    /* ── modifier pipeline: artifacts and evolutions both feed it ── */
    mod(key, base) {
      let add = 0, mul = 1;
      const apply = m => {
        if (!m) return;
        if (m.add && m.add[key] != null) add += m.add[key];
        if (m.mul && m.mul[key] != null) mul *= m.mul[key];
      };
      for (const a of this.artifacts) apply(a.mods);
      for (const id of this.evolutions) { const e = this.C.EVOLUTIONS[id]; if (e) apply(e.mods); }
      return (base + add) * mul;
    }
    flag(key) { return this.mod(key, 0) > 0; }

    emit(name, payload, events) {
      for (const a of this.artifacts)
        if (a.hooks && a.hooks[name]) a.hooks[name](this, payload, events || []);
    }

    coherence() {
      let s = 0;
      for (const c of this.cells.values()) s += 1 - c.e;
      return s / this.cells.size;
    }
    /* tomorrow's seep, before life acts — what Laplace's Lens shows */
    predictE(k) {
      const c = this.cells.get(k);
      if (!c) return 0;
      let nSum = 0, nCnt = 0;
      for (const nk of HEX.neighborsK(k)) {
        const nc = this.cells.get(nk);
        nSum += nc ? nc.e : 1; nCnt++;
      }
      const aura = this.aura.get(k) || 1;
      let flow = 0.16 * (nSum / nCnt - c.e);
      if (flow > 0) flow *= aura;
      let press = this.pressure() * aura;
      if (c.trail) press *= 0.7;
      return U.clamp(c.e + flow + press, 0, 1);
    }
    target() {
      const t = this.C.STAGES[this.stage - 1].target;
      return t == null ? null : t + 0.012 * this.asc;
    }
    pressure() {
      /* lingering in a stage lets the dark grow impatient — a gentle stall clock */
      const creep = U.clamp((this.turnsInStage - 12) * 0.0004, 0, 0.010);
      const base = this.mod('pressure', this.C.STAGES[this.stage - 1].pressure) + creep;
      /* the second law bills you for the order you hold: a richer garden has a steeper
         gradient to the surrounding dark, so it seeps faster. this is what stops a built
         garden from coasting on idle — its own order pulls the dark in harder. */
      const C = this._cohCache != null ? this._cohCache : this.coherence();
      const slope = 1 + 1.5 * C * this.mod('orderSeep', 1);
      return base * slope * (1 + 0.12 * this.asc);
    }
    baseIncome() {
      return this.mod('baseIncome', this.C.STAGES[this.stage - 1].base);
    }

    /* ─────────────────── the metabolism ───────────────────
       order is capital; SAP is the living flow. producers make sap, mycelium
       routes it, consumers burn it — fed life pays order, starved life wilts.
       a static garden cannot coast: producers need a gradient (idle cleaning
       removes it) and consumers need continuous supply. */
    _sap(c) {
      const p = c.pat;
      if (!p) return null;
      const k = HEX.key(c.q, c.r);
      switch (p.t) {
        case 'moss': {
          if (p.age < 3) return { prod: 0, up: 0, out: 0, role: 'grid' };
          /* mature moss always trickles a little sap; on a gradient it makes much more */
          let grad = false;
          for (const nk of HEX.neighborsK(k)) { const nc = this.cells.get(nk); if (!nc || nc.e >= 0.3) { grad = true; break; } }
          const prod = (0.2 + (grad ? 0.35 : 0)) * this.mod('mossIncome', 1) * this.soilMul(c, 'moss') * this._synergy(c);
          return { prod, up: 0, out: 0, role: 'producer' };
        }
        /* a living colony stores food (a steady trickle), plus what it eats this turn */
        case 'ant': return { prod: (0.25 + (p.pop || 0) * 0.015 + (p.lastEaten || 0) * 6) * this._synergy(c), up: 0, out: 0, role: 'producer' };
        /* the crystal is order without hunger — a steady sap battery, anywhere, forever */
        case 'crys': return { prod: 1.8 * this.mod('crysSap', 1), up: 0, out: 0, role: 'producer' };
        case 'frond': return { prod: 0, up: 0.4 + p.depth * 0.3, out: 0.34 * (p.depth * (p.depth + 1) / 2) * this.mod('frondIncome', 1) * this.soilMul(c, 'frond') * this._synergy(c), role: 'consumer' };
        /* a living, fed blossom pays a small steady order — a bed of wildflowers is worth
           keeping, not just a one-turn cascade trick (it used to yield nothing once born). */
        case 'bloom': return { prod: 0, up: 0.45, out: (0.18 + 0.02 * Math.min(p.age || 0, 8)) * this.mod('bloomOut', 1) * this._synergy(c), role: 'consumer' };
        case 'heart': { const net = this.netOf.get(k); return { prod: 0, up: 4, out: (net ? net.cells.size : 1) / 5 * this.mod('heartIncome', 1), role: 'consumer' }; }
        case 'myc': return { prod: 0, up: 0.2, out: 0, role: 'grid' };
        /* flora run on the ELEMENT economy (see _ecology), not the scalar sap one —
           they're invisible to it so the base metabolism stays exactly as it was */
        case 'flora': return { prod: 0, up: 0, out: 0, role: 'flora' };
      }
      return { prod: 0, up: 0, out: 0, role: 'grid' };
    }

    /* pure: tag each pattern with its sap stats + fed ratio (for income & display).
       a small ambient floor keeps a lone consumer alive; real scarcity is at scale. */
    _computeFlows() {
      const ambient = this.mod('ambientSap', 0.9);
      const seen = new Set();
      for (const n of this.networks) {
        let prod = 0, up = 0;
        for (const k of n.cells) { const c = this.cells.get(k); if (!c || !c.pat) continue; const s = this._sap(c); c.pat._s = s; prod += s.prod; up += s.up; seen.add(k); }
        const fed = up > 0 ? U.clamp((prod + ambient) / up, 0, 1) : 1;
        n.prod = prod; n.upkeep = up; n.fedRatio = fed; n.surplus = Math.max(0, prod - up);
        for (const k of n.cells) { const c = this.cells.get(k); if (c && c.pat) c.pat.fed = fed; }
      }
      for (const c of this._patternCells()) {
        const k = HEX.key(c.q, c.r);
        if (seen.has(k)) continue;
        const s = this._sap(c); c.pat._s = s;
        let local = s.prod; /* its own + neighbours' production reaches an unnetworked cell */
        for (const nk of HEX.neighborsK(k)) { const nc = this.cells.get(nk); if (nc && nc.pat) local += this._sap(nc).prod; }
        c.pat.fed = s.up > 0 ? U.clamp((local + ambient) / s.up, 0, 1) : 1;
      }
      let tp = 0, tu = 0;
      for (const c of this.cells.values()) if (c.pat && c.pat._s) { tp += c.pat._s.prod; tu += c.pat._s.up; }
      this.sapProduced = tp; this.sapUpkeep = tu;
    }

    _metabolism(ev) {
      this._computeFlows();
      let income = this.baseIncome();
      const conv = 0.55;
      const seen = new Set();
      for (const n of this.networks) {
        income += n.surplus * conv;
        for (const k of n.cells) {
          const c = this.cells.get(k); if (!c || !c.pat) continue; seen.add(k);
          income += (c.pat._s.out || 0) * n.fedRatio;
          if (n.fedRatio < 0.5 && c.pat._s.up > 0) this._wilt(c, ev);
        }
      }
      for (const c of this._patternCells()) {
        const k = HEX.key(c.q, c.r);
        if (seen.has(k)) continue;
        const s = c.pat._s, fed = c.pat.fed;
        income += Math.max(0, s.prod - s.up) * conv * 0.55; /* unnetworked surplus is lossy */
        income += (s.out || 0) * fed;
        if (fed < 0.5 && s.up > 0) this._wilt(c, ev);
      }
      return income + (this._turnBonus || 0);
    }

    /* ── the ecology: surplus → niche → flora; the emergence layer ──
       runs after the metabolism (needs _s.prod). returns a token order from fed
       flora (kept tiny in v1 so the base economy is untouched). deterministic. */
    _ecology(ev) {
      /* the ecology lives in the long game — the base "garden" (awaken) stays pristine and
         debuggable. emergence is what the long game is FOR. */
      if (this.mode !== 'longgame') return 0;
      const EAT = 0.6, YIELD = 0.06, EXCR = 0.5, THRESH = 1.2, SUSTAIN = 3,
        SP_CAP = 10, FLORA_CAP = 60, SETTLE_MIN = 3;
      /* 1. element production from producers (by blend) + last-turn flora excretion */
      const prod = [0, 0, 0];
      for (const c of this._patternCells()) {
        const b = PROD_BLEND[c.pat.t];
        if (b && c.pat._s && c.pat._s.prod > 0) for (let e = 0; e < 3; e++) prod[e] += b[e] * c.pat._s.prod;
      }
      let flora = this._patternCells('flora');
      /* a fed flora excretes into another channel — an established bed processes far more
         than a pioneer, so a mature meadow genuinely manufactures the NEXT niche. this is
         what lets the food web self-extend (Kauffman's autocatalytic closure), not just the
         player's producers opening every niche. */
      for (const c of flora) { const sp = this.species.get(c.pat.sp); if (sp && c.pat.fedOk) prod[sp.ex] += c.pat.est ? EXCR * 1.7 : EXCR * 0.5; }
      this.elemProd = prod;

      /* 2. feeding by carrying capacity, per channel (established & older survive first) */
      const byCh = [[], [], []];
      for (const c of flora) { const sp = this.species.get(c.pat.sp); if (sp) byCh[sp.ch].push(c); else this._killFlora(c); }
      let floraIncome = 0;
      const surplus = [0, 0, 0];
      for (let e = 0; e < 3; e++) {
        const cells = byCh[e];
        const cap = Math.floor(prod[e] / EAT);
        cells.sort((a, b) => (b.pat.est - a.pat.est) || (b.pat.age - a.pat.age) || (a.q - b.q) || (a.r - b.r));
        cells.forEach((c, i) => { c.pat.fedOk = i < cap; if (c.pat.fedOk) floraIncome += YIELD; });
        surplus[e] = Math.max(0, prod[e] - cells.length * EAT);
      }

      /* 3. step each flora: age, establish, starve, spread (succession — survivors root) */
      const totalFlora = flora.length;
      for (const c of flora) {
        const sp = this.species.get(c.pat.sp); if (!sp) { this._killFlora(c); continue; }
        c.pat.age++;
        if (c.pat.age >= sp.settle) c.pat.est = 1;
        const eOk = c.e >= sp.eLo && c.e <= sp.eHi;
        if (c.pat.est) {
          /* niche construction: an established bed shapes its ground toward what it needs
             (Holland / Odling-Smee — the organism builds its own habitat), so a bed can
             stabilise and spread into ground that was, at first, too wild or too tame for it */
          const mid = (sp.eLo + sp.eHi) / 2, d = mid - c.e;
          if (d) c.e = U.clamp(c.e + (d > 0 ? 1 : -1) * Math.min(0.035, Math.abs(d)), 0, 1);
          /* it also EXTENDS the habitat — gently pulling its empty neighbours toward its band,
             so the bed makes the ground around it livable and can spread into it (this is what
             finally lets beds grow, instead of a lone flower stuck on its one calm cell) */
          const ext = sp.compound ? MERGE.REEF : 0.022; /* a compound builds REEF — it terraforms a habitable patch harder than an ordinary bed */
          for (const nk of HEX.neighborsK(HEX.key(c.q, c.r))) {
            const nc = this.cells.get(nk);
            if (nc && !nc.pat) { const dd = mid - nc.e; if (dd) nc.e = U.clamp(nc.e + (dd > 0 ? 1 : -1) * Math.min(ext, Math.abs(dd)), 0, 1); }
          }
          const eOk2 = c.e >= sp.eLo && c.e <= sp.eHi;
          if (!eOk2) { c.pat.starve = (c.pat.starve || 0) + 1; if (c.pat.starve >= 8) { this._killFlora(c); continue; } }
          else c.pat.starve = 0;
          if (c.pat.fedOk && totalFlora < FLORA_CAP && this.rng.chance(sp.spread)) this._floraSpread(c, sp, ev);
        } else {
          /* a pioneer lives or dies by the conditions that summoned it */
          if (!c.pat.fedOk || !eOk) { c.pat.starve = (c.pat.starve || 0) + 1; if (c.pat.starve >= 2) { this._killFlora(c); continue; } }
          else c.pat.starve = 0;
        }
      }

      /* 4. extinction: a seeded species with no living cell is gone — to the journal */
      const alive = new Set(this._patternCells('flora').map(c => c.pat.sp));
      for (const id of [...this.species.keys()]) {
        const sp = this.species.get(id);
        if (sp.seeded && !alive.has(id)) { this.species.delete(id); ev.push({ t: 'extinct', name: sp.name, color: sp.color }); }
      }

      /* 5. speciation: a sustained, UNEXPLOITED surplus opens a niche and summons a flora */
      const liveCount = this._patternCells('flora').length;
      for (let e = 0; e < 3; e++) {
        /* a channel can hold up to 2 distinct species — but the 2nd needs a genuinely
           larger surplus (THRESH × (1+already)). lets a flooded channel host diversity
           without monoculture, and keeps the ceiling honest. */
        const spHere = new Set(byCh[e].filter(c => c.pat).map(c => c.pat.sp)).size; /* some byCh cells were culled in step 3 */
        const open = spHere < 2 && surplus[e] > THRESH * (1 + spHere);
        if (open) this.surplusRun[e]++; else this.surplusRun[e] = 0;
        if (this.surplusRun[e] >= SUSTAIN && this.species.size < SP_CAP && liveCount < FLORA_CAP) {
          this._speciate(e, surplus, ev); this.surplusRun[e] = 0;
        }
      }
      return floraIncome;
    }
    _killFlora(c) { c.pat = null; }
    _floraSpread(c, sp, ev) {
      /* niche saturation: a species fills its bed, then stops — leaving ground (and
         surplus) for other species. this is what keeps the world diverse, not monoculture. */
      let own = 0; for (const x of this.cells.values()) if (x.pat && x.pat.t === 'flora' && x.pat.sp === sp.id) own++;
      if (own >= (sp.maxBed || 12)) return;
      const opts = []; /* spread into a margin around the band — the new cell gets pulled in */
      for (const nk of HEX.neighborsK(HEX.key(c.q, c.r))) {
        const nc = this.cells.get(nk);
        if (nc && !nc.pat && nc.e >= sp.eLo - 0.18 && nc.e <= sp.eHi + 0.18) opts.push(nc);
      }
      if (!opts.length) return;
      opts.sort((a, b) => (a.q - b.q) || (a.r - b.r));
      const tgt = opts[this.rng.i(opts.length)];
      tgt.pat = this._mkPat('flora'); tgt.pat.sp = sp.id;
      ev.push({ t: 'floraGrow', k: HEX.key(tgt.q, tgt.r), color: sp.color });
    }
    _speciate(ch, surplus, ev) {
      const id = this.nextSpecies++;
      /* the diet is the actual SHAPE of the surplus that opened the niche — a continuous
         blend, so two niches never make quite the same flower (not a 3-way bucket). the
         triggering channel leads; a seeded trace lets siblings of one channel still differ. */
      const mag = (surplus[0] + surplus[1] + surplus[2]) || 1;
      const bl = [surplus[0] / mag, surplus[1] / mag, surplus[2] / mag];
      bl[ch] = Math.max(bl[ch], 0.5);
      bl[(ch + 1 + this.rng.i(2)) % 3] += this.rng.f() * 0.18;
      const s2 = bl[0] + bl[1] + bl[2]; bl[0] /= s2; bl[1] /= s2; bl[2] /= s2;
      const ex = (ch + 1 + this.rng.i(2)) % 3;
      const name = FLORA_PRE[ch][this.rng.i(FLORA_PRE[ch].length)] + FLORA_SUF[this.rng.i(FLORA_SUF.length)];
      /* the entropy band it loves follows its diet: light→calm, rot→wild — continuous from the blend */
      const center = 0.22 * bl[0] + 0.38 * bl[1] + 0.55 * bl[2];
      const w = 0.28 + this.rng.f() * 0.10; /* tolerance — wide enough to root, settle, and spread */
      const sp = {
        id, ch, ex, blend: bl, color: floraColor(bl), name,
        settle: 3 + this.rng.i(4), spread: 0.45 + this.rng.f() * 0.30,
        maxBed: 8 + this.rng.i(10), /* the size its niche saturates at */
        eLo: Math.max(0, center - w), eHi: Math.min(1, center + w),
        born: this.turn, seeded: false,
      };
      this.species.set(id, sp);
      const spot = this._floraSeedSpot(ch, sp);
      if (spot) { spot.pat = this._mkPat('flora'); spot.pat.sp = id; sp.seeded = true; ev.push({ t: 'species', name: sp.name, color: sp.color, ch, diet: ['light', 'stone', 'rot'][ch], k: HEX.key(spot.q, spot.r) }); }
      else this.species.delete(id); /* nowhere to root yet — stillborn */
    }
    _floraSeedSpot(ch, sp) {
      const producer = ELEM_PRODUCER[ch];
      const near = [], frontier = []; /* prefer beside the element's maker, else any inhabited edge */
      for (const c of this.cells.values()) {
        if (c.pat || c.e < sp.eLo || c.e > sp.eHi) continue;
        let byProducer = false, byAny = false, room = 0;
        for (const nk of HEX.neighborsK(HEX.key(c.q, c.r))) {
          const nc = this.cells.get(nk); if (!nc) continue;
          if (!nc.pat) { room++; continue; }
          byAny = true; if (nc.pat.t === producer) byProducer = true;
        }
        const cand = { c, room };
        if (byProducer) near.push(cand); else if (byAny) frontier.push(cand);
      }
      const pool = near.length ? near : frontier;
      if (!pool.length) return null;
      /* prefer a spot with ROOM to grow — a flower boxed in by patterns can never become a
         bed. (deterministic: roomiest first, then position.) */
      pool.sort((a, b) => (b.room - a.room) || (a.c.q - b.c.q) || (a.c.r - b.c.r));
      const top = pool.filter(x => x.room >= pool[0].room - 1);
      return top[this.rng.i(top.length)].c;
    }

    /* ── megafauna: a rich meadow summons a beast that grazes it and depends on it ── */
    _fauna(ev) {
      if (this.mode !== 'longgame') return;
      const FA_THRESH = 8, FA_SUSTAIN = 4, FA_SP_CAP = 4, FA_CAP = 8, STARVE = 14, BREED = 16, GRAZE_NEED = 4, REFUGE = 6, FLORA_CAP = 60, POLLEN = 0.5, DIET_REFUGE = 2;
      let floraCount = this._patternCells('flora').length; /* a refuge: beasts won't graze the meadow below this — the prey is never eaten to nothing (decremented as they eat, so a whole HERD can't overshoot it in one turn on a stale count) */
      const estFlora = this._patternCells('flora').filter(c => c.pat.est);
      /* 1. a rich, diverse, LIVING meadow (much established flora, ≥2 species, AND actually producing —
         some fed flora) is a surplus of LIFE. the fed requirement is the coupling: a fossil scaffold of
         established-but-unfed beds (e.g. after the base is pulled) is standing-dead habitat — it must NOT
         keep birthing fauna, or the animal layer would float free of the base it depends on. */
      const fedEst = estFlora.filter(c => c.pat.fedOk);
      const diversity = new Set(estFlora.map(c => c.pat.sp)).size;
      if (estFlora.length >= FA_THRESH && fedEst.length >= 2 && diversity >= 2 && this.faunaSpecies.size < FA_SP_CAP && this.fauna.length < FA_CAP) {
        this.faunaRun++;
        if (this.faunaRun >= FA_SUSTAIN) { this._speciateFauna(estFlora, ev); this.faunaRun = 0; }
      } else this.faunaRun = 0;
      /* 1b. an APEX is summoned by an abundance of GRAZERS (its prey base) — the top of the web needs a
         herd beneath it, exactly as the herd needed a meadow. it specialises on the dominant grazer. */
      const grazers = this.fauna.filter(f => { const s = this.faunaSpecies.get(f.spId); return s && s.role === 'grazer'; });
      const hasPred = [...this.faunaSpecies.values()].some(s => s.role === 'predator');
      if (grazers.length >= PRED.THRESH && !hasPred) {
        this.predRun++;
        if (this.predRun >= PRED.SUSTAIN) { this._speciatePredator(grazers, ev); this.predRun = 0; }
      } else this.predRun = 0;
      /* 2. each beast roams toward flora, grazes one a turn (donor-controlled — no annihilation),
         and leaves droppings (humus); it starves if the meadow can no longer feed it */
      for (const f of this.fauna) {
        const sp = this.faunaSpecies.get(f.spId); if (!sp) { f.dead = 1; continue; }
        if (f.dead) continue; /* may have been culled by a predator earlier this same turn */
        f.age++; f.hunger++;
        if (sp.role === 'predator') { this._hunt(f, sp, ev); if (f.hunger > PRED.STARVE) f.dead = 1; continue; } /* the apex hunts the herd, not the meadow */
        let best = null, bestD = 1e9;
        for (const c of this._patternCells('flora')) {
          const d = HEX.dist2(f.q, f.r, c.q, c.r) - (c.pat.sp === sp.diet ? (sp.role === 'grazer' ? 6 : 0.5) : 0) - (sp.role === 'pollinator' && c.pat.fedOk ? 0.6 : 0); /* a grazer LOCKS onto its own diet — a specialist, the prelude to symbiosis; a pollinator just seeks nectar (a FED flower) */
          if (d < bestD) { bestD = d; best = c; }
        }
        if (best && HEX.dist2(f.q, f.r, best.q, best.r) <= 1) {
          if (sp.role === 'pollinator') {
            /* a MUTUALIST (Margulis: "life took over by networking, not combat"): it sips nectar —
               NEVER kills the flower — and in the same visit carries that flower's kind into open
               ground. positive-sum: the meadow it feeds on grows BECAUSE of it. no prey refuge —
               there is no prey. but NECTAR IS A PRODUCT OF PRIMARY PRODUCTION: only a FED flower
               makes it, so the mutualism is a powerful buffer yet still, at the last, tied to the
               base — pull every producer and the web unwinds with a long lag, not never. */
            if (f.hunger >= GRAZE_NEED && best.pat.fedOk) {
              f.hunger = 0; f.fedRun = (f.fedRun || 0) + 1;
              best.e = U.clamp(best.e + 0.03, 0, 1); /* a lighter touch than a grazer's droppings */
              const fsp = this.species.get(best.pat.sp);
              if (fsp && floraCount < FLORA_CAP && this.rng.chance(POLLEN)) this._floraSpread(best, fsp, ev); /* pollination → a new flower of the kind it visited */
              ev.push({ t: 'pollinate', k: HEX.key(best.q, best.r), color: sp.color });
              if (f.fedRun >= BREED && this.fauna.length < FA_CAP) {
                const bn = [...HEX.neighborsK(HEX.key(f.q, f.r))].filter(k => this.cells.has(k)).map(k => HEX.parse(k));
                const bp = bn.length ? bn[this.rng.i(bn.length)] : [f.q, f.r];
                this.fauna.push({ spId: f.spId, q: bp[0], r: bp[1], age: 0, hunger: 0, fedRun: 0 }); f.fedRun = 0; ev.push({ t: 'faunaBreed', k: HEX.key(f.q, f.r), color: sp.color });
              }
            }
          } else {
            /* a GRAZER: eats only when HUNGRY — to satiety then rests — so the meadow can keep up.
               one flower at a time (donor-controlled), never below the prey REFUGE. no annihilation. */
            const onDiet = best.pat.sp === sp.diet && best.pat.est; /* a specialist has LOCKED onto an established flower of its OWN co-evolved kind */
            const threat = this._threat(); /* is an apex stalking the herd? then FEAR drives the union */
            if (onDiet && f.age >= (threat ? MERGE.YOUTH_FEAR : MERGE.YOUTH)) {
              /* SYMBIOGENESIS — the bond is COHABITATION, not predation, and (in peace) only after a
                 grazing YOUTH (symbiosis is the advanced achievement, not the starting move — Margulis).
                 each turn a specialist lives beside its producer, the bond deepens (the symbiont is housed,
                 not eaten); long enough, and the last act of grazing becomes the first act of UNION.
                 but under PREDATION PRESSURE the grazer FLEES into union — it skips most of the youth and
                 bonds twice as fast, and the meadow tolerates more unions (a coral is immune to the
                 culler). combat DRIVES cooperation: the apex hunts its prey into the very form that
                 escapes it, and so engineers its own obsolescence. Margulis, taken all the way. */
              f.bond = (f.bond || 0) + (threat ? 2 : 1);
              if (best.pat.fedOk) f.hunger = Math.max(0, f.hunger - 2); /* the nascent symbiosis feeds it — but only off a PRODUCING partner (the symbiont photosynthesises): a proto-coral lives off the partner it houses, so it need not hunt to bond and does not eat the very flower it is becoming. on a dead base the partner cannot produce, so the bond no longer shields it from starvation — the union, too, is coupled to the base. */
              if (this._shouldMerge(f, sp)) { this._symbiogenesis(f, sp, best, ev); continue; }
            }
            if (f.hunger >= GRAZE_NEED && floraCount > REFUGE) {
              /* it forages a NEIGHBOURING flower — but never its own diet partner (the symbiont it is
                 coming to house). only if nothing else is in reach, and only above a refuge, does it
                 take its own kind — so the partnership it is bonding to is never eaten to nothing. */
              let food = null;
              for (const nk of HEX.neighborsK(HEX.key(f.q, f.r))) {
                const nc = this.cells.get(nk);
                if (nc && nc.pat && nc.pat.t === 'flora' && nc.pat.sp !== sp.diet && !(this.species.get(nc.pat.sp) || {}).compound) { food = nc; break; } /* never graze a coral — it is calcified reef, not a flower (and so the coral skeleton can outlast the polyps) */
              }
              if (!food && best.pat.sp === sp.diet && HEX.dist2(f.q, f.r, best.q, best.r) <= 1) {
                let dietEst = 0; for (const x of this.cells.values()) if (x.pat && x.pat.t === 'flora' && x.pat.sp === sp.diet && x.pat.est) dietEst++;
                if (dietEst > DIET_REFUGE) food = best; /* a last resort, and never below the partner's refuge */
              }
              if (food) {
                this._killFlora(food); floraCount--; f.hunger = 0; f.fedRun = (f.fedRun || 0) + 1;
                food.e = U.clamp(food.e + 0.05, 0, 1); /* droppings → humus, fertilising the cycle */
                ev.push({ t: 'graze', k: HEX.key(food.q, food.r), color: sp.color });
                if (f.fedRun >= BREED && this.fauna.length < FA_CAP) {
                  const bn = [...HEX.neighborsK(HEX.key(f.q, f.r))].filter(k => this.cells.has(k)).map(k => HEX.parse(k));
                  const bp = bn.length ? bn[this.rng.i(bn.length)] : [f.q, f.r]; /* the calf is born beside its parent, not on top of it */
                  this.fauna.push({ spId: f.spId, q: bp[0], r: bp[1], age: 0, hunger: 0, fedRun: 0 }); f.fedRun = 0; ev.push({ t: 'faunaBreed', k: HEX.key(f.q, f.r), color: sp.color });
                }
              }
            }
          }
        } else if (best) {
          /* herding (Reynolds): COHESION toward a blend of the nearest flora and the herd's
             centre, plus SEPARATION — a beast won't pile onto a herdmate's cell — so a kind of
             beast moves and grazes as a spread-out HERD, not a stack or scattered loners */
          let hx = 0, hy = 0, hn = 0; const occ = new Set();
          for (const o of this.fauna) if (o !== f && o.spId === f.spId) { hx += o.q; hy += o.r; hn++; occ.add(o.q + ',' + o.r); }
          let tq = best.q, tr = best.r;
          if (hn) { tq = best.q * 0.72 + (hx / hn) * 0.28; tr = best.r * 0.72 + (hy / hn) * 0.28; }
          const s = this._stepToward(f.q, f.r, tq, tr, occ); f.q = s.q; f.r = s.r;
        }
        if (f.hunger > STARVE) f.dead = 1;
      }
      /* 3. the dead pass; a species with no beasts left goes extinct, to the journal */
      if (this.fauna.some(f => f.dead)) this.fauna = this.fauna.filter(f => !f.dead);
      const alive = new Set(this.fauna.map(f => f.spId));
      for (const id of [...this.faunaSpecies.keys()]) {
        const sp = this.faunaSpecies.get(id);
        if (sp.seeded && !alive.has(id)) { this.faunaSpecies.delete(id); ev.push({ t: 'faunaGone', name: sp.name, color: sp.color }); }
      }
    }
    /* ── the meadow becomes ONE: the long game's quiet awakening ──
       when the food web has argued itself to a COOPERATIVE CLIMAX — a real community of unions (corals,
       the mergers), the combative consumers (grazers + apex) all but gone, richly diverse and sustained —
       the whole is recognised as a single living thing: a Gaian holobiont, Margulis's literal subject.
       this is where the ecology arc meets the consciousness arc — the long game's counterpart to the
       garden's awakening. fires once per run (firedOcc). */
    _oneness(ev) {
      if (this.mode !== 'longgame' || this.firedOcc['oneness']) return;
      const flora = this._patternCells('flora');
      let corals = 0; for (const c of flora) { const s = this.species.get(c.pat.sp); if (s && s.compound) corals++; }
      let combat = 0; for (const f of this.fauna) { const s = this.faunaSpecies.get(f.spId); if (s && (s.role === 'grazer' || s.role === 'predator')) combat++; }
      const kinds = new Set(flora.map(c => c.pat.sp)).size;
      if (corals >= 6 && combat <= 2 && kinds >= 6) { /* a deep union-community, combat all but gone, diverse */
        if (++this.onenessRun >= 3) { this.firedOcc['oneness'] = true; ev.push({ t: 'oneness', corals, kinds }); }
      } else this.onenessRun = 0;
    }
    /* Kauffman's autocatalytic set, emergent: the living flora close a metabolic RING — every element they
       eat (ch), some flora also EXCRETES (ex) — so the meadow begins to feed itself rather than leaning
       only on the bare producers. it takes DIVERSITY to close (never below ~4 species — Paine's keystone
       meets Kauffman's order-for-free). a mid-succession milestone, before symbiogenesis supersedes it. */
    _autocatalysis(ev) {
      if (this.mode !== 'longgame' || this.firedOcc['autocatalysis']) return;
      const eaten = new Set(), made = new Set(), live = new Set();
      for (const c of this._patternCells('flora')) {
        if (!c.pat.est) continue; /* ESTABLISHED beds only — a ring of settled flora is a mature, sustained
                                     metabolism; fresh seedlings coincidentally covering it (turn ~7) is not. */
        const s = this.species.get(c.pat.sp);
        if (s && !s.compound) { eaten.add(s.ch); made.add(s.ex); live.add(s.id); }
      }
      /* needs DIVERSITY (≥4 living kinds), not just 3 lucky early flora coincidentally covering the ring —
         the milestone is the meadow grown rich enough that its metabolism closes (the measured threshold). */
      if (live.size >= 4 && [0, 1, 2].every(ch => eaten.has(ch) && made.has(ch))) {
        if (++this.autocatRun >= 2) { this.firedOcc['autocatalysis'] = true; ev.push({ t: 'autocatalysis', kinds: live.size }); }
      } else this.autocatRun = 0;
    }
    _speciateFauna(estFlora, ev) {
      const id = this.nextFauna++;
      /* it specialises on the meadow's DOMINANT flower — its identity derives from what it eats */
      const count = {};
      for (const c of estFlora) count[c.pat.sp] = (count[c.pat.sp] || 0) + 1;
      let dietSp = estFlora[0].pat.sp, mx = 0;
      for (const s in count) if (count[s] > mx) { mx = count[s]; dietSp = +s; }
      const floraSp = this.species.get(dietSp);
      const ch = floraSp ? floraSp.ch : 0;
      /* the ROLE follows ecological SUCCESSION: a CONSUMER (grazer) finds the easy biomass first,
         but a pollinator NETWORK is the mark of a mature, varied meadow (Margulis: networking is
         the advanced achievement, not the starting move). so the first beast is always a grazer,
         and a mutualist arrives only once the meadow is both diverse (≥3 species) AND already has
         a grazing layer — the variety it tends is something the meadow had to earn. the CONSUMER
         NICHE never stays empty: when a grazer merges away into a coral (symbiogenesis), the web
         grows a new grazer to refill the base — so the union can happen again. */
      const div = new Set(estFlora.map(c => c.pat.sp)).size;
      const hasGrazer = [...this.faunaSpecies.values()].some(s => s.role === 'grazer');
      const role = (div >= 3 && hasGrazer) ? 'pollinator' : 'grazer';
      const suf = role === 'pollinator' ? FAUNA_POLLEN_SUF : FAUNA_SUF;
      const name = FLORA_PRE[ch][this.rng.i(FLORA_PRE[ch].length)] + suf[this.rng.i(suf.length)];
      const sp = { id, diet: dietSp, ch, role, color: floraSp ? floraSp.color : '#d8c0a8', name, born: this.turn, seeded: true };
      this.faunaSpecies.set(id, sp);
      const spot = estFlora.find(c => c.pat.sp === dietSp) || estFlora[0];
      /* a GRAZER arrives as a small HERD — a herbivore base with real biomass (so symbiogenesis has
         several candidates and is witnessable within one game, and so an apex could one day find prey);
         a pollinator, the specialised mutualist, drifts in alone. */
      const born = role === 'grazer' ? 3 : 1;
      for (let n = 0; n < born; n++) {
        const at = n === 0 ? spot : (estFlora[this.rng.i(estFlora.length)] || spot);
        this.fauna.push({ spId: id, q: at.q, r: at.r, age: 0, hunger: 0, fedRun: 0 });
      }
      ev.push({ t: 'fauna', name, role, color: sp.color, k: HEX.key(spot.q, spot.r), eats: floraSp ? floraSp.name : 'wildflowers' });
    }
    _speciatePredator(grazers, ev) {
      const id = this.nextFauna++;
      /* it specialises on the meadow's DOMINANT grazer — its identity derives from its prey */
      const count = {};
      for (const g of grazers) count[g.spId] = (count[g.spId] || 0) + 1;
      let dietSp = grazers[0].spId, mx = 0;
      for (const s in count) if (count[s] > mx) { mx = count[s]; dietSp = +s; }
      const preySp = this.faunaSpecies.get(dietSp);
      const ch = preySp ? preySp.ch : 0;
      const name = FLORA_PRE[ch][this.rng.i(FLORA_PRE[ch].length)] + FAUNA_PRED_SUF[this.rng.i(FAUNA_PRED_SUF.length)];
      /* a predatory red — distinct from any prey's diet-colour, so the apex reads as danger */
      const sp = { id, diet: dietSp, ch, role: 'predator', color: '#c2503f', name, born: this.turn, seeded: true };
      this.faunaSpecies.set(id, sp);
      const spot = grazers[0];
      this.fauna.push({ spId: id, q: spot.q, r: spot.r, age: 0, hunger: 0, fedRun: 0 });
      ev.push({ t: 'fauna', name, role: 'predator', color: sp.color, k: HEX.key(spot.q, spot.r), eats: preySp ? preySp.name : 'the herd' });
    }
    /* ── the apex hunts the herd: donor-controlled + refuge-bounded + dissipative (non-collapse) ── */
    _hunt(f, sp, ev) {
      let prey = null, bestD = 1e9, grazerN = 0, predN = 0;
      for (const o of this.fauna) {
        if (o.dead) continue;
        const osp = this.faunaSpecies.get(o.spId); if (!osp) continue;
        if (osp.role === 'predator') { predN++; continue; }
        if (osp.role !== 'grazer') continue; /* the apex hunts the HERD — not the airy pollinators, not the calcified corals */
        grazerN++;
        const d = HEX.dist2(f.q, f.r, o.q, o.r) - (o.spId === sp.diet ? 4 : 0); /* prefers its own prey species, but will take any grazer */
        if (d < bestD) { bestD = d; prey = o; }
      }
      if (!prey) return; /* no prey in reach → it goes hungry, and starves if the herd is gone (dissipative) */
      if (HEX.dist2(f.q, f.r, prey.q, prey.r) <= 1) {
        /* a KILL — only when hungry (one per satiety, donor-controlled), and never the last of the herd
           (refuge-bounded: the prey is regulated, never annihilated). a carcass fertilises the ground. */
        if (f.hunger >= PRED.NEED && grazerN > PRED.REFUGE) {
          prey.dead = 1; f.hunger = 0; f.fedRun = (f.fedRun || 0) + 1;
          const cell = this.cells.get(HEX.key(prey.q, prey.r)); if (cell) cell.e = U.clamp(cell.e + 0.06, 0, 1); /* the carcass effect — a kill is a biogeochemical hotspot (Bump et al.) */
          ev.push({ t: 'predate', k: HEX.key(prey.q, prey.r), color: sp.color });
          if (f.fedRun >= PRED.BREED && predN < PRED.CAP) {
            const bn = [...HEX.neighborsK(HEX.key(f.q, f.r))].filter(k => this.cells.has(k)).map(k => HEX.parse(k));
            const bp = bn.length ? bn[this.rng.i(bn.length)] : [f.q, f.r];
            this.fauna.push({ spId: f.spId, q: bp[0], r: bp[1], age: 0, hunger: 0, fedRun: 0 }); f.fedRun = 0; ev.push({ t: 'faunaBreed', k: HEX.key(f.q, f.r), color: sp.color });
          }
        }
      } else {
        /* stalk toward the nearest grazer, with light PACK cohesion (apex hunt loosely together) */
        let hx = 0, hy = 0, hn = 0; const occ = new Set();
        for (const o of this.fauna) { const osp = this.faunaSpecies.get(o.spId); if (o !== f && osp && osp.role === 'predator') { hx += o.q; hy += o.r; hn++; occ.add(o.q + ',' + o.r); } }
        let tq = prey.q, tr = prey.r;
        if (hn) { tq = prey.q * 0.8 + (hx / hn) * 0.2; tr = prey.r * 0.8 + (hy / hn) * 0.2; }
        const s = this._stepToward(f.q, f.r, tq, tr, occ); f.q = s.q; f.r = s.r;
      }
    }
    _stepToward(q, r, tq, tr, avoid) {
      let best = { q, r }, bestD = HEX.dist2(q, r, tq, tr);
      for (const nk of HEX.neighborsK(HEX.key(q, r))) {
        if (!this.cells.has(nk)) continue;
        const [nq, nr] = HEX.parse(nk);
        if (avoid && avoid.has(nq + ',' + nr)) continue; /* separation: don't pile onto a herdmate */
        const d = HEX.dist2(nq, nr, tq, tr);
        if (d < bestD) { bestD = d; best = { q: nq, r: nr }; }
      }
      return best;
    }

    _compoundCount() { let n = 0; for (const s of this.species.values()) if (s.compound) n++; return n; }
    _threat() { for (const s of this.faunaSpecies.values()) if (s.role === 'predator') return true; return false; } /* an apex stalks the herd */
    /* is this grazer ready to become one with its diet? a long bond + a free union slot — and predation
       pressure raises the ceiling on unions (the threatened meadow tolerates more escapes into coral) */
    _shouldMerge(f, sp) {
      return sp.role === 'grazer' && (f.bond || 0) >= MERGE.BOND && this._compoundCount() < MERGE.SP_CAP + (this._threat() ? MERGE.FEAR_CAP : 0);
    }
    /* ── symbiogenesis: a grazer and its established diet flora MERGE into a compound KIND ──
       Margulis's union, made literal. the producer's identity leads (the symbiont that does the
       photosynthesis), WIDENED into a hardier, habitat-building self-feeder — a coral. the beast
       is spent into it; a new species roots where the flower stood, born mature. its emergent
       capabilities (over either parent): a wider entropy band, and a stronger reef. deterministic —
       every trait is drawn from the one seeded rng stream. */
    _symbiogenesis(f, sp, best, ev) {
      const floraSp = this.species.get(best.pat.sp) || this.species.get(sp.diet);
      const ch = floraSp ? floraSp.ch : sp.ch;
      const id = this.nextSpecies++;
      const center = floraSp ? (floraSp.eLo + floraSp.eHi) / 2 : 0.4;
      const w = (floraSp ? (floraSp.eHi - floraSp.eLo) / 2 : 0.3) + MERGE.WIDEN; /* tolerance wider than either parent */
      const cmp = {
        id, ch, ex: floraSp ? floraSp.ex : (ch + 1) % 3,
        blend: floraSp ? floraSp.blend.slice() : [0.34, 0.33, 0.33],
        color: floraSp ? floraSp.color : sp.color,
        name: FLORA_PRE[ch][this.rng.i(FLORA_PRE[ch].length)] + FAUNA_MERGE_SUF[this.rng.i(FAUNA_MERGE_SUF.length)],
        settle: 2, spread: 0.30 + this.rng.f() * 0.18, maxBed: 12 + this.rng.i(10),
        eLo: Math.max(0, center - w), eHi: Math.min(1, center + w),
        born: this.turn, seeded: true, compound: true,
        parents: { flora: floraSp ? floraSp.name : 'a wildflower', beast: sp.name },
      };
      this.species.set(id, cmp);
      /* the union roots where the flower stood — born established (a mature relationship, not a pioneer) */
      best.pat = this._mkPat('flora'); best.pat.sp = id; best.pat.est = 1; best.pat.age = cmp.settle; best.pat.fedOk = 1; best.pat.fresh = 1;
      f.dead = 1; /* the beast is spent into the union — the herd may carry on, but this one is now coral */
      ev.push({ t: 'merge', k: HEX.key(best.q, best.r), color: cmp.color, name: cmp.name, ch: cmp.ch, flora: cmp.parents.flora, beast: cmp.parents.beast });
      this._occasion('merge1', ev); /* the first union of a run lands Margulis's own line — symbiosis generates novelty */
    }

    _wilt(c, ev) {
      const p = c.pat;
      if (p.t === 'frond') p.depth = Math.max(0, p.depth - 1);
      else if (p.t === 'bloom') p.lone = (p.lone || 0) + 1;
      else if (p.t === 'heart') c.e = U.clamp(c.e + 0.05, 0, 1);
      else if (p.t === 'myc') c.e = U.clamp(c.e + 0.03, 0, 1);
      ev.push({ t: 'starve', k: HEX.key(c.q, c.r), pt: p.t });
    }

    /* ── player actions ── */
    plantCost(t, k) {
      const def = this.C.PATTERNS[t];
      let cost = def.cost;
      const c = this.cells.get(k);
      if (c && t === 'crys') cost *= this.soilMul(c, 'crysCost'); /* cheap on stone, dear in wetland */
      cost *= this.mod('costAll', 1);
      return Math.max(1, Math.round(cost));
    }
    canPlant(t, k) {
      const def = this.C.PATTERNS[t];
      if (!def) return { ok: false, why: 'unknown pattern' };
      if (this.over) return { ok: false, why: 'the run has ended' };
      if (def.stage > this.stage) return { ok: false, why: 'not yet unlocked' };
      const c = this.cells.get(k);
      if (!c) return { ok: false, why: 'no ground there' };
      if (c.pat) return { ok: false, why: 'already occupied' };
      if (this.order < this.plantCost(t, k)) return { ok: false, why: 'not enough order' };
      if (c.e > def.maxE) return { ok: false, why: 'too entropic — tend it first' };
      return { ok: true };
    }

    plant(t, k) {
      /* build over carpet: planting onto moss clears it first (refunded), so the
         carpet you spread is never in the way of what you want to place there */
      const tc = this.cells.get(k);
      if (tc && tc.pat && tc.pat.t === 'moss' && t !== 'moss' && this.C.PATTERNS[t] && !this.over) {
        const def = this.C.PATTERNS[t];
        if (def.stage <= this.stage && tc.e <= def.maxE) {
          const refund = tc.pat.fresh ? this.plantCost('moss', k) : Math.floor(this.plantCost('moss', k) * this.mod('pruneRefund', 0.3));
          if (this.order + refund >= this.plantCost(t, k)) {
            tc.pat = null; this.order += refund; this.stats.prunes++;
          } else {
            /* you meant to build over the moss but can't afford it — say so plainly */
            return { ok: false, why: 'not enough order' };
          }
        }
      }
      const chk = this.canPlant(t, k);
      if (!chk.ok) return chk;
      const c = this.cells.get(k);
      const cost = this.plantCost(t, k);
      this.order -= cost;
      this.stats.spent += cost;
      c.pat = this._mkPat(t);
      c.pat.fresh = 1; /* same-turn prune refunds in full — a misclick is not a debt */
      this.stats.planted[t] = (this.stats.planted[t] || 0) + 1;
      const ev = [{ t: 'plant', k, pt: t }];
      this._broadcast(t, k, ev);
      this._occasion('plant1', ev);
      this._recompute();
      return { ok: true, events: ev };
    }

    /* the many hands: planting a garden pattern also seeds calm neighbors, free */
    _broadcast(t, k, ev) {
      if (t !== 'moss' && t !== 'frond' && t !== 'bloom') return;
      const n = Math.round(this.mod('hands', 0));
      if (n <= 0) return;
      const def = this.C.PATTERNS[t];
      const cands = HEX.neighborsK(k)
        .map(nk => this.cells.get(nk))
        .filter(cc => cc && !cc.pat && cc.e <= def.maxE)
        .sort((a, b) => a.e - b.e);
      for (let i = 0; i < Math.min(n, cands.length); i++) {
        const cc = cands[i];
        cc.pat = this._mkPat(t);
        /* NOT marked fresh — these were free, so they must not earn a full prune refund */
        this.stats.planted[t] = (this.stats.planted[t] || 0) + 1;
        ev.push({ t: 'plant', k: HEX.key(cc.q, cc.r), pt: t, via: 'hands' });
      }
    }

    /* ── evolution tree ── */
    canEvolve(id) {
      const e = this.C.EVOLUTIONS[id];
      if (!e) return { ok: false, why: 'unknown' };
      if (this.evolutions.includes(id)) return { ok: false, why: 'already grown' };
      if (e.req && !this.evolutions.includes(e.req)) return { ok: false, why: 'needs ' + this.C.EVOLUTIONS[e.req].name };
      if (this.insight < e.cost) return { ok: false, why: 'not enough insight' };
      return { ok: true };
    }
    evolve(id) {
      const chk = this.canEvolve(id);
      if (!chk.ok) return chk;
      this.insight -= this.C.EVOLUTIONS[id].cost;
      this.evolutions.push(id);
      this._recompute();
      return { ok: true };
    }
    grantInsight(reason, amt) {
      const key = 'ins:' + reason;
      if (this.firedOcc[key]) return;
      this.firedOcc[key] = true;
      this.insight += amt;
    }

    /* ── rites: expensive board-scale activations ── */
    riteCost(id) { const r = this.C.RITES[id]; return r ? Math.round(r.cost(this)) : 0; }
    canRite(id) {
      const r = this.C.RITES[id];
      if (!r) return { ok: false, why: 'unknown rite' };
      if (this.over) return { ok: false, why: 'the run has ended' };
      if (r.stage > this.stage) return { ok: false, why: 'not yet — stage ' + this.C.roman(r.stage - 1) };
      if (this.order < this.riteCost(id)) return { ok: false, why: 'not enough order' };
      return { ok: true };
    }
    invokeRite(id) {
      const chk = this.canRite(id);
      if (!chk.ok) return chk;
      this.order -= this.riteCost(id);
      this.stats.rites = (this.stats.rites || 0) + 1;
      const ev = [];
      this.C.RITES[id].effect(this, ev);
      this._recompute();
      return { ok: true, events: ev };
    }

    _mkPat(t) {
      switch (t) {
        case 'moss': return { t, age: 0, spr: 0, stress: 0 };
        case 'frond': return { t, age: 0, depth: 1 };
        case 'ant': return { t, age: 0, pop: 6, food: 0, lastTargets: [] };
        case 'myc': return { t, age: 0, links: [] };
        case 'crys': return { t, age: 0 };
        case 'bloom': return { t, age: 0, lone: 0 };
        case 'heart': return { t, age: 0, born: this.turn, links: [] };
        case 'flora': return { t, age: 0, sp: 0, est: 0, starve: 0 };
      }
    }

    tendCost() { return Math.max(0, Math.round(this.mod('tendCost', 1))); }
    tend(k) {
      if (this.over) return { ok: false, why: 'the run has ended' };
      const c = this.cells.get(k);
      if (!c) return { ok: false, why: 'no ground there' };
      const cost = this.tendCost();
      if (this.order < cost) return { ok: false, why: 'not enough order' };
      this.order -= cost;
      this.stats.spent += cost;
      this.tendsThisTurn++;
      if (this.tendsThisTurn <= 3) {
        const refund = Math.round(this.mod('tendRefund', 0));
        if (refund > 0) this.order += refund;
      }
      c.e = U.clamp(c.e - 0.30 * this.mod('tendPower', 1), 0, 1);
      c.eMin = Math.min(c.eMin, c.e);
      this.stats.tends++;
      const ev = [{ t: 'tend', k }];
      /* tending a rotted cell wounds the blight; clear it and the cell heals */
      const b = this.blight.get(k);
      if (b) { b.hp -= Math.max(1, Math.round(this.mod('tendPower', 1))); if (b.hp <= 0) this._clearBlight(k, ev, 'tended'); }
      return { ok: true, events: ev };
    }

    prune(k) {
      if (this.over) return { ok: false, why: 'the run has ended' };
      const c = this.cells.get(k);
      if (!c || !c.pat) return { ok: false, why: 'nothing to prune' };
      if (c.pat.t === 'flora') { /* culling wild flora — the steward's verb, no refund */
        const sp = this.species.get(c.pat.sp);
        c.pat = null; this.stats.prunes++; this._recompute();
        return { ok: true, events: [{ t: 'cull', k, name: sp ? sp.name : 'flora' }] };
      }
      const base = this.plantCost(c.pat.t, k);
      const refund = c.pat.fresh ? base : Math.floor(base * this.mod('pruneRefund', 0.3));
      const pt = c.pat.t;
      c.pat = null;
      this.order += refund;
      this.stats.prunes++;
      this._recompute();
      return { ok: true, events: [{ t: 'prune', k, pt, refund }] };
    }

    addArtifact(spec) {
      const a = this.C.buildArtifact(spec);
      this.artifacts.push(a);
      return a;
    }

    takeOffer(i) {
      if (!this.pendingOffer) return { ok: false, why: 'no offer' };
      let a = null;
      if (i >= 0 && i < this.pendingOffer.length) a = this.addArtifact(this.pendingOffer[i]);
      else this.order += 3; /* declining is also a choice */
      this.pendingOffer = null;
      this.pendingLegend = null; /* one thing per draft: taking a card forfeits the legendary */
      return { ok: true, artifact: a };
    }

    /* legendaries are bought, not grabbed — an escalating insight price so going
       relic-heavy is a deliberate commitment (a cultivar runs ~2-5 insight). */
    legendCost() {
      const sched = [6, 12, 20, 30, 45];
      const n = this.legendsBought;
      const base = n < sched.length ? sched[n] : sched[sched.length - 1] + (n - sched.length + 1) * 18;
      return Math.max(1, Math.round(base * this.mod('legendCostMul', 1)) - (this.legendDiscount || 0));
    }
    takeLegend() {
      if (!this.pendingLegend) return { ok: false, why: 'no legendary offered' };
      const cost = this.legendCost(); /* live — a fragment foraged while this offer waits still counts */
      if (this.insight < cost) return { ok: false, why: 'not enough insight ✸' };
      this.insight -= cost;
      const a = this.addArtifact(this.pendingLegend.spec);
      this.legendsBought++;
      this.legendDiscount = 0; /* the fragments fuse into this one relic */
      this.pendingOffer = null;
      this.pendingLegend = null;
      return { ok: true, artifact: a, cost };
    }

    useArtifact(i, k) {
      const a = this.artifacts[i];
      if (!a || !a.active) return { ok: false, why: 'not usable' };
      if (a.charges <= 0) return { ok: false, why: 'spent' };
      if (a.active.target === 'cell') {
        const c = this.cells.get(k);
        if (!c) return { ok: false, why: 'pick a cell' };
        if (a.active.can && !a.active.can(this, k)) return { ok: false, why: a.active.why || 'not there' };
      }
      const ev = [];
      a.active.use(this, k, ev);
      a.charges--;
      this._recompute();
      return { ok: true, events: ev };
    }

    /* ── coalescence ── */
    coalesceChecks() {
      const checks = [];
      const C = this.coherence();
      checks.push({ label: 'coherence ≥ 82%', ok: C >= 0.82, val: Math.round(C * 100) + '%' });
      let heartNet = null, hasHeart = false;
      for (const c of this.cells.values())
        if (c.pat && c.pat.t === 'heart') {
          hasHeart = true;
          const n = this.netOf.get(HEX.key(c.q, c.r));
          if (n && (!heartNet || n.cells.size > heartNet.cells.size)) heartNet = n;
        }
      checks.push({ label: 'a heartwood beats', ok: hasHeart });
      const size = heartNet ? heartNet.cells.size : 0;
      checks.push({ label: 'its network spans 25 cells', ok: size >= 25, val: size + '' });
      const types = heartNet ? heartNet.types.size : 0;
      checks.push({ label: 'weaving 4 kinds of life', ok: types >= 4, val: types + '' });
      return checks;
    }
    coalesceReady() {
      return this.stage === 6 && this.coalesceChecks().every(c => c.ok);
    }
    beginCoalescence() {
      if (this.mode === 'longgame') return { ok: false }; /* the long game has no single awakening */
      if (!this.coalesceReady()) return { ok: false };
      this.over = true; this.won = true; this.awakened = true;
      return { ok: true };
    }

    /* the long game's measure: a world is scored on what it sustains, not on one
       moment of waking — coherence held, scale, diversity, blossoms, network, disorder
       eaten. the same things the macro/ecology layer will one day reward at scale. */
    flourishScore() {
      let live = 0; const kinds = new Set(), floraSp = new Set();
      for (const c of this.cells.values()) if (c.pat) { live++; kinds.add(c.pat.t); if (c.pat.t === 'flora') floraSp.add(c.pat.sp); }
      let coralSp = 0; for (const sp of this.species.values()) if (sp.compound) coralSp++;
      const s = this.stats;
      const base =
        this.coherence() * 300 +
        live * 4 +
        kinds.size * 45 +
        (s.blooms || 0) * 3 +
        (s.netBest || 0) * 2 +
        (s.eaten || 0) * 2 +
        (this.stage - 1) * 50 +
        floraSp.size * 25 +                               /* the diversity of emergent flora */
        this.fauna.length * 30 + this.faunaSpecies.size * 40 + /* a living animal layer */
        coralSp * 70 +                                    /* the UNIONS — symbiogenesis, the cooperative pinnacle */
        (this.firedOcc['oneness'] ? 600 : 0);             /* the meadow became ONE — the summit */
      /* a flourishing world is one that becomes ONE, not one that merely teems — so oneness AMPLIFIES the
         whole score (×1.5), it doesn't just add to it. without this, raw board size won 8/8 over a compact
         meadow that actually became one — the math contradicted this function's own intent. cooperation is
         the apex: a small world made whole out-flourishes a big one that only teemed. (see DISCOVERIES.) */
      return Math.max(0, Math.round(base * (this.firedOcc['oneness'] ? 1.5 : 1)));
    }
    flourishGrade(score) {
      if (this.firedOcc['oneness']) return 'a world that became one'; /* the summit — the meadow recognised as a single living thing, above any mere score */
      if (score >= 2800) return 'a flourishing world';
      if (score >= 2000) return 'a thriving garden';
      if (score >= 1300) return 'a living garden';
      if (score >= 700) return 'a tended plot';
      return 'a fragile beginning';
    }
    flourishBreakdown() {
      let live = 0; const kinds = new Set(), floraSp = new Set();
      for (const c of this.cells.values()) if (c.pat) { live++; kinds.add(c.pat.t); if (c.pat.t === 'flora') floraSp.add(c.pat.sp); }
      let coralSp = 0; for (const sp of this.species.values()) if (sp.compound) coralSp++;
      const s = this.stats;
      const rows = [
        ['coherence held', Math.round(this.coherence() * 300)],
        ['living cells', live * 4],
        ['diversity', kinds.size * 45],
        ['blossoms', (s.blooms || 0) * 3],
        ['widest network', (s.netBest || 0) * 2],
        ['disorder devoured', Math.round((s.eaten || 0) * 2)],
        ['epochs reached', (this.stage - 1) * 50],
        ['emergent flora', floraSp.size * 25],
        ['the animal layer', this.fauna.length * 30 + this.faunaSpecies.size * 40],
      ];
      if (coralSp) rows.push(['unions woven (corals)', coralSp * 70]);
      if (this.firedOcc['oneness']) rows.push(['the meadow became one', 600]);
      return rows;
    }

    /* ── the turn pipeline ── */
    endTurn() {
      if (this.over) return [];
      if (this.pendingOffer) return [{ t: 'blocked', why: 'the garden is offering' }];
      const ev = [];
      this.emit('turnStart', null, ev);
      for (const c of this.cells.values()) if (c.pat && c.pat.fresh) delete c.pat.fresh;
      this._recompute();

      /* ── behaviors: the garden does what it does (spread, grow, eat, bloom, pulse) ── */
      this._turnBonus = 0;
      this._cohCache = this.coherence(); /* freeze coherence for this turn's pressure */
      this._stepAnts(ev);
      this._stepMyc(ev);
      this._stepBlooms(ev);
      this._stepMoss(ev);
      this._stepFronds(ev);
      this._stepHearts(ev);

      /* ── the metabolism: sap flows through the grid; fed life pays order, starved life wilts ── */
      let income = this._metabolism(ev);
      income += this._ecology(ev); /* emergent flora arise from the metabolism's surpluses */
      this._fauna(ev);             /* and megafauna arise from a rich meadow, grazing it */
      this._autocatalysis(ev);     /* the flora's metabolism closes into a self-feeding ring (Kauffman) */
      this._oneness(ev);           /* and the whole web, at its cooperative climax, is recognised as ONE */
      income += this._artifactIncome(ev);
      income *= this.mod('incomeAll', 1);

      this._stepBlight(ev);
      this._physics(ev);
      this._storms(ev);
      this._deaths(ev);

      const gained = Math.floor(this.carry + income);
      this.carry = this.carry + income - gained;
      this.order += gained;
      this.stats.income += gained;
      ev.push({ t: 'income', n: gained });

      /* hoarded order radiates as heat — undissipated structure is just warmth.
         spend it, or lose half of every point above the cap. */
      const cap = Math.round((28 + 16 * this.stage) * this.mod('orderCapMul', 1) + this.mod('orderCap', 0));
      this.orderCap = cap;
      if (this.order > cap) {
        const spilled = Math.floor((this.order - cap) * 0.5);
        if (spilled > 0) {
          this.order -= spilled;
          this.stats.spilled = (this.stats.spilled || 0) + spilled;
          /* heat does not all escape — some condenses into insight, the slow understanding */
          this.insightFrac += spilled / 16;
          let gained = 0;
          while (this.insightFrac >= 1) { this.insightFrac -= 1; this.insight++; gained++; }
          ev.push({ t: 'heat', n: spilled, cap, insight: gained });
        }
      }

      const C = this.coherence();
      this.stats.peakC = Math.max(this.stats.peakC, C);
      let patCount = 0; for (const c of this.cells.values()) if (c.pat) patCount++;
      this.series.push([this.turn, Math.round(C * 1000), Math.round(this.order), patCount, this.blight.size]);
      if (this.series.length > 160) this.series.shift();
      this._stageCheck(C, ev);
      this._lossCheck(C, ev);
      this._timedOccasions(ev);
      if (C >= 0.70) this._occasion('c70', ev);
      if (this.mode !== 'longgame' && this.stage === 6 && this.coalesceReady()) ev.push({ t: 'coalesceReady' });
      /* the long game: no single awakening — cultivate a lasting world, scored at turn 100 */
      if (this.mode === 'longgame' && this.turn >= 100 && !this.over) {
        this.over = true; this.won = true;
        const score = this.flourishScore();
        ev.push({ t: 'longEnd', score, grade: this.flourishGrade(score) });
      }

      this.emit('turnEnd', null, ev);
      this.tendsThisTurn = 0;
      this.turn++;
      this.turnsInStage++;
      this._snapshot();
      return ev;
    }

    /* crystals → damping field; mycelium → networks */
    _recompute() {
      this.aura = new Map();
      for (const c of this.cells.values()) {
        if (c.pat && c.pat.t === 'crys') {
          const R = Math.round(this.mod('crysRadius', 2));
          const str = this.mod('crysAura', 0.55);
          for (const k of HEX.disk(c.q, c.r, R)) {
            if (!this.cells.has(k)) continue;
            const cur = this.aura.get(k);
            this.aura.set(k, Math.max(0.30, (cur == null ? 1 : cur) * str));
          }
        }
      }
      /* union-find over mycelium link graph */
      const parent = new Map();
      const find = x => {
        while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); }
        return x;
      };
      const uni = (a, b) => {
        if (!parent.has(a)) parent.set(a, a);
        if (!parent.has(b)) parent.set(b, b);
        const ra = find(a), rb = find(b);
        if (ra !== rb) parent.set(ra, rb);
      };
      for (const c of this.cells.values()) {
        if (c.pat && (c.pat.t === 'myc' || c.pat.t === 'heart')) {
          const k = HEX.key(c.q, c.r);
          if (!parent.has(k)) parent.set(k, k);
          c.pat.links = (c.pat.links || []).filter(lk => {
            const lc = this.cells.get(lk);
            return lc && lc.pat; /* drop links to dead/erased patterns */
          });
          for (const lk of c.pat.links) uni(k, lk);
        }
      }
      const nets = new Map();
      for (const k of parent.keys()) {
        const root = find(k);
        if (!nets.has(root)) nets.set(root, { cells: new Set(), types: new Set(), links: 0 });
        const n = nets.get(root);
        n.cells.add(k);
        const c = this.cells.get(k);
        if (c && c.pat) n.types.add(c.pat.t);
      }
      for (const c of this.cells.values())
        if (c.pat && c.pat.t === 'myc') {
          const root = find(HEX.key(c.q, c.r));
          nets.get(root).links += c.pat.links.length;
        }
      this.networks = [...nets.values()].filter(n => n.cells.size >= 2);
      this.netOf = new Map();
      for (const n of this.networks) {
        for (const k of n.cells) this.netOf.set(k, n);
        this.stats.netBest = Math.max(this.stats.netBest, n.cells.size);
        if (n.cells.size >= 6) { this._occasion('net6', null); this.grantInsight('net6', 1); }
        if (n.cells.size >= 20) { this._occasion('net20', null); this.grantInsight('net20', 2); }
      }
      this._computeFlows(); /* keep sap/fed current for display after any change */
    }

    _patternCells(t) {
      const out = [];
      for (const c of this.cells.values()) if (c.pat && (!t || c.pat.t === t)) out.push(c);
      return out;
    }

    _stepAnts(ev) {
      for (const c of this._patternCells('ant')) {
        const p = c.pat;
        p.age++;
        const R = Math.round(this.mod('antRange', 3));
        const cands = [];
        for (const k of HEX.disk(c.q, c.r, R)) {
          const cc = this.cells.get(k);
          if (cc && cc.e > 0.15 && k !== HEX.key(c.q, c.r)) cands.push(cc);
        }
        cands.sort((a, b) => b.e - a.e);
        const targets = cands.slice(0, 3);
        let eaten = 0;
        if (targets.length) {
          const eatTotal = p.pop * 0.05 * this.mod('antEat', 1) * this.soilMul(c, 'ant');
          const per = eatTotal / targets.length;
          const warDmg = this.flag('antWar') ? 3 : 1;
          for (const tc of targets) {
            const bite = Math.min(per, tc.e - 0.05);
            if (bite > 0) { tc.e -= bite; eaten += bite; }
            if (this.flag('stigmergy')) tc.trail = 1;
            /* foragers are the garden's immune system: they savage blight they reach */
            const tk = HEX.key(tc.q, tc.r);
            const b = this.blight.get(tk);
            if (b) { b.hp -= warDmg; if (b.hp <= 0) this._clearBlight(tk, ev, 'devoured'); }
          }
        }
        p.lastTargets = targets.map(tc => HEX.key(tc.q, tc.r));
        p.lastEaten = eaten;
        this.stats.eaten += eaten;
        p.food += eaten;
        /* eaten disorder becomes sap (resolved in _metabolism) */
        const popMax = Math.round(this.mod('antPopMax', 24));
        if (p.food >= 1 && p.pop < popMax) { p.pop = Math.min(p.pop + 2, popMax); p.food -= 1; }
        if (eaten < p.pop * 0.012) p.pop -= 1;
        if (eaten > 0) ev.push({ t: 'eat', from: HEX.key(c.q, c.r), targets: p.lastTargets });
        /* foragers unearth strange things — a relic for the rail, or a fragment that
           discounts the next legendary. the disorder they eat becomes a key to a rule. */
        if (eaten > 0.25 && this.finds < 2 &&
            this.rng.chance(0.035 * this.mod('antFindChance', 1))) {
          this.finds++;
          if (this.rng.chance(0.45)) {
            const frag = 4 + this.rng.i(5); /* 4-8 insight off the next legendary */
            this.legendDiscount += frag;
            ev.push({ t: 'find', kind: 'fragment', amount: frag, k: HEX.key(c.q, c.r) });
          } else {
            const a = this.addArtifact(this.C.rollAntFind(this));
            ev.push({ t: 'find', name: a.name, k: HEX.key(c.q, c.r) });
          }
          this._occasion('find1', ev);
        }
      }
    }

    _stepMyc(ev) {
      let links = 0;
      for (const c of this._patternCells('myc')) {
        const p = c.pat;
        p.age++;
        c.e = U.clamp(c.e - 0.05, 0, 1);
        const maxL = Math.round(this.mod('mycLinkMax', 5));
        if (p.links.length < maxL) {
          const R = Math.max(1, Math.round(this.mod('mycRange', 2) + this.soilMul(c, 'mycRange')));
          let best = null, bestD = 1e9;
          for (const k of HEX.disk(c.q, c.r, R)) {
            if (k === HEX.key(c.q, c.r) || p.links.includes(k)) continue;
            const cc = this.cells.get(k);
            if (!cc || !cc.pat) continue;
            /* don't double-link a myc pair from both sides */
            if (cc.pat.t === 'myc' && cc.pat.links.includes(HEX.key(c.q, c.r))) continue;
            /* hyphae seek hyphae: bridging beats grazing, so networks merge */
            const bridge = (cc.pat.t === 'myc' || cc.pat.t === 'heart') ? 1.5 : 0;
            const d = HEX.dist2(c.q, c.r, cc.q, cc.r) - bridge;
            if (d < bestD) { bestD = d; best = k; }
          }
          if (best) { p.links.push(best); ev.push({ t: 'link', from: HEX.key(c.q, c.r), to: best }); }
        }
        links += p.links.length;
      }
      if (links) this._recompute();
      /* entropy smoothing: the network shares its burden */
      const sm = 0.15 * this.mod('netSmooth', 1);
      for (const n of this.networks) {
        let sum = 0, cnt = 0;
        for (const k of n.cells) { const c = this.cells.get(k); if (c) { sum += c.e; cnt++; } }
        if (cnt < 2) continue;
        const mean = sum / cnt;
        for (const k of n.cells) {
          const c = this.cells.get(k);
          if (c) c.e = U.clamp(c.e + (mean - c.e) * sm, 0, 1);
        }
      }
    }

    _bloomGeneration(ev, viaPulse) {
      /* hex-life, simultaneous update */
      const flowers = this._patternCells('bloom');
      const nCount = c => {
        let n = 0;
        for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
          const cc = this.cells.get(k);
          if (cc && cc.pat && cc.pat.t === 'bloom') n++;
        }
        return n;
      };
      const deaths = [], loneTick = [];
      const surviveHi = Math.round(this.mod('bloomSurviveHi', 4));
      const loneMax = this.flag('lyapunov') ? 3 : 2;
      for (const c of flowers) {
        const n = nCount(c);
        if (n > surviveHi) deaths.push(c);
        else if (n <= 1) { if (c.pat.lone + 1 >= loneMax && c.pat.age >= 1) deaths.push(c); else loneTick.push(c); }
      }
      const birthE0 = this.mod('bloomBirthE', 0.40);
      const births = [];
      const seen = new Set();
      for (const c of flowers) {
        for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
          if (seen.has(k)) continue;
          seen.add(k);
          const cc = this.cells.get(k);
          if (!cc || cc.pat) continue;
          const birthE = birthE0 + this.soilMul(cc, 'bloom'); /* meadow sprouts readily, ash resists */
          if (cc.e >= birthE) continue;
          let n = 0;
          for (const k2 of HEX.neighborsK(k)) {
            const c2 = this.cells.get(k2);
            if (c2 && c2.pat && c2.pat.t === 'bloom') n++;
          }
          if (n === 3) births.push(cc);
        }
      }
      for (const c of deaths) this._kill(c, ev, 'faded');
      for (const c of loneTick) c.pat.lone++;
      for (const c of flowers) if (!deaths.includes(c) && !loneTick.includes(c)) c.pat.lone = 0;
      let burst = 0, orderGain = 0;
      for (const c of births) {
        c.pat = this._mkPat('bloom');
        c.e = U.clamp(c.e - 0.15, 0, 1);
        burst++;
        this.stats.blooms++;
        orderGain += burst <= 3 ? 2 + this.mod('bloomOrder', 0) : 1;
        ev.push({ t: 'birth', k: HEX.key(c.q, c.r) });
        /* pollen: neighbors quicken */
        for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
          const cc = this.cells.get(k);
          if (!cc || !cc.pat) continue;
          if (cc.pat.t === 'moss') cc.pat.age++;
          if (cc.pat.t === 'frond') this._frondGrow(cc);
        }
      }
      orderGain = Math.min(orderGain, 12);
      if (burst >= 2) ev.push({ t: 'cascade', n: burst, viaPulse: !!viaPulse });
      if (burst > this.stats.cascadeBest) this.stats.cascadeBest = burst;
      if (burst >= 3) this.grantInsight('cascade', 1);
      if (burst >= 5) this._occasion('cascade5', ev);
      return orderGain;
    }

    _stepBlooms(ev) {
      for (const c of this._patternCells('bloom')) { c.pat.age++; c.e = U.clamp(c.e - 0.04, 0, 1); }
      this._turnBonus += this._bloomGeneration(ev, false); /* bloom births pay order directly */
    }

    _mossSpread(c, ev) {
      /* an established flora bed HOLDS its ground — moss won't carpet the open cells around it
         (allelopathy), so wildflower beds can finally spread instead of being out-competed.
         only checked when life is afoot (longgame), so the base game is untouched. */
      const guard = this.species.size > 0;
      const opts = [];
      for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
        const cc = this.cells.get(k);
        if (cc && !cc.pat && cc.e <= 0.6 && !(guard && this._nearFlora(k))) opts.push(cc);
      }
      if (!opts.length) return false;
      /* moss climbs toward the frontier — the wildest ground it can still survive — not back
         into the calm interior. (it used to seed the calmest neighbour, so it crawled onto
         cells you'd just pruned; now it advances on the gradient, where its sap is made.) */
      opts.sort((a, b) => b.e - a.e);
      const tgt = opts[0];
      tgt.pat = this._mkPat('moss');
      ev.push({ t: 'spread', from: HEX.key(c.q, c.r), to: HEX.key(tgt.q, tgt.r) });
      this._occasion('spread1', ev);
      return true;
    }
    _nearFlora(k) { /* is a flower (even a young one) holding this open cell against the moss? */
      for (const nk of HEX.neighborsK(k)) { const nc = this.cells.get(nk); if (nc && nc.pat && nc.pat.t === 'flora') return true; }
      return false;
    }

    _stepMoss(ev) {
      const every = Math.max(2, Math.round(this.mod('mossSpreadEvery', 3)));
      for (const c of this._patternCells('moss')) {
        const p = c.pat;
        p.age++;
        c.e = U.clamp(c.e - 0.12 * this.mod('mossPower', 1) * this.soilMul(c, 'moss'), 0, 1);
        if (p.age >= 3) {
          /* mature moss soothes its neighbors. its sap (resolved in _metabolism) is
             made only on a gradient — a cleaned interior makes none. */
          for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
            const cc = this.cells.get(k);
            if (cc) cc.e = U.clamp(cc.e - 0.02, 0, 1);
          }
        }
        p.spr++;
        if (p.age >= 2 && p.spr >= every) {
          if (this._mossSpread(c, ev)) p.spr = 0;
        }
        if (c.e > 0.88) p.stress++; else p.stress = 0;
      }
    }

    _frondGrow(c, syn) {
      const p = c.pat;
      const maxD = Math.round(this.mod('frondMaxDepth', 6));
      /* soil and shelter widen the window a frond can unfold in */
      const shelter = ((syn == null ? this._synergy(c) : syn) - 1) * 0.12;
      const gate = this.mod('frondGrowGate', 0.45) + this.soilMul(c, 'frondGate') + shelter;
      if (c.e < gate && p.depth < maxD) {
        p.depth++;
        if (p.depth >= maxD && !p.maxed) {
          p.maxed = true;
          this.stats.frondMaxed++;
          this.grantInsight('frondmax', 1);
          this._occasion('frondMax', null);
        }
      }
    }

    _stepFronds(ev) {
      for (const c of this._patternCells('frond')) {
        const p = c.pat;
        const syn = this._synergy(c);
        p.age++;
        c.e = U.clamp(c.e - 0.05, 0, 1);
        this._frondGrow(c, syn);
        if (c.e > 0.55) {
          p.depth--;
          ev.push({ t: 'wither', k: HEX.key(c.q, c.r) });
        }
        /* frond income (gated on being fed sap) is resolved in _metabolism */
        /* sporeleaf: a thriving, deep frond casts a spore into the calmest open neighbor */
        if (this.flag('sporeleaf') && p.depth >= 4 && syn >= 1.2 && this.rng.chance(0.12)) {
          let best = null;
          for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
            const cc = this.cells.get(k);
            if (cc && !cc.pat && cc.e < 0.4 && (!best || cc.e < best.e)) best = cc;
          }
          if (best) { best.pat = this._mkPat('frond'); ev.push({ t: 'spore', k: HEX.key(best.q, best.r) }); }
        }
      }
    }

    _stepHearts(ev) {
      for (const c of this._patternCells('heart')) {
        const p = c.pat;
        p.age++;
        c.e = U.clamp(c.e - 0.08, 0, 1);
        /* the heart is a hub: it reaches for nearby hyphae itself */
        if (!p.links) p.links = [];
        if (p.links.length < 4) {
          let best = null, bestD = 1e9;
          for (const k of HEX.disk(c.q, c.r, 2)) {
            if (k === HEX.key(c.q, c.r) || p.links.includes(k)) continue;
            const cc = this.cells.get(k);
            if (!cc || !cc.pat || cc.pat.t !== 'myc') continue;
            const d = HEX.dist2(c.q, c.r, cc.q, cc.r);
            if (d < bestD) { bestD = d; best = k; }
          }
          if (best) { p.links.push(best); ev.push({ t: 'link', from: HEX.key(c.q, c.r), to: best }); this._recompute(); }
        }
        const period = Math.max(2, Math.round(this.mod('heartPeriod', 3)));
        const net = this.netOf.get(HEX.key(c.q, c.r));
        /* heartwood income (network/5, gated on fed) is resolved in _metabolism.
           a starved heart cannot pulse — the drum needs sap to beat. */
        if ((this.turn - p.born) % period === 0 && this.turn > p.born && (p.fed == null || p.fed >= 0.5)) {
          const members = net ? [...net.cells] : [HEX.key(c.q, c.r)];
          let bloomTick = false;
          for (const k of members) {
            const cc = this.cells.get(k);
            if (!cc) continue;
            cc.e = U.clamp(cc.e - 0.04, 0, 1);
            if (!cc.pat) continue;
            if (cc.pat.t === 'moss') { cc.pat.age++; this._mossSpread(cc, ev); }
            if (cc.pat.t === 'frond') this._frondGrow(cc);
            if (cc.pat.t === 'ant') cc.pat.food += 1.2;
            if (cc.pat.t === 'bloom') bloomTick = true;
          }
          if (bloomTick) this._turnBonus += this._bloomGeneration(ev, true);
          ev.push({ t: 'pulse', center: HEX.key(c.q, c.r), cells: members });
          this._occasion('pulse1', ev);
        }
      }
    }

    _artifactIncome(ev) {
      let inc = 0;
      /* Noether: symmetric crystal pairs conserve */
      if (this.flag('noether')) {
        let pairs = 0;
        for (const c of this._patternCells('crys')) {
          if (c.q === 0 && c.r === 0) continue;
          const m = this.cells.get(HEX.key(-c.q, -c.r));
          if (m && m.pat && m.pat.t === 'crys') pairs++;
        }
        inc += (pairs / 2) * 2;
      }
      /* Boltzmann Brain: minds in the foam */
      if (this.flag('boltzbrain')) {
        const t = this.target();
        const ref = t == null ? 0.82 : t;
        if (this.coherence() > ref + 0.06) inc += 5;
      }
      return inc;
    }

    _physics(ev) {
      const k0 = 0.16;
      const P = this.pressure();
      const next = new Map();
      for (const [key, c] of this.cells) {
        let nSum = 0, nCnt = 0;
        for (const nk of HEX.neighborsK(key)) {
          const nc = this.cells.get(nk);
          nSum += nc ? nc.e : 1.0; /* the dark outside */
          nCnt++;
        }
        const aura = this.aura.get(key) || 1;
        let flow = k0 * this.soilMul(c, 'diffuse') * (nSum / nCnt - c.e);
        if (flow > 0) flow *= aura; /* anchors damp inflow, not outflow */
        let press = P * aura * this.soilMul(c, 'press');
        if (c.trail) press *= 0.7;
        if (this.flag('eddy')) {
          const n = this.netOf.get(key);
          if (n && this.networks.length && n === this.networks.reduce((a, b) => a.cells.size >= b.cells.size ? a : b))
            press *= 0.5;
        }
        let e2 = c.e + flow + press;
        if (this.flag('ratchet') && c.pat) e2 = Math.min(e2, c.e);
        next.set(key, U.clamp(e2, 0, 1));
      }
      for (const [key, e2] of next) {
        const c = this.cells.get(key);
        c.e = e2;
        if (c.pat && c.pat.t === 'crys') c.e = Math.min(c.e, 0.03);
        c.eMin = Math.min(c.eMin, c.e);
      }
    }

    _resolveStormCenter(s) {
      if (this.flag('attractor')) {
        const keys = HEX.disk(0, 0, 2).filter(k => this.cells.has(k));
        return keys[Math.floor(s.u * keys.length) % keys.length];
      }
      const keys = [...this.cells.keys()].sort();
      return keys[Math.floor(s.u * keys.length) % keys.length];
    }

    _storms(ev) {
      const warnAhead = 1 + Math.round(this.mod('stormWarn', 0));
      while (this.stormI < this.stormQueue.length) {
        const s = this.stormQueue[this.stormI];
        if (s.turn > this.turn) break;
        /* strike */
        const center = this._resolveStormCenter(s);
        const [cq, cr] = HEX.parse(center);
        const radius = Math.max(1, s.radius + Math.round(this.mod('stormRadius', 0)));
        let power = (s.power + 0.03 * this.stage) * this.mod('stormPower', 1);
        if (this.flag('attractor')) power *= 0.6;
        const hit = [];
        for (const k of HEX.disk(cq, cr, radius)) {
          const c = this.cells.get(k);
          if (!c) continue;
          const aura = this.aura.get(k) || 1;
          const dmg = power * (HEX.dist2(c.q, c.r, cq, cr) === 0 ? 1.2 : 1) * aura;
          c.e = U.clamp(c.e + dmg, 0, 1);
          hit.push(k);
          if (c.pat) {
            if (c.pat.t === 'frond') c.pat.depth -= 2;
            if (c.pat.t === 'bloom') c.pat.lone = 99;
            if (c.pat.t === 'ant') c.pat.pop = Math.max(1, Math.floor(c.pat.pop * 0.8));
          }
        }
        this.stats.stormsSeen++;
        this.grantInsight('storm', 1);
        ev.push({ t: 'storm', cells: hit, center, power });
        this.emit('storm', { center, cells: hit }, ev);
        this._occasion('storm1', ev);
        this.stormI++;
      }
      /* telegraph */
      const nxt = this.stormQueue[this.stormI];
      if (nxt && nxt.turn <= this.turn + warnAhead) {
        const center = this._resolveStormCenter(nxt);
        const [cq, cr] = HEX.parse(center);
        const cells = HEX.disk(cq, cr, Math.max(1, nxt.radius + Math.round(this.mod('stormRadius', 0))))
          .filter(k => this.cells.has(k));
        ev.push({ t: 'stormWarn', cells, center, inTurns: nxt.turn - this.turn });
      }
    }

    /* ── blight: motile disorder that hunts the garden ── */
    blightAt(k) { return this.blight.get(k) || null; }

    _blightFrontier(includeOpen) {
      const out = [];
      for (const c of this.cells.values()) {
        const k = HEX.key(c.q, c.r);
        if (this.blight.has(k)) continue;
        if ((this.aura.get(k) || 1) < 0.6) continue; /* crystals hold the line */
        if (c.e < 0.48) continue;
        let near = false;
        for (const nk of HEX.neighborsK(k)) { const cc = this.cells.get(nk); if (cc && cc.pat) { near = true; break; } }
        if (near || includeOpen) out.push(c);
      }
      return out;
    }
    _blightSpawnCell(u) {
      const cands = this._blightFrontier(false);
      if (!cands.length) return null;
      cands.sort((a, b) => b.e - a.e || (a.r - b.r) || (a.q - b.q));
      const top = Math.min(cands.length, 5);
      const pick = cands[Math.floor(u * top) % top];
      return HEX.key(pick.q, pick.r);
    }
    _blightBite(c) {
      const p = c.pat;
      if (!p) return;
      if (p.t === 'frond') p.depth -= 2;
      else if (p.t === 'bloom') p.lone = 99;
      else if (p.t === 'ant') p.pop = Math.max(0, p.pop - 2);
      else if (p.t === 'moss') p.stress++;
    }
    _clearBlight(k, ev, how) {
      if (!this.blight.has(k)) return;
      this.blight.delete(k);
      /* every clearing pays — order, and a little insight for the effort */
      this.order += 2;
      this.insight += 1;
      this.stats.blightCleared = (this.stats.blightCleared || 0) + 1;
      if (ev) ev.push({ t: 'blightClear', k, how });
    }
    _stepBlight(ev) {
      const cap = 8 + this.stage * 2;
      const C = this.coherence();
      /* spawn from the schedule (only once symbiosis has begun, and never to pile onto a dying garden) */
      while (this.blightI < this.blightQueue.length && this.blightQueue[this.blightI].turn <= this.turn) {
        const s = this.blightQueue[this.blightI++];
        if (this.stage >= 3 && this.blight.size < cap && C > 0.30) {
          const k = this._blightSpawnCell(s.u);
          if (k) {
            const wisp = this.stage >= 5 && s.wisp < 0.4;
            this.blight.set(k, { kind: wisp ? 'wisp' : 'rot', hp: 2 + Math.floor(this.stage / 2), age: 0 });
            this.stats.blightSeen = (this.stats.blightSeen || 0) + 1;
            ev.push({ t: 'blightSpawn', k, kind: wisp ? 'wisp' : 'rot' });
          }
        }
      }
      /* act: raise entropy, gnaw patterns, wither inside crystal auras */
      const spreaders = [], movers = [];
      for (const [k, b] of this.blight) {
        const c = this.cells.get(k);
        if (!c) { this.blight.delete(k); continue; }
        b.age++;
        if ((this.aura.get(k) || 1) < 0.6) b.hp -= 2; /* a crystal aura corrodes it */
        c.e = U.clamp(c.e + (b.kind === 'wisp' ? 0.10 : 0.17), 0, 0.95);
        /* rot lives on order: surround it with cleared, empty ground and it starves */
        let touchesGarden = false;
        for (const nk of HEX.neighborsK(k)) { const cc = this.cells.get(nk); if (cc && cc.pat) { touchesGarden = true; break; } }
        if (c.pat) this._blightBite(c);
        else if (!touchesGarden) { b.starve = (b.starve || 0) + 1; if (b.starve >= 2) { b.hp -= 1; b.starve = 0; } }
        if (b.hp <= 0) { this._clearBlight(k, ev, 'starved'); continue; }
        if (b.kind === 'wisp') movers.push([k, b]); else spreaders.push([k, b]);
      }
      /* rot spreads slowly into the garden; wisps drift toward the calm and ruin it */
      for (const [k, b] of spreaders) {
        if (this.blight.size >= cap) break;
        if (b.age % 2 !== 0) continue;
        const tgt = this._blightStep(k, true);
        if (tgt) { this.blight.set(tgt, { kind: 'rot', hp: 2, age: 0 }); ev.push({ t: 'blightSpread', from: k, to: tgt }); }
      }
      for (const [k, b] of movers) {
        const tgt = this._blightStep(k, false);
        if (tgt && !this.blight.has(tgt)) { this.blight.delete(k); this.blight.set(tgt, b); ev.push({ t: 'blightMove', from: k, to: tgt }); }
      }
      /* telegraph the next spawn */
      const nxt = this.blightQueue[this.blightI];
      if (nxt && this.stage >= 3 && nxt.turn <= this.turn + 1) {
        const k = this._blightSpawnCell(nxt.u);
        if (k) ev.push({ t: 'blightWarn', k });
      }
    }
    _blightStep(k, preferPat) {
      let bestPat = null, bestOpen = null;
      for (const nk of HEX.neighborsK(k)) {
        const cc = this.cells.get(nk);
        if (!cc || this.blight.has(nk)) continue;
        if ((this.aura.get(nk) || 1) < 0.6) continue;
        if (cc.pat) { if (!bestPat || cc.e < bestPat.e) bestPat = cc; }
        else if (!bestOpen || (preferPat ? cc.e > (bestOpen.e) : cc.e < (bestOpen.e))) bestOpen = cc;
      }
      const t = (preferPat && bestPat) ? bestPat : (bestOpen || bestPat);
      return t ? HEX.key(t.q, t.r) : null;
    }

    _kill(c, ev, how) {
      const pt = c.pat.t;
      c.pat = null;
      this.stats.deaths++;
      const bonus = Math.round(this.mod('orderOnDeath', 0));
      if (bonus) this.order += bonus;
      if (pt === 'moss' && this.flag('ouroboros')) c.e = U.clamp(c.e - 0.35, 0, 1);
      if (pt === 'ant') c.e = U.clamp(c.e + 0.1, 0, 1);
      ev.push({ t: 'death', k: HEX.key(c.q, c.r), pt, how });
      this.emit('death', { k: HEX.key(c.q, c.r), pt }, ev);
      this._occasion('death1', ev);
    }

    _deaths(ev) {
      for (const c of this._patternCells()) {
        const p = c.pat;
        if (!p) continue;
        const mossStressMax = this.flag('ironMoss') ? 4 : 2;
        if (p.t === 'moss' && p.stress >= mossStressMax) this._kill(c, ev, 'drowned in noise');
        else if (p.t === 'frond' && p.depth <= 0) this._kill(c, ev, 'withered');
        else if (p.t === 'ant' && (p.pop <= 0 || c.e > 0.92)) this._kill(c, ev, 'scattered');
        else if (p.t === 'bloom' && (c.e > 0.5 || p.lone >= 99)) this._kill(c, ev, 'faded');
        else if (p.t === 'myc' && c.e > 0.9) this._kill(c, ev, 'unraveled');
        else if (p.t === 'heart' && c.e > 0.85) this._kill(c, ev, 'stilled');
      }
      this._recompute();
    }

    /* crossing the threshold is noticed; crossing over is chosen */
    _stageCheck(C, ev) {
      if (this.stage >= 6 || this.widenReady) return;
      if (C < this.target()) return;
      this.widenReady = true;
      ev.push({ t: 'widenReady', stage: this.stage });
    }

    widen() {
      if (!this.widenReady || this.stage >= 6 || this.over) return { ok: false };
      this.widenReady = false;
      this.turnsInStage = 0;
      this.stage++;
      const st = this.C.STAGES[this.stage - 1];
      const ev = [];
      if (st.radius > this.radius) {
        this.radius = st.radius;
        const eBoost = 0.40 + this.mod('expansionE', 0) + 0.02 * this.asc; /* the new rim arrives wild */
        for (const [q, r] of HEX.ring(st.radius)) {
          const soil = this.soilAt(q, r);
          const e = U.clamp(0.5 + eBoost + this.C.soilMul(soil, 'e0') + this.rng.range(-0.05, 0.05), 0.4, 0.97);
          const cell = this._mkCell(q, r, e, soil);
          this.cells.set(HEX.key(q, r), cell);
        }
      }
      this.order += 6 + 3 * this.stage;
      this.grantInsight('stage' + this.stage, 2);
      ev.push({ t: 'stageUp', stage: this.stage, name: st.name, unlocks: st.unlocks });
      this._occasion('stage' + this.stage, ev);
      const offer = this.C.rollOffer(this);
      this.pendingOffer = offer.cards;
      this.pendingLegend = offer.legend ? { spec: offer.legend } : null; /* cost computed live */
      ev.push({ t: 'offer', specs: this.pendingOffer, legend: this.pendingLegend });
      this.emit('stageUp', { stage: this.stage }, ev);
      this._recompute();
      return { ok: true, events: ev };
    }

    _lossCheck(C, ev) {
      if (this.turn < 8 || this.over) return;
      if (C < 0.22) {
        this.lowStreak++;
        if (this.lowStreak >= 3) {
          /* a held breath: artifacts may intercede */
          const saved = { by: null };
          this.emit('dissolve', saved, ev);
          if (saved.by) { this.lowStreak = 0; ev.push({ t: 'saved', via: saved.by }); return; }
          this.over = true; this.won = false;
          ev.push({ t: 'dissolved' });
        } else ev.push({ t: 'dissolveWarn', streak: this.lowStreak });
      } else this.lowStreak = 0;
    }

    /* echoes: occasions pull murmurs in order — but a fitting one may step forward
       within its movement, so the words arrive when the play earns them */
    echoCap() { return Math.round(this.mod('echoCap', this.mode === 'longgame' ? 14 : 6)); } /* the long game runs 100 turns and EARNS far more murmurs (every union, every cycle) — the garden's cap of 6 starved its soul, leaving only the early entropy murmurs and never the food web's */
    _nextEchoIdx() {
      for (let i = 0; i < 24; i++) if (!this.echoOwned.has(i)) return i; /* 24 belongs to the awakening */
      return null;
    }
    _occasion(name, ev) {
      if (this.firedOcc[name]) return;
      this.firedOcc[name] = true;
      if (this.echoesThisRun >= this.echoCap()) return;
      const next = this._nextEchoIdx();
      if (next == null) return;
      let idx = next;
      const pref = this.C.ECHO_PREF[name];
      const band = n => n < 6 ? 0 : n < 13 ? 1 : n < 19 ? 2 : 3;
      if (pref != null && !this.echoOwned.has(pref) && band(pref) === band(next)) idx = pref;
      this.echoOwned.add(idx);
      this.echoesThisRun++;
      const bonus = Math.round(this.mod('echoOrder', 0));
      if (bonus) this.order += bonus;
      if (ev) ev.push({ t: 'echo', idx });
      else this._lateEcho = idx; /* fired outside endTurn (e.g. plant); UI polls */
    }
    takeLateEcho() { const e = this._lateEcho; this._lateEcho = undefined; return e; }
    _timedOccasions(ev) {
      for (const t of [10, 22, 34, 46, 58]) if (this.turn === t) this._occasion('turn' + t, ev);
    }

    _snapshot() {
      this.history.push(JSON.stringify(this.serialize()));
      if (this.history.length > 4) this.history.shift();
    }
    rewind() {
      if (!this.history.length) return false;
      const snap = JSON.parse(this.history[0]);
      const g = Game.fromJSON(snap);
      /* adopt the older self */
      for (const f of ['turn', 'stage', 'order', 'carry', 'lowStreak', 'finds', 'echoOwned',
        'echoesThisRun', 'widenReady', 'turnsInStage', 'insight', 'insightFrac', 'evolutions',
        'radius', 'stormI', 'blightI', 'blightQueue', 'blight', 'terra', 'firedOcc', 'stats', 'series']) this[f] = g[f];
      this.cells = g.cells;
      this.artifacts = g.artifacts;
      this.rng.s = g.rng.s;
      this.stormQueue = g.stormQueue;
      this.history = [];
      this.lowStreak = 0;
      this._recompute();
      return true;
    }

    /* ── serialization (stable ordering for roundtrip equality) ── */
    serialize() {
      const si = s => Math.max(0, this.C.SOIL_ORDER.indexOf(s));
      const cells = [...this.cells.values()]
        /* insertion order, NOT sorted: the live cell Map is in insertion order and the ecology consumes
           RNG while iterating it, so a reload must restore that exact order or it draws a different
           sequence. insertion order is deterministic (same seed → same order), so the roundtrip stays stable. */
        .map(c => {
          const o = [c.q, c.r, c.e, c.eMin, si(c.soil)];
          if (c.pat || c.trail) o.push(c.pat ? this._patJSON(c.pat) : 0, c.trail ? 1 : 0);
          return o;
        });
      return {
        v: LP.SAVE_V, seed: this.seed, asc: this.asc, mode: this.mode, s: this.rng.s,
        turn: this.turn, stage: this.stage, order: this.order,
        carry: this.carry,
        terra: this.terra.map(t => [t.q, t.r, si(t.b)]),
        radius: this.radius, lowStreak: this.lowStreak, finds: this.finds,
        echoOwned: [...this.echoOwned].sort((a, b) => a - b), echoRun: this.echoesThisRun,
        widenReady: this.widenReady, turnsInStage: this.turnsInStage,
        insight: this.insight, insightFrac: this.insightFrac,
        evolutions: [...this.evolutions],
        over: this.over, won: this.won, awakened: this.awakened,
        stormI: this.stormI,
        stormQueue: this.stormQueue.map(s => [s.turn, s.u, s.radius, s.power]),
        blightI: this.blightI,
        blightQueue: this.blightQueue.map(b => [b.turn, b.u, b.wisp]),
        blight: [...this.blight.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, b]) => [k, b.kind === 'wisp' ? 1 : 0, b.hp, b.age]),
        firedOcc: Object.keys(this.firedOcc).sort(),
        artifacts: this.artifacts.map(a => ({ spec: a.spec, charges: a.charges == null ? null : a.charges })),
        pendingOffer: this.pendingOffer,
        pendingLegend: this.pendingLegend,
        legendsBought: this.legendsBought,
        legendDiscount: this.legendDiscount,
        species: [...this.species.values()].sort((a, b) => a.id - b.id),
        nextSpecies: this.nextSpecies,
        surplusRun: this.surplusRun,
        faunaRun: this.faunaRun, predRun: this.predRun, onenessRun: this.onenessRun, autocatRun: this.autocatRun,
        fauna: this.fauna,
        faunaSpecies: [...this.faunaSpecies.values()].sort((a, b) => a.id - b.id),
        nextFauna: this.nextFauna,
        stats: this.stats,
        series: this.series,
        cells,
      };
    }
    _patJSON(p) {
      let o;
      switch (p.t) {
        case 'moss': o = { t: p.t, age: p.age, spr: p.spr, stress: p.stress }; break;
        case 'frond': o = { t: p.t, age: p.age, depth: p.depth, maxed: !!p.maxed }; break;
        case 'ant': o = { t: p.t, age: p.age, pop: p.pop, food: p.food }; break;
        case 'myc': o = { t: p.t, age: p.age, links: [...p.links] }; break;
        case 'crys': o = { t: p.t, age: p.age }; break;
        case 'bloom': o = { t: p.t, age: p.age, lone: p.lone }; break;
        case 'heart': o = { t: p.t, age: p.age, born: p.born, links: [...(p.links || [])] }; break;
        case 'flora': o = { t: p.t, age: p.age, sp: p.sp, est: p.est, starve: p.starve || 0, fedOk: p.fedOk ? 1 : 0 }; break;
      }
      if (p.fresh) o.fresh = 1;
      return o;
    }
    static fromJSON(o) {
      const g = new Game(o.seed, { blank: true, ascension: o.asc, mode: o.mode });
      const SO = LP.CONTENT.SOIL_ORDER;
      g.rng.s = o.s >>> 0;
      g.terra = (o.terra || []).map(t => ({ q: t[0], r: t[1], b: SO[t[2]] || 'loam' }));
      g.turn = o.turn; g.stage = o.stage; g.order = o.order; g.carry = o.carry;
      g.radius = o.radius; g.lowStreak = o.lowStreak; g.finds = o.finds;
      g.echoOwned = new Set(o.echoOwned || []);
      g.echoesThisRun = o.echoRun;
      g.widenReady = !!o.widenReady;
      g.turnsInStage = o.turnsInStage || 0;
      g.insight = o.insight || 0;
      g.insightFrac = o.insightFrac || 0;
      g.evolutions = o.evolutions || [];
      g.over = o.over; g.won = o.won; g.awakened = o.awakened;
      g.stormI = o.stormI;
      g.stormQueue = o.stormQueue.map(s => ({ turn: s[0], u: s[1], radius: s[2], power: s[3] }));
      g.blightI = o.blightI || 0;
      g.blightQueue = (o.blightQueue || []).map(b => ({ turn: b[0], u: b[1], wisp: b[2] }));
      g.blight = new Map((o.blight || []).map(e => [e[0], { kind: e[1] ? 'wisp' : 'rot', hp: e[2], age: e[3] }]));
      g.firedOcc = {};
      for (const k of o.firedOcc) g.firedOcc[k] = true;
      g.artifacts = o.artifacts.map(a => {
        const inst = LP.CONTENT.buildArtifact(a.spec);
        if (a.charges != null) inst.charges = a.charges;
        return inst;
      });
      g.pendingOffer = o.pendingOffer || null;
      g.pendingLegend = o.pendingLegend || null;
      g.legendsBought = o.legendsBought || 0;
      g.legendDiscount = o.legendDiscount || 0;
      g.species = new Map((o.species || []).map(s => [s.id, s]));
      g.nextSpecies = o.nextSpecies || 1;
      g.surplusRun = o.surplusRun || [0, 0, 0];
      g.faunaRun = o.faunaRun || 0; g.predRun = o.predRun || 0; g.onenessRun = o.onenessRun || 0; g.autocatRun = o.autocatRun || 0;
      g.fauna = o.fauna || [];
      g.faunaSpecies = new Map((o.faunaSpecies || []).map(s => [s.id, s]));
      g.nextFauna = o.nextFauna || 1;
      g.stats = o.stats;
      g.series = o.series || [];
      for (const cd of o.cells) {
        const c = g._mkCell(cd[0], cd[1], o.v >= 3 ? cd[2] : cd[2] / 1e4, SO[cd[4]] || 'loam');
        c.eMin = o.v >= 3 ? cd[3] : cd[3] / 1e4;
        if (cd.length > 5) {
          if (cd[5]) {
            c.pat = cd[5];
            if (c.pat.t === 'ant') c.pat.lastTargets = [];
          }
          c.trail = cd[6] || 0;
        }
        g.cells.set(HEX.key(c.q, c.r), c);
      }
      g._recompute();
      g._snapshot(); /* so a rewind right after loading has somewhere to return to */
      return g;
    }
  }
  LP.Game = Game;

  if (typeof module !== 'undefined' && module.exports) module.exports = LP;
})();
