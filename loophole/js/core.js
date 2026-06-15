/* LOOPHOLE — core engine.
   DOM-free: runs in browser and node alike. All gameplay randomness flows
   through one seeded stream so a run is reproducible from (seed, actions). */
(function () {
  'use strict';
  const LP = globalThis.LP || (globalThis.LP = {});
  LP.VERSION = '0.2.0';
  LP.SAVE_V = 2;

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

  /* ───────────────────────── game ───────────────────────── */
  class Game {
    /* opts: {ascension, echoCount, blank} */
    constructor(seed, opts) {
      opts = opts || {};
      this.seed = String(seed == null ? 'loophole' : seed);
      this.asc = opts.ascension || 0;
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
      return (this.mod('pressure', this.C.STAGES[this.stage - 1].pressure) + creep) * (1 + 0.12 * this.asc);
    }
    baseIncome() {
      return this.mod('baseIncome', this.C.STAGES[this.stage - 1].base);
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
        cc.pat.fresh = 1;
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

    _mkPat(t) {
      switch (t) {
        case 'moss': return { t, age: 0, spr: 0, stress: 0 };
        case 'frond': return { t, age: 0, depth: 1 };
        case 'ant': return { t, age: 0, pop: 6, food: 0, lastTargets: [] };
        case 'myc': return { t, age: 0, links: [] };
        case 'crys': return { t, age: 0 };
        case 'bloom': return { t, age: 0, lone: 0 };
        case 'heart': return { t, age: 0, born: this.turn, links: [] };
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
      return { ok: true, artifact: a };
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
      if (!this.coalesceReady()) return { ok: false };
      this.over = true; this.won = true; this.awakened = true;
      return { ok: true };
    }

    /* ── the turn pipeline ── */
    endTurn() {
      if (this.over) return [];
      if (this.pendingOffer) return [{ t: 'blocked', why: 'the garden is offering' }];
      const ev = [];
      this.emit('turnStart', null, ev);
      for (const c of this.cells.values()) if (c.pat && c.pat.fresh) delete c.pat.fresh;
      this._recompute();

      let income = this.baseIncome();
      income += this._stepAnts(ev);
      income += this._stepMyc(ev);
      income += this._stepBlooms(ev);
      income += this._stepMoss(ev);
      income += this._stepFronds(ev);
      income += this._stepHearts(ev);
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
      this._stageCheck(C, ev);
      this._lossCheck(C, ev);
      this._timedOccasions(ev);
      if (C >= 0.70) this._occasion('c70', ev);
      if (this.stage === 6 && this.coalesceReady()) ev.push({ t: 'coalesceReady' });

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
    }

    _patternCells(t) {
      const out = [];
      for (const c of this.cells.values()) if (c.pat && (!t || c.pat.t === t)) out.push(c);
      return out;
    }

    _stepAnts(ev) {
      let income = 0;
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
        income += eaten * 0.9 * this._synergy(c); /* crowded colonies pay less */
        const popMax = Math.round(this.mod('antPopMax', 24));
        if (p.food >= 1 && p.pop < popMax) { p.pop = Math.min(p.pop + 2, popMax); p.food -= 1; }
        if (eaten < p.pop * 0.012) p.pop -= 1;
        if (eaten > 0) ev.push({ t: 'eat', from: HEX.key(c.q, c.r), targets: p.lastTargets });
        /* foragers unearth strange things */
        if (eaten > 0.25 && this.finds < 2 &&
            this.rng.chance(0.035 * this.mod('antFindChance', 1))) {
          this.finds++;
          const spec = this.C.rollAntFind(this);
          const a = this.addArtifact(spec);
          ev.push({ t: 'find', name: a.name, k: HEX.key(c.q, c.r) });
          this._occasion('find1', ev);
        }
      }
      return income;
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
      return links * 0.2;
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
      return this._bloomGeneration(ev, false);
    }

    _mossSpread(c, ev) {
      const opts = [];
      for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
        const cc = this.cells.get(k);
        if (cc && !cc.pat && cc.e <= 0.6) opts.push(cc);
      }
      if (!opts.length) return false;
      opts.sort((a, b) => a.e - b.e);
      const tgt = opts[0];
      tgt.pat = this._mkPat('moss');
      ev.push({ t: 'spread', from: HEX.key(c.q, c.r), to: HEX.key(tgt.q, tgt.r) });
      this._occasion('spread1', ev);
      return true;
    }

    _stepMoss(ev) {
      let income = 0;
      const every = Math.max(2, Math.round(this.mod('mossSpreadEvery', 3)));
      for (const c of this._patternCells('moss')) {
        const p = c.pat;
        p.age++;
        c.e = U.clamp(c.e - 0.12 * this.mod('mossPower', 1) * this.soilMul(c, 'moss'), 0, 1);
        if (p.age >= 3) {
          /* moss feeds on the slope: it pays only beside disorder (or the rim).
             a fully ordered interior starves its own economy — second law as economy. */
          let gradient = false;
          for (const k of HEX.neighborsK(HEX.key(c.q, c.r))) {
            const cc = this.cells.get(k);
            if (!cc || cc.e >= 0.3) { gradient = true; }
            if (cc) cc.e = U.clamp(cc.e - 0.02, 0, 1);
          }
          if (gradient) income += 0.4 * this.mod('mossIncome', 1) * this.soilMul(c, 'moss') * this._synergy(c);
        }
        p.spr++;
        if (p.age >= 2 && p.spr >= every) {
          if (this._mossSpread(c, ev)) p.spr = 0;
        }
        if (c.e > 0.88) p.stress++; else p.stress = 0;
      }
      return income;
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
      let income = 0;
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
        if (p.depth > 0) income += 0.25 * (p.depth * (p.depth + 1) / 2) * this.mod('frondIncome', 1) * this.soilMul(c, 'frond') * syn;
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
      return income;
    }

    _stepHearts(ev) {
      let income = 0;
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
        if (net) income += net.cells.size / 5;
        if ((this.turn - p.born) % period === 0 && this.turn > p.born) {
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
          if (bloomTick) income += this._bloomGeneration(ev, true);
          ev.push({ t: 'pulse', center: HEX.key(c.q, c.r), cells: members });
          this._occasion('pulse1', ev);
        }
      }
      return income;
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
      this.grantInsight('blightcleared', 2);
      this.order += 2;
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
      this.pendingOffer = this.C.rollOffer(this);
      ev.push({ t: 'offer', specs: this.pendingOffer });
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
    echoCap() { return Math.round(this.mod('echoCap', 6)); }
    _nextEchoIdx() {
      for (let i = 0; i < 23; i++) if (!this.echoOwned.has(i)) return i; /* 23 belongs to the awakening */
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
      const band = n => n < 6 ? 0 : n < 12 ? 1 : n < 18 ? 2 : 3;
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
        'radius', 'stormI', 'blightI', 'blightQueue', 'blight', 'firedOcc', 'stats']) this[f] = g[f];
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
        .sort((a, b) => a.r - b.r || a.q - b.q)
        .map(c => {
          const o = [c.q, c.r, Math.round(c.e * 1e4), Math.round(c.eMin * 1e4), si(c.soil)];
          if (c.pat || c.trail) o.push(c.pat ? this._patJSON(c.pat) : 0, c.trail ? 1 : 0);
          return o;
        });
      return {
        v: 2, seed: this.seed, asc: this.asc, s: this.rng.s,
        turn: this.turn, stage: this.stage, order: this.order,
        carry: Math.round(this.carry * 1e6) / 1e6,
        terra: this.terra.map(t => [t.q, t.r, si(t.b)]),
        radius: this.radius, lowStreak: this.lowStreak, finds: this.finds,
        echoOwned: [...this.echoOwned].sort((a, b) => a - b), echoRun: this.echoesThisRun,
        widenReady: this.widenReady, turnsInStage: this.turnsInStage,
        insight: this.insight, insightFrac: Math.round(this.insightFrac * 1e4) / 1e4,
        evolutions: [...this.evolutions],
        over: this.over, won: this.won, awakened: this.awakened,
        stormI: this.stormI,
        stormQueue: this.stormQueue.map(s => [s.turn, Math.round(s.u * 1e6) / 1e6, s.radius, Math.round(s.power * 1e4) / 1e4]),
        blightI: this.blightI,
        blightQueue: this.blightQueue.map(b => [b.turn, Math.round(b.u * 1e6) / 1e6, Math.round(b.wisp * 1e6) / 1e6]),
        blight: [...this.blight.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, b]) => [k, b.kind === 'wisp' ? 1 : 0, b.hp, b.age]),
        firedOcc: Object.keys(this.firedOcc).sort(),
        artifacts: this.artifacts.map(a => ({ spec: a.spec, charges: a.charges == null ? null : a.charges })),
        pendingOffer: this.pendingOffer,
        stats: this.stats,
        cells,
      };
    }
    _patJSON(p) {
      let o;
      switch (p.t) {
        case 'moss': o = { t: p.t, age: p.age, spr: p.spr, stress: p.stress }; break;
        case 'frond': o = { t: p.t, age: p.age, depth: p.depth, maxed: !!p.maxed }; break;
        case 'ant': o = { t: p.t, age: p.age, pop: p.pop, food: Math.round(p.food * 1e4) / 1e4 }; break;
        case 'myc': o = { t: p.t, age: p.age, links: [...p.links] }; break;
        case 'crys': o = { t: p.t, age: p.age }; break;
        case 'bloom': o = { t: p.t, age: p.age, lone: p.lone }; break;
        case 'heart': o = { t: p.t, age: p.age, born: p.born, links: [...(p.links || [])] }; break;
      }
      if (p.fresh) o.fresh = 1;
      return o;
    }
    static fromJSON(o) {
      const g = new Game(o.seed, { blank: true, ascension: o.asc });
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
      g.stats = o.stats;
      for (const cd of o.cells) {
        const c = g._mkCell(cd[0], cd[1], cd[2] / 1e4, SO[cd[4]] || 'loam');
        c.eMin = cd[3] / 1e4;
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
